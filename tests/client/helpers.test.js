import { describe, it, expect, vi, afterEach } from "vitest";
import {
  api,
  validImage,
  numeric,
  locate,
  directionsUrl,
  money,
} from "../../src/utils/client";
import {
  planInventory,
  CHECKLIST,
  household,
  estimateDuration,
  describeDays,
  budgetPlan,
  storesFor,
  kindOf,
  numericBudget,
} from "../../src/utils/planning";
import { recyclingTotal, MATERIALS } from "../../src/utils/recycling";
import { findPrograms, PROGRAMS } from "../../src/utils/programs";
import { API_ENDPOINTS, API_BASE_URL } from "../../src/config";
afterEach(() => vi.unstubAllGlobals());
describe("browser request and input helpers", () => {
  it("uses same-origin endpoints and no cached responses or cookies", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetch);
    await api(API_ENDPOINTS.placesSearch, {
      body: { lat: 0, lng: 0, query: "food" },
    });
    expect(API_BASE_URL).toBe("");
    expect(
      Object.values(API_ENDPOINTS).every((url) => url.startsWith("/api/")),
    ).toBe(true);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ lat: 0 });
  });
  it("preserves multipart uploads and supports GET", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetch);
    const body = new FormData();
    await api("/api/analyze", { body });
    expect(fetch.mock.calls[0][1].body).toBe(body);
    expect(fetch.mock.calls[0][1].headers).toBeUndefined();
    await api("/api/health");
    expect(fetch.mock.calls[1][1].method).toBe("GET");
  });
  it.each([
    { ok: false, json: async () => ({ error: "Unavailable" }) },
    { ok: false, json: async () => ({}) },
    {
      ok: true,
      json: async () => {
        throw new Error("not JSON");
      },
    },
  ])("surfaces request errors", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(api("/api/x")).rejects.toThrow();
  });
  it("times out and supports cancellation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url, { signal }) =>
          new Promise((resolve, reject) => {
            if (signal.aborted) reject(new Error("abort"));
            else
              signal.addEventListener("abort", () =>
                reject(new Error("abort")),
              );
          }),
      ),
    );
    await expect(api("/api/x", { timeout: 5 })).rejects.toThrow("timed out");
    const controller = new AbortController();
    controller.abort();
    await expect(api("/api/x", { signal: controller.signal })).rejects.toThrow(
      "cancelled",
    );
  });
  it.each([
    undefined,
    new File([], "a.png", { type: "image/png" }),
    new File(["x"], "a.gif", { type: "image/gif" }),
    { type: "image/png", size: 5242881 },
  ])("rejects invalid image %j", (file) =>
    expect(() => validImage(file)).toThrow(),
  );
  it("accepts valid input and formats money", () => {
    const file = new File(["pixels"], "photo.png", { type: "image/png" });
    expect(validImage(file)).toBe(file);
    expect(numeric("0", "Value")).toBe(0);
    expect(money(1.5)).toBe("$1.50");
    expect(() => numeric("1.5", "Count", { integer: true })).toThrow();
  });
  it.each(["", " ", undefined, null, true, {}, [], NaN, Infinity, -1, "12x"])(
    "rejects numeric coercion edge %j",
    (value) => expect(() => numeric(value, "Value")).toThrow(),
  );
  it("locates only on request and reports denied or missing browser support", async () => {
    const getCurrentPosition = vi.fn((success) =>
      success({ coords: { latitude: 0, longitude: 0 } }),
    );
    await expect(locate({ getCurrentPosition })).resolves.toEqual({
      lat: 0,
      lng: 0,
    });
    await expect(locate(null)).rejects.toThrow("unavailable");
    await expect(
      locate({ getCurrentPosition: (ok, fail) => fail() }),
    ).rejects.toThrow("could not");
    expect(getCurrentPosition.mock.calls[0][2].maximumAge).toBe(0);
  });
  it("encodes directions destinations safely without including origin", () => {
    const url = new URL(
      directionsUrl({ id: "x&evil=1", location: { lat: 0, lng: 0 } }),
    );
    expect(url.searchParams.get("destination_place_id")).toBe("x&evil=1");
    expect(url.searchParams.has("origin")).toBe(false);
  });
});
describe("manual and benefit tools", () => {
  it("reads typed items and sorts them into kinds of supply", () => {
    const result = planInventory("Water, 2\nSoap, 1");
    expect(result.items).toEqual([
      { name: "Water", quantity: 2, category: "water", meals: 0, liters: 0 },
      { name: "Soap", quantity: 1, category: "hygiene", meals: 0, liters: 0 },
    ]);
    expect(CHECKLIST).toContain("Drinking water");
    expect(kindOf("Wool socks")).toBe("clothing");
    expect(kindOf("Sleeping bag")).toBe("shelter");
    expect(kindOf("Canned beans")).toBe("food");
    expect(kindOf("Phone charger")).toBe("misc");
  });
  it.each([
    "",
    "   ",
    "Water",
    "Water, 0",
    "Water, 1.5",
    "Water, 2, -1",
    "Water, 1, extra",
    "Rice, 1, 2, 3",
    "a".repeat(10001),
    Array(101).fill("Water, 1").join("\n"),
  ])("rejects invalid manual inventory", (lines) =>
    expect(() => planInventory(lines)).toThrow(),
  );
  it("turns a third number into meals, or liters for water", () => {
    const { items } = planInventory(
      "Rice bag, 2, 10\nWater jug, 3, 4\nSoap, 1",
    );
    expect(items[0]).toMatchObject({ meals: 20, liters: 0, category: "food" });
    expect(items[1]).toMatchObject({ meals: 0, liters: 12, category: "water" });
    expect(items[2]).toMatchObject({ meals: 0, liters: 0 });
  });
  it("spends a small budget on a day of water and food before anything else", () => {
    const one = household(1, 0);
    // Nothing on hand, $15: a gallon, 3 meals, socks, then more water.
    const plan = budgetPlan({ items: [], people: one, budget: 15 });
    expect(plan.lines.map((l) => [l.key, l.quantity])).toEqual([
      ["water", 3],
      ["food", 3],
      ["socks", 1],
    ]);
    // $1.50 cannot buy another meal, so it is kept rather than wasted.
    expect(plan.spent).toBe(13.5);
    expect(plan.left).toBe(1.5);
    expect(plan.uncovered).toEqual(["more food", "hygiene basics"]);
    expect(storesFor(plan)).toEqual([
      "food pantry",
      "grocery store",
      "dollar store",
    ]);
  });
  it("counts what is already there and keeps the rest", () => {
    const items = [
      { category: "water", liters: 3 * 3.8 },
      { category: "food", meals: 9 },
      { category: "clothing" },
      { category: "hygiene" },
    ];
    const plan = budgetPlan({ items, people: household(1, 0), budget: 20 });
    expect(plan.lines).toEqual([]);
    expect(plan.left).toBe(20);
    expect(plan.uncovered).toEqual([]);
  });
  it("adds weather gear and extra water when the forecast calls for it", () => {
    const people = household(1, 1);
    const plan = budgetPlan({
      items: [{ category: "clothing" }, { category: "hygiene" }],
      people,
      budget: 200,
      weather: { low: 45, high: 90, rainChance: 60 },
    });
    const keys = plan.lines.map((l) => l.key);
    expect(keys).toEqual(["water", "food", "warm", "rain"]);
    // Hot: 2 people x 1.5 gallons x 3 days.
    expect(plan.lines[0].quantity).toBe(9);
    expect(plan.weather).toEqual({ hot: true, cold: true, wet: true });
    // A blanket or sleeping bag already on hand stands in for a warm layer.
    const covered = budgetPlan({
      items: [{ category: "shelter" }, { category: "clothing" }],
      people,
      budget: 200,
      weather: { low: 45, high: 60, rainChance: 0 },
    });
    expect(covered.lines.map((l) => l.key)).not.toContain("warm");
    expect(() => numericBudget("-1")).toThrow("Money you can spend");
  });
  it("estimates days of food and water for a household", () => {
    const items = [{ meals: 21 }, { liters: 7.6 }, {}];
    // One adult: 21 meals / 3 a day = 7 days; 7.6 L / 3.8 L a day = 2 days.
    expect(estimateDuration(items, household("1", "0"))).toMatchObject({
      meals: 21,
      liters: 7.6,
      foodDays: 7,
      waterDays: 2,
    });
    // A child eats about two-thirds of an adult meal but drinks the same.
    const family = estimateDuration(items, household(2, 2));
    expect(family.foodDays).toBeCloseTo(21 / (3.4 * 3));
    expect(family.waterDays).toBeCloseTo(0.5);
    expect(() => household(0, 0)).toThrow("at least one person");
    expect(() => household(1.5, 0)).toThrow("Adults");
    expect(() => household(1, 30)).toThrow("Children");
    expect(describeDays(0, "None")).toBe("None");
    expect(describeDays(0.4, "None")).toBe("Less than a day");
    expect(describeDays(1.9, "None")).toBe("About 1 day");
    expect(describeDays(7, "None")).toBe("About 7 days");
  });
  it("matches selected program topics without income-based entitlement claims", () => {
    expect(findPrograms({})).toEqual([]);
    expect(findPrograms({ veteran: true, food: true })).toHaveLength(2);
    expect(findPrograms({ food: "yes" })).toEqual([]);
    expect(PROGRAMS).toHaveLength(9);
    for (const p of PROGRAMS) expect(new URL(p.url).protocol).toBe("https:");
  });
  it("uses only entered rates, accepts weight and handles zero quantities", () => {
    expect(
      recyclingTotal(
        { aluminum: 10, cardboard: 2.5, steel: 0 },
        { aluminum: 0.05, cardboard: 0.1 },
      ),
    ).toMatchObject({ total: 0.75 });
    expect(Object.keys(MATERIALS)).toHaveLength(7);
    expect(recyclingTotal({ aluminum: 1 }, { aluminum: 0 }).total).toBe(0);
  });
  it.each([
    [{}, {}],
    [{ aluminum: 1 }, {}],
    [{ glass: 1.5 }, { glass: 1 }],
    [{ paper: -1 }, { paper: 2 }],
  ])("rejects missing rates and invalid quantities", (counts, rates) =>
    expect(() => recyclingTotal(counts, rates)).toThrow(),
  );
});
describe("the owner's manual release check", () => {
  it("gives the budget plan the manual tells testers to expect", () => {
    const { items } = planInventory("Water jug, 2, 1.5\nSoap, 1");
    const plan = budgetPlan({ items, people: household(1, 0), budget: 15 });
    expect(plan.lines.map((l) => [l.label, l.quantity, l.total])).toEqual([
      ["Water", 3, 4.5],
      ["Food", 3, 6],
      ["Clothes", 1, 3],
    ]);
    expect(plan.left).toBe(1.5);
    expect(plan.uncovered).toEqual(["more food"]);
  });
});
