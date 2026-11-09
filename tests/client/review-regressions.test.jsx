import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import ImageAnalysis from "../../src/screens/ImageAnalysis";
import EligibilityForm from "../../src/screens/EligibilityForm";
import LocationSearch from "../../src/components/LocationSearch";
import { api } from "../../src/utils/client";

const place = {
  id: "fixture",
  name: "Fixture center",
  address: "Fictional address",
  location: { lat: 1, lng: 2 },
  distanceKm: 1,
  openNow: null,
};
const response = (data) => ({ ok: true, json: async () => data });
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response({ places: [place] })),
  ),
);
afterEach(() => vi.unstubAllGlobals());
function fillLocation() {
  fireEvent.change(screen.getByLabelText("Latitude"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Longitude"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByText("Search nearby"));
}

describe("September readiness review regressions", () => {
  it("does not display an old manual plan after input edits or invalid recalculation", () => {
    render(<ImageAnalysis />);
    const submit = () =>
      fireEvent.submit(screen.getByRole("form", { name: "Manual inventory" }));
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "Water, 2, 1.5" },
    });
    submit();
    expect(screen.getByRole("region", { name: "Inventory" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "Invalid row" },
    });
    expect(screen.queryByRole("region", { name: "Inventory" })).toBeNull();
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("one line per item");
    expect(screen.queryByRole("region", { name: "Inventory" })).toBeNull();
  });
  it("removes benefit matches when the selected topics change", () => {
    render(<EligibilityForm />);
    fireEvent.click(screen.getByLabelText("Food"));
    fireEvent.click(screen.getByText("Find programs"));
    expect(
      screen.getByRole("link", { name: "SNAP food assistance" }),
    ).toBeVisible();
    fireEvent.click(screen.getByLabelText("Food"));
    expect(
      screen.queryByRole("region", { name: "Matching programs" }),
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("clears map markers immediately on a new search even if the request fails", async () => {
    const onPlaces = vi.fn();
    render(
      <LocationSearch capabilities={{ places: true }} onPlaces={onPlaces} />,
    );
    fillLocation();
    await screen.findByText(place.name);
    expect(onPlaces).toHaveBeenLastCalledWith([place], { lat: 0, lng: 0 });
    fetch.mockRejectedValueOnce(new Error("Search unavailable"));
    fireEvent.click(screen.getByText("Search nearby"));
    expect(onPlaces).toHaveBeenLastCalledWith([], null);
    expect(screen.queryByText(place.name)).toBeNull();
    await screen.findByText("Search unavailable");
  });
  it("clearing aborts a pending route and ignores its late result", async () => {
    const onPlaces = vi.fn();
    render(
      <LocationSearch
        capabilities={{ places: true, directions: true }}
        onPlaces={onPlaces}
      />,
    );
    fillLocation();
    await screen.findByText(place.name);
    let finish;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.click(screen.getByText(`Walking time to ${place.name}`));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const request = fetch.mock.calls[1][1];
    expect(JSON.parse(request.body).origin).toEqual({ lat: 0, lng: 0 });
    fireEvent.click(screen.getByText("Clear location and results"));
    expect(request.signal.aborted).toBe(true);
    expect(onPlaces).toHaveBeenLastCalledWith([], null);
    expect(screen.queryByText(`Walking time to ${place.name}`)).toBeNull();
    await act(async () =>
      finish(
        response({ routes: [{ distanceMeters: 1000, durationSeconds: 600 }] }),
      ),
    );
    expect(screen.queryByText(/minutes walking/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    "Latitude",
    "Longitude",
    "Service or store",
    "Search radius in miles",
  ])("invalidates old search results after editing %s", async (label) => {
    const onPlaces = vi.fn();
    render(
      <LocationSearch
        capabilities={{ places: true, directions: true }}
        onPlaces={onPlaces}
      />,
    );
    fillLocation();
    await screen.findByText(place.name);
    fireEvent.change(screen.getByLabelText(label), {
      target: { value: label === "Service or store" ? "shelter" : "200" },
    });
    expect(screen.queryByText(place.name)).toBeNull();
    expect(onPlaces).toHaveBeenLastCalledWith([], null);
  });
  it("clears location and custom search before another review", async () => {
    render(<LocationSearch capabilities={{ places: true }} />);
    fillLocation();
    await screen.findByText(place.name);
    fireEvent.change(screen.getByLabelText("Service or store"), {
      target: { value: "private search" },
    });
    fireEvent.click(screen.getByText("Clear location and results"));
    expect(screen.getByLabelText("Latitude")).toHaveValue(null);
    expect(screen.getByLabelText("Longitude")).toHaveValue(null);
    expect(screen.getByLabelText("Service or store")).toHaveValue("food bank");
    expect(screen.getByLabelText("Search radius in miles")).toHaveValue(6);
  });
  it("handles a null API error body without exposing a JavaScript exception", async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: async () => null });
    await expect(api("/api/example")).rejects.toThrow(
      "The request failed. Please try again.",
    );
  });
});
