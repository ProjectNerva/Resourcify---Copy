export const API_BASE_URL = "";
export const API_ENDPOINTS = Object.freeze({
  analyze: "/api/analyze",
  recyclables: "/api/analyze-recyclables",
  mapsConfig: "/api/maps-config",
  recyclingCenters: "/api/recycling-centers",
  placesSearch: "/api/places/search",
  health: "/api/health",
  capabilities: "/api/capabilities",
  directions: "/api/directions",
  weather: "/api/weather",
  guide: "/api/guide",
});
export const NO_CAPABILITIES = Object.freeze({
  analysis: false,
  places: false,
  maps: false,
  directions: false,
  weather: false,
  guide: false,
});
