export async function api(
  url,
  { body, signal, timeout = 25000, ...options } = {},
) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, timeout);
  try {
    const form = body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      method: options.method || (body === undefined ? "GET" : "POST"),
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      headers:
        form || body === undefined
          ? options.headers
          : { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an unreadable response. Please try again.",
      );
    }
    if (controller.signal.aborted) throw new Error("Request aborted.");
    if (!response.ok)
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : "The request failed. Please try again.",
      );
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        signal?.aborted
          ? "Request cancelled."
          : "The request timed out. Please try again.",
      );
    // fetch rejects with a bare TypeError ("Failed to fetch") when the phone
    // loses signal or the server is restarting.
    if (error instanceof TypeError)
      throw new Error(
        "Could not reach Resourcify. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
export function validImage(file) {
  if (!file) throw new Error("Choose an image first.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Use a JPEG, PNG or WebP image.");
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error("The image must be nonempty and no larger than 5 MB.");
  return file;
}
export function numeric(
  value,
  label,
  { min = 0, max = 100000, integer = false } = {},
) {
  const n = Number(value);
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim()) ||
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw new Error(
      `${label} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`,
    );
  return n;
}
export function locate(geo = navigator.geolocation) {
  return new Promise((resolve, reject) => {
    if (!geo)
      return reject(
        new Error(
          "Location is unavailable in this browser. Enter coordinates instead.",
        ),
      );
    geo.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () =>
        reject(
          new Error(
            "Location could not be obtained. Enter coordinates or allow location access.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  });
}
export function directionsUrl(place, mode = "walking") {
  const { lat, lng } = place.location;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&destination_place_id=${encodeURIComponent(place.id)}&travelmode=${mode}`;
}
export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
