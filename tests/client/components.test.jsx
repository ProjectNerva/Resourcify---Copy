import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadForm from "../../src/components/UploadForm";
import ItemList from "../../src/components/ItemList";
import BudgetPlan from "../../src/components/BudgetPlan";
import ImageAnalysis from "../../src/screens/ImageAnalysis";
import EligibilityForm from "../../src/screens/EligibilityForm";
import CashForCans from "../../src/screens/CashForCans";
import LocationSearch from "../../src/components/LocationSearch";
import App, { initialView } from "../../src/App";
const response = (data) => ({ ok: true, json: async () => data });
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        response({ analysis: false, places: false, maps: false }),
      ),
  );
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());
describe("photo workflow", () => {
  it("requires a file and consent, posts multipart input, clears uploaded preview", async () => {
    const complete = vi.fn();
    fetch.mockResolvedValue(response({ items: [] }));
    render(<UploadForm enabled onAnalysisComplete={complete} />);
    const user = userEvent.setup();
    expect(
      screen.getByRole("button", { name: "Analyze photo" }),
    ).toBeDisabled();
    await user.upload(
      screen.getByLabelText("Add a photo"),
      new File(["image"], "x.png", { type: "image/png" }),
    );
    expect(
      screen.getByAltText("Selected items for analysis"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Analyze photo" }));
    await waitFor(() => expect(complete).toHaveBeenCalledWith({ items: [] }));
    expect(fetch.mock.calls[0][1].body.get("image").name).toBe("x.png");
    await waitFor(() =>
      expect(
        screen.queryByAltText("Selected items for analysis"),
      ).not.toBeInTheDocument(),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it("allows remove/drop, reports wrong file type and provider failure", async () => {
    render(<UploadForm enabled onAnalysisComplete={() => {}} />);
    const drop = screen.getByText(/also drop/);
    fireEvent.dragOver(drop);
    fireEvent.drop(drop, {
      dataTransfer: {
        files: [new File(["x"], "x.txt", { type: "text/plain" })],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("JPEG");
    fireEvent.drop(drop, {
      dataTransfer: {
        files: [new File(["x"], "x.png", { type: "image/png" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.drop(drop, {
      dataTransfer: {
        files: [new File(["x"], "x.png", { type: "image/png" })],
      },
    });
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Provider unavailable" }),
    });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Provider unavailable",
      ),
    );
  });
  it("gives useful errors if a disabled form or one without a file is submitted", async () => {
    const { rerender } = render(<UploadForm onAnalysisComplete={() => {}} />);
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("not configured"),
    );
    rerender(<UploadForm enabled onAnalysisComplete={() => {}} />);
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Choose an image"),
    );
  });
  it("counts a recycling image using the correct endpoint", async () => {
    fetch.mockResolvedValue(response({ counts: { aluminum: 2 } }));
    const complete = vi.fn();
    render(<UploadForm recycling enabled onAnalysisComplete={complete} />);
    fireEvent.change(screen.getByLabelText("Add a photo"), {
      target: { files: [new File(["x"], "x.png", { type: "image/png" })] },
    });
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() => expect(complete).toHaveBeenCalled());
    expect(fetch.mock.calls[0][0]).toBe("/api/analyze-recyclables");
  });
});
describe("local tools and navigation", () => {
  it("builds, displays and clears a manual plan", () => {
    render(<ImageAnalysis />);
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "Water, 2, 1.5" },
    });
    fireEvent.change(screen.getByLabelText("Money you can spend, in USD"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build plan" }));
    expect(screen.getByRole("region", { name: "Inventory" })).toHaveTextContent(
      "Water",
    );
    expect(
      screen.getByRole("region", { name: "Budget plan" }),
    ).toHaveTextContent("Food: $6.00");
    fireEvent.click(screen.getByText("Clear result"));
    expect(screen.queryByRole("region", { name: "Inventory" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "bad" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Manual inventory" }));
    expect(screen.getByRole("alert")).toHaveTextContent("one line");
  });
  it("shows real program matches and clears answers without a network request", () => {
    render(<EligibilityForm />);
    fireEvent.click(screen.getByLabelText("Food"));
    fireEvent.click(screen.getByRole("button", { name: "Find programs" }));
    expect(
      screen.getByRole("link", { name: "SNAP food assistance" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Clear answers"));
    expect(screen.getByLabelText("Food")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Find programs" }));
    expect(screen.getByText(/Select a topic/)).toBeInTheDocument();
  });
  it("calculates recycling from confirmed rates and clears the result when inputs change", () => {
    render(<CashForCans />);
    fireEvent.change(screen.getByLabelText("Aluminum cans quantity"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Aluminum cans rate in USD"), {
      target: { value: ".05" },
    });
    fireEvent.click(screen.getByText("Calculate value"));
    expect(
      screen.getByRole("region", { name: "Recycling estimate" }),
    ).toHaveTextContent("$0.50");
    fireEvent.change(screen.getByLabelText("Aluminum cans quantity"), {
      target: { value: "20" },
    });
    expect(
      screen.queryByRole("region", { name: "Recycling estimate" }),
    ).toBeNull();
    fireEvent.click(screen.getByText("Clear calculator"));
    fireEvent.submit(
      screen.getByRole("form", { name: "Recycling calculator" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("at least one");
  });
  it("starts with aluminum and lets people add or remove other materials", () => {
    render(<CashForCans />);
    expect(screen.getByLabelText("Aluminum cans quantity")).toBeInTheDocument();
    expect(screen.queryByLabelText("Glass bottles quantity")).toBeNull();
    fireEvent.change(screen.getByLabelText("Add a material"), {
      target: { value: "glass" },
    });
    fireEvent.change(screen.getByLabelText("Glass bottles quantity"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Glass bottles rate in USD"), {
      target: { value: "0.1" },
    });
    fireEvent.click(screen.getByText("Calculate value"));
    expect(
      screen.getByRole("region", { name: "Recycling estimate" }),
    ).toHaveTextContent("$0.40");
    // Removing a material also forgets what was typed for it.
    fireEvent.click(screen.getByText("Remove glass bottles"));
    expect(screen.queryByLabelText("Glass bottles quantity")).toBeNull();
    fireEvent.click(screen.getByText("Calculate value"));
    expect(screen.getByRole("alert")).toHaveTextContent("at least one");
    // Once every material is on screen the picker goes away.
    for (const key of [
      "plastic",
      "glass",
      "steel",
      "cardboard",
      "paper",
      "copper",
    ])
      fireEvent.change(screen.getByLabelText("Add a material"), {
        target: { value: key },
      });
    expect(screen.queryByLabelText("Add a material")).toBeNull();
    fireEvent.click(screen.getByText("Clear calculator"));
    expect(screen.queryByLabelText("Copper (lb) quantity")).toBeNull();
    expect(screen.getByLabelText("Aluminum cans quantity")).toBeInTheDocument();
  });
  it("renders empty items and a zero budget without spending anything", () => {
    const { rerender } = render(<ItemList />);
    expect(screen.getByText(/No items/)).toBeInTheDocument();
    rerender(
      <BudgetPlan
        budget={0}
        weather={null}
        plan={{
          lines: [],
          spent: 0,
          left: 0,
          uncovered: ["<script>bad</script>"],
          weather: {},
        }}
      />,
    );
    expect(screen.getByText(/start with free help/)).toBeInTheDocument();
    expect(screen.getByText(/<script>bad<\/script>/)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    rerender(
      <BudgetPlan
        budget={50}
        weather={null}
        plan={{
          lines: [],
          spent: 0,
          left: 50,
          uncovered: [],
          weather: {},
        }}
      />,
    );
    expect(screen.getByText(/already have the basics/)).toBeInTheDocument();
  });
  it("supports shortcuts, navigates all screens, and clears in-tab state", async () => {
    expect(initialView("?action=budget")).toBe("analysis");
    expect(initialView("?action=analyze")).toBe("analysis");
    expect(initialView("?action=unknown")).toBe("home");
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("unavailable"),
    );
    const nav = screen.getByRole("navigation");
    for (const [label, heading] of [
      ["Rationer", "Rationer"],
      ["Benefits", "Benefits finder"],
      ["Cash for Cans", "Cash for Cans"],
      ["Community Map", "Community Map"],
    ]) {
      fireEvent.click(within(nav).getByText(label));
      expect(
        screen.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
    }
    fireEvent.click(within(nav).getByText("Benefits"));
    fireEvent.click(screen.getByLabelText("Food"));
    fireEvent.click(screen.getByText("Clear this session"));
    fireEvent.click(within(nav).getByText("Benefits"));
    expect(screen.getByLabelText("Food")).not.toBeChecked();
    expect(localStorage.length).toBe(0);
  });
});
describe("nearby services", () => {
  it("searches zero coordinates, renders empty and actual results, and clears location", async () => {
    const onPlaces = vi.fn();
    fetch.mockResolvedValue(
      response({
        places: [
          {
            id: "1",
            name: "Clinic",
            address: "Main",
            distanceKm: 1,
            openNow: null,
            phone: "123",
            location: { lat: 0, lng: 0 },
          },
        ],
      }),
    );
    render(
      <LocationSearch capabilities={{ places: true }} onPlaces={onPlaces} />,
    );
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByText("Search nearby"));
    await screen.findByText("Clinic");
    expect(fetch.mock.calls[0][0]).toBe("/api/places/search");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      lat: 0,
      lng: 0,
    });
    expect(screen.getByText(/Hours unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear location and results"));
    expect(screen.getByLabelText("Latitude")).toHaveValue(null);
    expect(onPlaces).toHaveBeenLastCalledWith([], null);
  });
  it("reports validation and geolocation errors", async () => {
    render(<LocationSearch capabilities={{ places: true }} />);
    fireEvent.submit(screen.getByRole("form"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Latitude"),
    );
    fireEvent.click(screen.getByText("Use my location"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("unavailable"),
    );
  });
  it("uses recycling lookup and walking route estimates", async () => {
    const place = {
      id: "c",
      name: "Center",
      distanceKm: 1,
      openNow: false,
      location: { lat: 1, lng: 1 },
    };
    fetch
      .mockResolvedValueOnce(response({ centers: [place] }))
      .mockResolvedValueOnce(
        response({ routes: [{ distanceMeters: 1000, durationSeconds: 601 }] }),
      );
    render(
      <LocationSearch
        recycling
        capabilities={{ places: true, directions: true }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByText("Search nearby"));
    await screen.findByText("Center");
    fireEvent.click(screen.getByText("Walking time to Center"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("11 minutes"),
    );
    expect(fetch.mock.calls[1][0]).toBe("/api/directions");
  });
});
