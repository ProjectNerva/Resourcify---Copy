const { HttpError } = require("./validation");

// Current temperature plus today's low, high and rain chance from Open-Meteo.
// A missing rain chance is unknown (null), never zero.
function normalizeWeather(raw) {
  const now = raw?.current?.temperature_2m,
    daily = raw?.daily || {},
    high = daily.temperature_2m_max?.[0],
    low = daily.temperature_2m_min?.[0],
    rain = daily.precipitation_probability_max?.[0];
  const temp = (v) =>
    typeof v === "number" && Number.isFinite(v) && v > -80 && v < 150;
  if (!temp(now) || !temp(high) || !temp(low))
    throw new HttpError(
      502,
      "Weather data is unavailable.",
      "INVALID_PROVIDER_RESPONSE",
    );
  return {
    temperature: Math.round(now),
    high: Math.round(high),
    low: Math.round(low),
    rainChance:
      typeof rain === "number" && rain >= 0 && rain <= 100
        ? Math.round(rain)
        : null,
    unit: "°F",
    source: "Open-Meteo",
  };
}

module.exports = { normalizeWeather };
