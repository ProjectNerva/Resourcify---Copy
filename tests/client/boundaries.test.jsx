import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import App from "../../src/App";
import CashForCans from "../../src/screens/CashForCans";
import MapSection from "../../src/screens/MapSection";
import UploadForm from "../../src/components/UploadForm";
import LocationSearch from "../../src/components/LocationSearch";
import InstallPrompt from "../../src/components/InstallPrompt";
const response = (data) => ({ ok: true, json: async () => data });
beforeEach(() =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}))),
);
afterEach(() => {
  vi.unstubAllGlobals();
  delete navigator.geolocation;
});
describe("remaining UI boundaries", () => {
  it("handles offline/malformed capabilities and home navigation without losing the app", async () => {
    fetch.mockRejectedValueOnce(new Error("offline"));
    const { unmount } = render(<App />);
    await screen.findByText(
      "Online services unavailable. Manual tools are ready.",
    );
    fireEvent.click(screen.getByRole("button", { name: /Rationer Identify/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Resourcify", exact: true }),
    );
    fireEvent.click(within(screen.getByRole("navigation")).getByText("Home"));
    expect(
      screen.getByRole("heading", { name: "Make a plan with what you have." }),
    ).toBeVisible();
    unmount();
    fetch.mockResolvedValue(response(null));
    render(<App />);
    await screen.findByText(
      "Some online services are unavailable. Manual tools are ready.",
    );
  });
  it("cancels photo work without publishing a late result", async () => {
    fetch.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("abort"))),
        ),
    );
    const complete = vi.fn();
    render(<UploadForm enabled onAnalysisComplete={complete} />);
    fireEvent.change(screen.getByLabelText("Add a photo"), {
      target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
    });
    fireEvent.submit(screen.getByRole("form"));
    await screen.findByText("Cancel");
    fireEvent.click(screen.getByText("Cancel"));
    await screen.findByText("Request cancelled.");
    expect(complete).not.toHaveBeenCalled();
  });
  it("feeds photo counts into the real recycling calculator", async () => {
    fetch.mockResolvedValue(
      response({ counts: { aluminum: 3, glass: 1, plastic: 0, steel: 0 } }),
    );
    render(<CashForCans capabilities={{ analysis: true }} />);
    const form = screen.getByRole("form", { name: "Count recycling photo" });
    fireEvent.change(within(form).getByLabelText("Add a photo"), {
      target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
    });
    fireEvent.submit(form);
    await waitFor(() =>
      expect(screen.getByLabelText("Aluminum cans quantity")).toHaveValue(3),
    );
    // A counted material shows up on its own; a zero count does not.
    expect(screen.getByLabelText("Glass bottles quantity")).toHaveValue(1);
    expect(screen.queryByLabelText("Plastic bottles quantity")).toBeNull();
  });
  it("uses geolocation only on click, handles empty results and ignores cleared in-flight responses", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success) =>
          success({ coords: { latitude: 1, longitude: 2 } }),
      },
    });
    fetch.mockResolvedValue(response({ places: [] }));
    const onPlaces = vi.fn();
    render(
      <LocationSearch capabilities={{ places: true }} onPlaces={onPlaces} />,
    );
    fireEvent.click(screen.getByText("Use my location"));
    await waitFor(() =>
      expect(screen.getByLabelText("Latitude")).toHaveValue(1),
    );
    fireEvent.change(screen.getByLabelText("Service or store"), {
      target: { value: "clinic" },
    });
    fireEvent.change(screen.getByLabelText("Search radius in miles"), {
      target: { value: "1.5" },
    });
    fireEvent.submit(screen.getByRole("form"));
    await screen.findByText(
      "No places found. Try a different search or radius.",
    );
    let resolve;
    fetch.mockImplementation(() => new Promise((r) => (resolve = r)));
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    fireEvent.click(screen.getByText("Clear location and results"));
    await act(async () =>
      resolve(response({ places: [{ id: "late", name: "Late result" }] })),
    );
    expect(onPlaces).toHaveBeenLastCalledWith([], null);
    expect(screen.queryByText("Late result")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("updates map search state and reports open/closed places and route failures", async () => {
    fetch
      .mockResolvedValueOnce(
        response({
          places: [
            {
              id: "a",
              name: "Clinic",
              distanceKm: 0,
              openNow: true,
              location: { lat: 0, lng: 0 },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(response({ routes: [] }));
    render(<MapSection capabilities={{ places: true, directions: true }} />);
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByText("Search nearby"));
    await screen.findByText("Clinic");
    expect(screen.getByText(/Reported open now/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Walking time to Clinic"));
    await screen.findByText("No walking route was found.");
    fetch.mockRejectedValue(new Error("Route unavailable"));
    fireEvent.click(screen.getByText("Walking time to Clinic"));
    await screen.findByText("Route unavailable");
  });
  it("hides installation controls after the browser signals an install", () => {
    render(<InstallPrompt />);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    fireEvent(window, event);
    expect(screen.getByText("Install app")).toBeInTheDocument();
    fireEvent(window, new Event("appinstalled"));
    expect(screen.queryByText("Install app")).toBeNull();
  });
});
