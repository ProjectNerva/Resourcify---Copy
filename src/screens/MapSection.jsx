import { useEffect, useRef, useState } from "react";
import LocationSearch from "../components/LocationSearch";
import { loadMaps, drawMap } from "../utils/maps";
// Map plus nearby search. Standalone it is the Community Map screen; with
// `embedded` it drops its own heading so another screen (Cash for Cans) can
// host it, and `recycling` switches the search to recycling centers.
// `active` is true while the hosting screen is on screen; every screen stays
// mounted, so this is what keeps the home page from contacting Google.
export default function MapSection({
  capabilities = {},
  recycling = false,
  embedded = false,
  active = false,
}) {
  const [places, setPlaces] = useState([]),
    [center, setCenter] = useState(null),
    [maps, setMaps] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const container = useRef(null),
    alive = useRef(true),
    opening = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (maps && container.current)
      return drawMap(maps, container.current, places, center);
  }, [maps, places, center]);
  // The map loads as soon as its screen opens, centred on San Diego County,
  // and re-centres once a location is shared. It sits above the results so a
  // phone shows the map first instead of a long list.
  useEffect(() => {
    if (active) openMap();
  }, [active, capabilities.maps]);
  async function openMap() {
    if (maps || opening.current || !capabilities.maps) return;
    opening.current = true;
    setError("");
    setBusy(true);
    try {
      const loaded = await loadMaps();
      if (alive.current) setMaps(loaded);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      opening.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      {!embedded && (
        <>
          <h1>Community Map</h1>
          <p>
            Find local services and directions. Public reports and safe-location
            submissions are disabled in this pilot so Resourcify retains no
            participant data.
          </p>
        </>
      )}
      <section className="panel">
        <h2>{recycling ? "Recycling centers near you" : "Map"}</h2>
        {!capabilities.maps ? (
          <p>
            The interactive map is not configured. Search results include
            directions links when nearby search is available.
          </p>
        ) : (
          busy && <p role="status">Loading map…</p>
        )}
        {error && (
          <>
            <p role="alert">{error}</p>
            <button onClick={openMap}>Try loading the map again</button>
          </>
        )}
        {maps && (
          <div
            ref={container}
            className="map"
            aria-label="Google map of search results"
            role="region"
          />
        )}
      </section>
      <LocationSearch
        recycling={recycling}
        capabilities={capabilities}
        onLocation={(location) => {
          setCenter(location);
          openMap();
        }}
        onPlaces={(found, location) => {
          setPlaces(found);
          if (location) {
            setCenter(location);
            openMap();
          }
        }}
      />
    </>
  );
}
