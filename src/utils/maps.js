import { api } from "./client";
import { API_ENDPOINTS } from "../config";
let loading;
export function loadMaps(scope = window) {
  if (scope.google?.maps) return Promise.resolve(scope.google.maps);
  if (loading) return loading;
  loading = (async () => {
    const config = await api(API_ENDPOINTS.mapsConfig);
    return new Promise((resolve, reject) => {
      const script = scope.document.createElement("script");
      const cleanup = () => {
        clearTimeout(timer);
        delete scope.resourcifyMapsReady;
      };
      const fail = () => {
        cleanup();
        script.remove();
        reject(
          new Error(
            "Google Maps could not load. The service list and directions links remain available.",
          ),
        );
      };
      const timer = setTimeout(fail, 15000);
      scope.resourcifyMapsReady = () => {
        cleanup();
        if (scope.google?.maps) resolve(scope.google.maps);
        else fail();
      };
      script.onerror = fail;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.mapsApiKey)}&callback=resourcifyMapsReady&loading=async`;
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      scope.document.head.appendChild(script);
    });
  })().catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
// Until someone shares a location, show the county the pilot serves.
export const SAN_DIEGO = { lat: 32.7157, lng: -117.1611 };
export function drawMap(maps, container, places, center) {
  const map = new maps.Map(container, {
    center: center || SAN_DIEGO,
    zoom: center ? 12 : 10,
    mapTypeControl: false,
    streetViewControl: false,
  });
  const markers = places.map(
    (p) => new maps.Marker({ map, position: p.location, title: p.name }),
  );
  return () => {
    markers.forEach((marker) => marker.setMap(null));
    maps.event?.clearInstanceListeners(map);
  };
}
