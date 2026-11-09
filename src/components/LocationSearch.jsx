import { useEffect, useRef, useState } from "react";
import { api, locate, numeric, directionsUrl } from "../utils/client";
import { API_ENDPOINTS } from "../config";
import { useProcessingNotice } from "./ProcessingNotice";

// The API takes metres; the form asks for miles because that is what people
// here actually estimate distance in.
const MILES_TO_METRES = 1609.344;

export default function LocationSearch({
  recycling = false,
  capabilities = {},
  onPlaces,
  onLocation,
}) {
  const [lat, setLat] = useState(""),
    [lng, setLng] = useState(""),
    [query, setQuery] = useState("food bank"),
    [radius, setRadius] = useState("6"),
    [places, setPlaces] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [route, setRoute] = useState(null);
  const request = useRef(null),
    generation = useRef(0);
  const confirmNotice = useProcessingNotice("location");
  useEffect(
    () => () => {
      generation.current++;
      request.current?.abort();
    },
    [],
  );
  function invalidateResults() {
    generation.current++;
    request.current?.abort();
    setPlaces(null);
    setRoute(null);
    setError("");
    setBusy(false);
    onPlaces?.([], null);
  }
  async function useLocation() {
    invalidateResults();
    setBusy(true);
    const id = ++generation.current;
    try {
      const p = await locate();
      if (id === generation.current) {
        setLat(String(p.lat));
        setLng(String(p.lng));
        onLocation?.({ lat: p.lat, lng: p.lng });
      }
    } catch (e) {
      if (id === generation.current) setError(e.message);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  async function search(event) {
    event.preventDefault();
    invalidateResults();
    const id = ++generation.current;
    setError("");
    setPlaces(null);
    setRoute(null);
    try {
      if (!capabilities.places)
        throw new Error("Nearby search is not configured on this deployment.");
      const location = {
        lat: numeric(lat, "Latitude", { min: -90, max: 90 }),
        lng: numeric(lng, "Longitude", { min: -180, max: 180 }),
      };
      const body = {
        ...location,
        radius: Math.round(
          numeric(radius, "Search radius", { min: 0.1, max: 30 }) *
            MILES_TO_METRES,
        ),
        query,
      };
      if (!(await confirmNotice())) return;
      setBusy(true);
      request.current = new AbortController();
      const data = await api(
        recycling ? API_ENDPOINTS.recyclingCenters : API_ENDPOINTS.placesSearch,
        { body, signal: request.current.signal },
      );
      if (id !== generation.current) return;
      const found = recycling ? data.centers : data.places;
      if (!Array.isArray(found))
        throw new Error("The server returned invalid places.");
      setPlaces(found);
      onPlaces?.(found, location);
    } catch (e) {
      if (id === generation.current) setError(e.message);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  async function estimate(place) {
    request.current?.abort();
    const id = ++generation.current;
    setError("");
    setRoute(null);
    setBusy(true);
    request.current = new AbortController();
    try {
      if (!(await confirmNotice())) return;
      const origin = {
        lat: numeric(lat, "Latitude", { min: -90, max: 90 }),
        lng: numeric(lng, "Longitude", { min: -180, max: 180 }),
      };
      const data = await api(API_ENDPOINTS.directions, {
        body: {
          origin,
          destination: place.location,
          mode: "WALK",
        },
        signal: request.current.signal,
      });
      if (id !== generation.current) return;
      if (!Array.isArray(data?.routes))
        throw new Error("The server returned invalid routes.");
      const first = data.routes[0];
      setRoute({
        id: place.id,
        text: first
          ? `About ${(first.distanceMeters / MILES_TO_METRES).toFixed(1)} miles, ${Math.ceil(first.durationSeconds / 60)} minutes walking from your location.`
          : "No walking route was found.",
      });
    } catch (e) {
      if (id === generation.current) setError(e.message);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>{recycling ? "Find recycling centers" : "Find nearby services"}</h2>
      {!capabilities.places && (
        <p role="status">Nearby search is not configured on this deployment.</p>
      )}
      <form aria-label="Nearby search" onSubmit={search}>
        {!recycling && (
          <label>
            Service or store
            <input
              maxLength="120"
              value={query}
              onChange={(e) => {
                invalidateResults();
                setQuery(e.target.value);
              }}
              required
            />
          </label>
        )}
        <p>
          Search sends your location and search terms to Resourcify and Google
          Places; neither is saved by this app.
        </p>
        <button type="button" disabled={busy} onClick={useLocation}>
          Use my location
        </button>
        <details className="coords">
          <summary>Enter coordinates manually</summary>
          <p>Only needed if your browser cannot share your location.</p>
          <div className="field-row">
            <label>
              Latitude
              <input
                type="number"
                min="-90"
                max="90"
                step="any"
                value={lat}
                onChange={(e) => {
                  invalidateResults();
                  setLat(e.target.value);
                }}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                min="-180"
                max="180"
                step="any"
                value={lng}
                onChange={(e) => {
                  invalidateResults();
                  setLng(e.target.value);
                }}
              />
            </label>
          </div>
        </details>
        <label>
          Search radius in miles
          <input
            type="number"
            min="0.1"
            max="30"
            step="any"
            value={radius}
            onChange={(e) => {
              invalidateResults();
              setRadius(e.target.value);
            }}
          />
        </label>
        <button disabled={busy || !capabilities.places}>
          {busy ? "Working…" : "Search nearby"}
        </button>
        <button
          type="button"
          onClick={() => {
            invalidateResults();
            setLat("");
            setLng("");
            setQuery("food bank");
            setRadius("6");
          }}
        >
          Clear location and results
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {places && (
        <>
          <p>
            Results from Google Maps. Distances shown are straight-line
            estimates; results may lie outside the preferred radius. Confirm
            availability, hours and rates with providers.
          </p>
          {places.length ? (
            <ul className="places">
              {places.map((place) => (
                <li key={place.id}>
                  <h3>{place.name}</h3>
                  <p>{place.address}</p>
                  <p>
                    {(place.distanceKm / 1.609344).toFixed(1)} miles away ·{" "}
                    {place.openNow === null
                      ? "Hours unavailable"
                      : place.openNow
                        ? "Reported open now"
                        : "Reported closed now"}
                  </p>
                  {place.phone && <p>{place.phone}</p>}
                  <a
                    href={directionsUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open directions in Google Maps
                  </a>
                  {capabilities.directions && (
                    <button disabled={busy} onClick={() => estimate(place)}>
                      Walking time to {place.name}
                    </button>
                  )}
                  {route?.id === place.id && (
                    <p role="status" className="route">
                      {route.text}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No places found. Try a different search or radius.</p>
          )}
        </>
      )}
    </section>
  );
}
