class HttpError extends Error {
  constructor(status, message, code = "INVALID_INPUT") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function number(value, label, min, max, integer = false) {
  if (
    value === null ||
    typeof value === "boolean" ||
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  )
    throw new HttpError(400, `${label} must be a number.`);
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw new HttpError(
      400,
      `${label} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`,
    );
  return n;
}
function coordinates(value) {
  return {
    lat: number(value?.lat, "Latitude", -90, 90),
    lng: number(value?.lng, "Longitude", -180, 180),
  };
}
function validateImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length)
    throw new HttpError(400, "Choose an image first.");
  const b = file.buffer;
  const valid =
    file.mimetype === "image/png"
      ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.mimetype === "image/jpeg"
        ? b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.mimetype === "image/webp" &&
          b.toString("ascii", 0, 4) === "RIFF" &&
          b.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new HttpError(400, "Use a valid JPEG, PNG or WebP image.");
  if (b.length > 5 * 1024 * 1024)
    throw new HttpError(413, "Image exceeds 5 MB.");
}
const categories = [
  "food",
  "water",
  "clothing",
  "shelter",
  "hygiene",
  "tools",
  "safety",
  "misc",
];
const badProvider = () =>
  new HttpError(
    502,
    "The provider returned an invalid result. Please try again.",
    "INVALID_PROVIDER_RESPONSE",
  );
function text(value, max = 250) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw badProvider();
  return value.trim();
}
function providerNumber(value, min, max, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw badProvider();
  return value;
}
// Meals and liters are rough model estimates used only for the "how long it
// lasts" guide. Missing or unusable means not estimated, which counts as zero.
function amount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(Math.min(value, 10000) * 10) / 10
    : 0;
}
// The photo only lists what is visible; the budget plan is worked out in the
// browser from fixed prices, so it never depends on the model. One odd entry
// is dropped rather than failing the whole photo, but the overall shape must
// still be right.
function normalizeAnalysis(raw) {
  if (!raw || !Array.isArray(raw.items)) throw badProvider();
  const items = raw.items.slice(0, 100).flatMap((item) => {
    const name = typeof item?.name === "string" ? item.name.trim() : "",
      quantity = Math.round(item?.quantity);
    if (!name || name.length > 100 || !(quantity >= 1 && quantity <= 10000))
      return [];
    return [
      {
        name,
        category: categories.includes(item.category) ? item.category : "misc",
        quantity,
        meals: amount(item.meals),
        liters: amount(item.liters),
      },
    ];
  });
  return {
    items,
    summary:
      typeof raw.summary === "string" ? raw.summary.trim().slice(0, 1500) : "",
    notice:
      "AI counts are estimates from one photo. Check them against what you actually have.",
  };
}
function normalizeCounts(raw) {
  if (!raw?.counts || typeof raw.counts !== "object") throw badProvider();
  return Object.fromEntries(
    ["aluminum", "plastic", "glass", "steel"].map((key) => [
      key,
      providerNumber(raw.counts[key], 0, 10000, true),
    ]),
  );
}
function distance(a, b) {
  const rad = Math.PI / 180,
    dLat = (b.lat - a.lat) * rad,
    dLng = (b.lng - a.lng) * rad,
    x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return (
    6371 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, x)), Math.sqrt(Math.max(0, 1 - x)))
  );
}
function normalizePlaces(raw, origin) {
  if (!raw || (raw.places !== undefined && !Array.isArray(raw.places)))
    throw badProvider();
  return (raw.places || [])
    .slice(0, 20)
    .map((place) => {
      const location = {
        lat: providerNumber(place.location?.latitude, -90, 90),
        lng: providerNumber(place.location?.longitude, -180, 180),
      };
      return {
        id: text(place.id, 250),
        name: text(place.displayName?.text, 250),
        address:
          typeof place.formattedAddress === "string"
            ? place.formattedAddress
            : "",
        location,
        distanceKm: Math.round(distance(origin, location) * 100) / 100,
        openNow:
          typeof place.currentOpeningHours?.openNow === "boolean"
            ? place.currentOpeningHours.openNow
            : null,
        phone:
          typeof place.nationalPhoneNumber === "string"
            ? place.nationalPhoneNumber
            : "",
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}&query_place_id=${encodeURIComponent(place.id)}`,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
module.exports = {
  HttpError,
  badProvider,
  text,
  number,
  coordinates,
  validateImage,
  normalizeAnalysis,
  normalizeCounts,
  normalizePlaces,
  distance,
  categories,
};
