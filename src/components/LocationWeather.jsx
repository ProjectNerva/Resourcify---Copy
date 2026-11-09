import { useState } from "react";
import { api, locate, numeric } from "../utils/client";
import { API_ENDPOINTS } from "../config";
import { useProcessingNotice } from "./ProcessingNotice";

// Optional location for the Rationer: it brings in today's weather, which
// changes what the plan buys, and lets the plan show nearby stores. The
// notice comes first, then the browser's own location prompt.
export default function LocationWeather({
  capabilities,
  place,
  onPlace,
  weather,
  onWeather,
}) {
  const [lat, setLat] = useState(""),
    [lng, setLng] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const confirmNotice = useProcessingNotice("location");
  async function use(getPlace) {
    setError("");
    if (!(await confirmNotice())) return;
    setBusy(true);
    try {
      const found = await getPlace();
      onPlace(found);
      onWeather(null);
      if (capabilities.weather)
        onWeather(await api(API_ENDPOINTS.weather, { body: found }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!capabilities.weather && !capabilities.places) return null;
  return (
    <div className="location-weather">
      {place ? (
        <>
          <p role="status">
            Using your location.
            {weather &&
              ` Near you: ${weather.temperature}°F now, ${weather.low}–${weather.high}°F today${weather.rainChance === null ? "" : `, ${weather.rainChance}% chance of rain`}.`}
          </p>
          <button
            type="button"
            onClick={() => {
              onPlace(null);
              onWeather(null);
            }}
          >
            Forget my location
          </button>
        </>
      ) : (
        <>
          <p>
            Add your location to plan for today&apos;s weather and see nearby
            stores and food pantries. It is not saved.
          </p>
          <button type="button" disabled={busy} onClick={() => use(locate)}>
            {busy ? "Finding you…" : "Use my location"}
          </button>
          <details>
            <summary>Enter coordinates instead</summary>
            <div className="field-row">
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                use(async () => ({
                  lat: numeric(lat, "Latitude", { min: -90, max: 90 }),
                  lng: numeric(lng, "Longitude", { min: -180, max: 180 }),
                }))
              }
            >
              Use these coordinates
            </button>
          </details>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
