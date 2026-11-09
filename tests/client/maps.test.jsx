import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { loadMaps, drawMap, SAN_DIEGO } from "../../src/utils/maps";
import MapSection from "../../src/screens/MapSection";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete window.google;
  document
    .querySelectorAll('script[src*="maps.googleapis.com"]')
    .forEach((s) => s.remove());
});
describe("map loading and lifecycle", () => {
  it("uses an existing map library without fetching", async () => {
    const maps = { Map: vi.fn() };
    expect(await loadMaps({ google: { maps } })).toBe(maps);
  });
  it("draws markers with text titles and removes all map objects", () => {
    const setMap = vi.fn(),
      clearInstanceListeners = vi.fn();
    const maps = {
      Map: vi.fn(function () {}),
      Marker: vi.fn(function () {
        return { setMap };
      }),
      event: { clearInstanceListeners },
    };
    const cleanup = drawMap(
      maps,
      document.createElement("div"),
      [{ name: "<unsafe>", location: { lat: 1, lng: 2 } }],
      { lat: 0, lng: 0 },
    );
    expect(maps.Marker).toHaveBeenCalledWith(
      expect.objectContaining({ title: "<unsafe>" }),
    );
    cleanup();
    expect(setMap).toHaveBeenCalledWith(null);
    expect(clearInstanceListeners).toHaveBeenCalled();
    drawMap(maps, document.createElement("div"), [], null)();
  });
  it("loads when its screen opens, surfaces failure, and retries into a map of San Diego", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mapsApiKey: "browser-key" }),
      }),
    );
    const { rerender } = render(<MapSection capabilities={{ maps: true }} />);
    // Hidden screens contact nobody.
    expect(fetch).not.toHaveBeenCalled();
    rerender(<MapSection capabilities={{ maps: true }} active />);
    expect(screen.getByText("Loading map…")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        document.querySelector('script[src*="maps.googleapis.com"]'),
      ).not.toBeNull(),
    );
    document.querySelector('script[src*="maps.googleapis.com"]').onerror();
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "Try loading the map again" }),
    );
    await waitFor(() =>
      expect(window.resourcifyMapsReady).toBeTypeOf("function"),
    );
    const clearInstanceListeners = vi.fn();
    window.google = {
      maps: {
        Map: vi.fn(function () {}),
        Marker: vi.fn(function () {
          return { setMap: vi.fn() };
        }),
        event: { clearInstanceListeners },
      },
    };
    window.resourcifyMapsReady();
    await screen.findByRole("region", { name: "Google map of search results" });
    expect(window.google.maps.Map).toHaveBeenCalled();
    expect(window.google.maps.Map).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ center: SAN_DIEGO, zoom: 10 }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("map follows the person", () => {
  it("centers and loads the map as soon as location is shared", async () => {
    // Sharing location is the first location action, so it must both centre
    // the map and trigger loading it, without a separate button press.
    const getCurrentPosition = vi.fn((ok) =>
      ok({ coords: { latitude: 32.9, longitude: -117.2 } }),
    );
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mapsApiKey: "browser-key" }),
      }),
    );
    try {
      render(<MapSection capabilities={{ maps: true, places: true }} />);
      expect(fetch).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText("Use my location"));
      await waitFor(() =>
        expect(screen.getByLabelText("Latitude")).toHaveValue(32.9),
      );
      // loadMaps caches a successful load for the page lifetime, so depending
      // on test order this either reuses that library or appends the script.
      // Either way the map region must appear without any extra click.
      await waitFor(() => {
        const script = document.querySelector(
          'script[src*="maps.googleapis.com"]',
        );
        const region = screen.queryByRole("region", {
          name: "Google map of search results",
        });
        if (!script && !region) throw new Error("map did not start loading");
      });
      if (!window.google) {
        window.google = {
          maps: {
            Map: vi.fn(function () {}),
            Marker: vi.fn(function () {
              return { setMap: vi.fn() };
            }),
            event: { clearInstanceListeners: vi.fn() },
          },
        };
        window.resourcifyMapsReady?.();
      }
      await screen.findByRole("region", {
        name: "Google map of search results",
      });
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    } finally {
      delete navigator.geolocation;
    }
  });
});
