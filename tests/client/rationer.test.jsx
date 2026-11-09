import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import ImageAnalysis from "../../src/screens/ImageAnalysis";
import { ProcessingNoticeProvider } from "../../src/components/ProcessingNotice";

const json = (data, ok = true) => ({ ok, json: async () => data });
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  vi.unstubAllGlobals();
  delete navigator.geolocation;
});

function plan(lines) {
  fireEvent.change(screen.getByLabelText("Items"), {
    target: { value: lines },
  });
  fireEvent.click(screen.getByRole("button", { name: "Build plan" }));
  return screen.getByRole("region", { name: "How long this lasts" });
}

describe("how long supplies last", () => {
  it("estimates days for the household and updates when it changes", () => {
    render(<ImageAnalysis />);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const estimate = plan("Rice bag, 1, 21\nWater jug, 2, 3.8");
    expect(scroll).toHaveBeenCalled();
    expect(within(estimate).getByText("About 7 days")).toBeInTheDocument();
    expect(within(estimate).getByText("About 2 days")).toBeInTheDocument();
    expect(estimate).toHaveTextContent(
      "A rough guess for 1 adult, from about 21 meals and about 7.6 liters of water, against",
    );
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Children"), {
      target: { value: "1" },
    });
    expect(estimate).toHaveTextContent("2 adults and 1 child, from");
    expect(within(estimate).getByText("About 2 days")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Children"), {
      target: { value: "3" },
    });
    expect(estimate).toHaveTextContent("for 3 children, from");
    delete Element.prototype.scrollIntoView;
  });

  it("says when nothing counts as food or water", () => {
    render(<ImageAnalysis />);
    const estimate = plan("Soap, 1");
    expect(estimate).toHaveTextContent("Nothing here was counted");
  });

  it("shows only the kind of supply that was counted", () => {
    render(<ImageAnalysis />);
    const estimate = plan("Water jug, 1, 1");
    expect(within(estimate).getByText("No food counted")).toBeInTheDocument();
    expect(within(estimate).getByText("Less than a day")).toBeInTheDocument();
    expect(estimate).toHaveTextContent("from about 1 liter of water, against");
    expect(estimate).not.toHaveTextContent("meals and");
  });

  it("asks for at least one person and a real budget instead of guessing", () => {
    render(<ImageAnalysis />);
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "Rice bag, 1, 21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build plan" }));
    const about = screen.getByRole("region", { name: "About you" });
    expect(within(about).getByRole("alert")).toHaveTextContent(
      "at least one person",
    );
    expect(screen.queryByRole("region", { name: "Budget plan" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Adults"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Money you can spend, in USD"), {
      target: { value: "-5" },
    });
    expect(within(about).getByRole("alert")).toHaveTextContent(
      "Money you can spend",
    );
  });
});

describe("budget, weather and where to get it", () => {
  const capabilities = { analysis: false, weather: true, places: true };
  const forecast = {
    temperature: 58,
    high: 64,
    low: 48,
    rainChance: 70,
    unit: "°F",
  };
  const store = (id, name) => ({
    id,
    name,
    address: "Main St",
    distanceKm: 1.609344,
    openNow: id === "a",
    location: { lat: 32.7, lng: -117.1 },
  });

  it("uses the location for weather-aware buying and nearby stores", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 32.7, longitude: -117.1 } }),
      },
    });
    fetch.mockImplementation(async (url, { body }) => {
      if (url === "/api/weather") return json(forecast);
      const { query } = JSON.parse(body);
      if (query === "thrift store") return json({ error: "Busy" }, false);
      if (query === "dollar store") return json({ places: [] });
      return json({
        places: [store("a", `${query} one`), store("b", `${query} two`)],
      });
    });
    render(
      <ProcessingNoticeProvider>
        <ImageAnalysis capabilities={capabilities} />
      </ProcessingNoticeProvider>,
    );
    fireEvent.change(screen.getByLabelText("Money you can spend, in USD"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByText("Use my location"));
    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(
      await screen.findByText(/58°F now, 48–64°F today, 70% chance of rain/),
    ).toBeInTheDocument();
    plan("Socks, 1");
    const budget = screen.getByRole("region", { name: "Budget plan" });
    expect(budget).toHaveTextContent("Tonight's low is about 48°F");
    expect(budget).toHaveTextContent("Rain is likely today (70%)");
    expect(budget).toHaveTextContent("Clothes: $8.00");
    const where = screen.getByRole("region", { name: "Where to get it" });
    await waitFor(() => expect(where).toHaveTextContent("food pantry one"));
    expect(where).toHaveTextContent("1.0 miles · open now");
    expect(where).toHaveTextContent("Free food: food pantries");
    await waitFor(() =>
      expect(within(where).getByRole("alert")).toHaveTextContent("Busy"),
    );
    expect(where).toHaveTextContent("None found within 3 miles.");
    expect(
      within(where).getByRole("link", {
        name: "Directions to grocery store one",
      }),
    ).toHaveAttribute("href", expect.stringContaining("destination="));
    fireEvent.click(screen.getByText("Forget my location"));
    expect(
      screen.queryByRole("region", { name: "Where to get it" }),
    ).toBeNull();
    expect(
      screen.getByText(/Add your location above to see nearby stores/),
    ).toBeInTheDocument();
  });

  it("takes typed coordinates, reports bad ones, and respects Cancel", async () => {
    fetch.mockResolvedValue(json(forecast));
    render(
      <ProcessingNoticeProvider>
        <ImageAnalysis capabilities={{ weather: true }} />
      </ProcessingNoticeProvider>,
    );
    fireEvent.click(screen.getByText("Use these coordinates"));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Use these coordinates"));
    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Latitude");
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "32.7" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "-117.1" },
    });
    fireEvent.click(screen.getByText("Use these coordinates"));
    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByText(/58°F now/)).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      lat: 32.7,
      lng: -117.1,
    });
  });

  it("stays out of the way when neither weather nor places is set up", () => {
    render(<ImageAnalysis capabilities={{}} />);
    expect(screen.queryByText("Use my location")).toBeNull();
    plan("Soap, 1");
    expect(screen.getByRole("region", { name: "Budget plan" })).toBeVisible();
    expect(screen.queryByText(/Add your location above/)).toBeNull();
  });
});
