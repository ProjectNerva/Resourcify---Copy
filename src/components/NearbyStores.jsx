import { useEffect, useState } from "react";
import { api, directionsUrl } from "../utils/client";
import { API_ENDPOINTS } from "../config";

const TITLES = {
  "food pantry": "Free food: food pantries",
  "grocery store": "Grocery stores",
  "dollar store": "Dollar stores",
  "thrift store": "Thrift stores",
};
const WITHIN_METRES = 4828; // 3 miles

// Where to get what the plan lists: the two closest places of each kind,
// free food first. Runs only after the person shared a location and
// accepted the location notice.
export default function NearbyStores({ place, kinds }) {
  const [found, setFound] = useState({});
  const key = kinds.join("|");
  useEffect(() => {
    let live = true;
    setFound({});
    for (const kind of kinds)
      api(API_ENDPOINTS.placesSearch, {
        body: { ...place, query: kind, radius: WITHIN_METRES },
      }).then(
        (data) =>
          live &&
          setFound((old) => ({ ...old, [kind]: data.places.slice(0, 2) })),
        (error) => live && setFound((old) => ({ ...old, [kind]: error })),
      );
    return () => {
      live = false;
    };
  }, [place.lat, place.lng, key]);
  return (
    <section aria-label="Where to get it">
      <h2>Where to get it near you</h2>
      {kinds.map((kind) => {
        const result = found[kind];
        return (
          <div key={kind} className="store-kind">
            <h3>{TITLES[kind] || kind}</h3>
            {!result ? (
              <p>Looking…</p>
            ) : result instanceof Error ? (
              <p role="alert">{result.message}</p>
            ) : result.length ? (
              <ul>
                {result.map((store) => (
                  <li key={store.id}>
                    <strong>{store.name}</strong>
                    <span>
                      {(store.distanceKm / 1.609344).toFixed(1)} miles
                      {store.openNow === true
                        ? " · open now"
                        : store.openNow === false
                          ? " · closed now"
                          : ""}
                    </span>
                    <a
                      href={directionsUrl(store)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions to {store.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>None found within 3 miles.</p>
            )}
          </div>
        );
      })}
      <p className="settings-hint">
        Call ahead: hours and stock change. 211 can tell you which pantries are
        open today.
      </p>
    </section>
  );
}
