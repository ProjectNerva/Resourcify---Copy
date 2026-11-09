import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createApp, readConfig } = require("../../server");
const {
  normalizeAnalysis,
  normalizeCounts,
  normalizePlaces,
  coordinates,
  number,
  validateImage,
  distance,
} = require("../../server/validation");
const { createProviders } = require("../../server/providers");
const { normalizeGuide } = require("../../server/guide/answer");
const config = {
  ...readConfig({}),
  external: true,
  geminiKey: "SECRET_AI",
  geminiModel: "fixture-model",
  placesKey: "SECRET_PLACES",
  mapsKey: "BROWSER_KEY",
  routesKey: "SECRET_ROUTES",
  timeout: 30,
};
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const analysis = {
  items: [{ name: "Water", category: "water", quantity: 2 }],
  summary: "Two bottles appear visible.",
};
const place = {
  id: "p1",
  displayName: { text: "Food bank" },
  formattedAddress: "Main St",
  location: { latitude: 0, longitude: 0 },
  currentOpeningHours: { openNow: false },
};
const json = (data) => ({ ok: true, json: async () => data });
const gemini = (data) =>
  json({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(data) }] },
      },
    ],
  });
function setup(
  fetchImpl = vi.fn().mockResolvedValue(gemini(analysis)),
  custom = {},
) {
  return {
    app: createApp({ config, fetchImpl, rateLimitEnabled: false, ...custom }),
    fetchImpl,
  };
}
describe("API and configuration", () => {
  it("does not enable providers by default or expose secrets", async () => {
    const app = createApp({ config: readConfig({}), rateLimitEnabled: false });
    expect(readConfig({ TRUST_PROXY: "1" }).trustProxy).toBe(1);
    expect((await request(app).get("/api/capabilities")).body).toMatchObject({
      analysis: false,
      reports: false,
      retention: "none",
    });
    expect((await request(app).get("/api/health")).body.status).toBe("ok");
  });
  it("reports configured capabilities without secrets", async () => {
    const { app } = setup();
    const response = await request(app).get("/api/capabilities");
    expect(response.body).toMatchObject({
      analysis: true,
      places: true,
      maps: true,
      directions: true,
    });
    expect(response.text).not.toContain("SECRET");
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it.each(["/api/maps-config", "/api/maps-key"])(
    "exposes only the separate browser key at %s",
    async (endpoint) => {
      const { app } = setup();
      const result = await request(app).get(endpoint);
      expect(result.body).toEqual({ mapsApiKey: "BROWSER_KEY" });
      expect(result.text).not.toContain("SECRET");
    },
  );
  it("maps without a key is unavailable", async () => {
    const { app } = setup(undefined, { config: readConfig({}) });
    expect((await request(app).get("/api/maps-config")).status).toBe(503);
  });
  it.each([
    "/api/places-key",
    "/api/alerts/police",
    "/api/alerts",
    "/api/safe-locations",
    "/api/police-reports",
  ])("disables removed or persistent endpoints %s", async (endpoint) => {
    const { app } = setup();
    for (const method of ["get", "post"])
      expect((await request(app)[method](endpoint)).status).toBe(410);
  });
  it("returns JSON for unknown APIs and rejects cross-site requests", async () => {
    const { app } = setup();
    expect((await request(app).get("/api/missing")).status).toBe(404);
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("Sec-Fetch-Site", "cross-site")
      ).status,
    ).toBe(403);
  });
  it("validates and analyzes a multipart photo without forwarding unrelated fields", async () => {
    const { app, fetchImpl } = setup();
    const response = await request(app)
      .post("/api/analyze")
      .field("budget", "5")
      .field("lat", "SECRET_LOCATION")
      .attach("image", png, {
        filename: "photo.png",
        contentType: "image/png",
      });
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      { name: "Water", category: "water", quantity: 2, meals: 0, liters: 0 },
    ]);
    // The budget stays in the browser; the server neither needs nor echoes it.
    expect(fetchImpl.mock.calls[0][1].body).not.toContain('"budget"');
    expect(fetchImpl.mock.calls[0][0]).toContain(
      "generativelanguage.googleapis.com",
    );
    expect(fetchImpl.mock.calls[0][1].body).not.toContain("SECRET_LOCATION");
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("returns integer recyclable counts", async () => {
    const counts = { aluminum: 2, plastic: 0, glass: 1, steel: 0 };
    const { app } = setup(vi.fn().mockResolvedValue(gemini({ counts })));
    const response = await request(app)
      .post("/api/analyze-recyclables")
      .attach("image", png, {
        filename: "photo.png",
        contentType: "image/png",
      });
    expect(response.body.counts).toEqual(counts);
  });
  it.each(["/api/analyze", "/api/analyze-recyclables"])(
    "validates missing, bad and oversized uploads at %s",
    async (endpoint) => {
      const { app, fetchImpl } = setup();
      expect((await request(app).post(endpoint)).status).toBe(400);
      expect(
        (
          await request(app)
            .post(endpoint)
            .attach("image", Buffer.from("not a PNG"), {
              filename: "bad.png",
              contentType: "image/png",
            })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .post(endpoint)
            .attach("image", Buffer.alloc(5 * 1024 * 1024 + 1), {
              filename: "huge.png",
              contentType: "image/png",
            })
        ).status,
      ).toBe(413);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );
  it("rejects extra file fields before a provider call", async () => {
    const { app, fetchImpl } = setup();
    expect(
      (await request(app).post("/api/analyze").attach("wrong", png, "a.png"))
        .status,
    ).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("asks once more when a photo answer comes back unreadable", async () => {
    const garbled = {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(garbled)
      .mockResolvedValueOnce(gemini(analysis));
    const { app } = setup(fetchImpl, {
      config: { ...config, geminiFallbackModel: "backup-model" },
    });
    const response = await request(app)
      .post("/api/analyze")
      .attach("image", png, "a.png");
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toContain("backup-model");
    // Without a fallback model the same model is asked again, once.
    const twice = vi.fn().mockResolvedValue(garbled);
    const { app: plain } = setup(twice);
    expect(
      (await request(plain).post("/api/analyze").attach("image", png, "a.png"))
        .status,
    ).toBe(502);
    expect(twice).toHaveBeenCalledTimes(2);
  });
  it("unconfigured analysis is a visible service error", async () => {
    const { app } = setup(undefined, { config: readConfig({}) });
    expect(
      (await request(app).post("/api/analyze").attach("image", png, "a.png"))
        .status,
    ).toBe(503);
  });
  it("malformed provider results cannot become invented successful analyses", async () => {
    const { app } = setup(vi.fn().mockResolvedValue(gemini({ items: "bad" })));
    expect(
      (await request(app).post("/api/analyze").attach("image", png, "a.png"))
        .status,
    ).toBe(502);
  });
  it("nearby lookup accepts zero coordinates and includes IDs in the field mask", async () => {
    const { app, fetchImpl } = setup(
      vi.fn().mockResolvedValue(json({ places: [place] })),
    );
    const result = await request(app)
      .post("/api/places/search")
      .send({ lat: 0, lng: 0, query: " food bank " });
    expect(result.body.places[0]).toMatchObject({
      id: "p1",
      distanceKm: 0,
      openNow: false,
    });
    expect(fetchImpl.mock.calls[0][1].headers["X-Goog-FieldMask"]).toContain(
      "places.id",
    );
    expect(result.text).not.toContain("SECRET");
  });
  it("recycling centers return locations without fabricated rates", async () => {
    const { app } = setup(vi.fn().mockResolvedValue(json({ places: [place] })));
    const result = await request(app)
      .post("/api/recycling-centers")
      .send({ lat: 0, lng: 0 });
    expect(result.body.centers).toHaveLength(1);
    expect(result.body.centers[0]).not.toHaveProperty("rates");
  });
  it.each([
    { lat: 91, lng: 0, query: "food" },
    { lat: 0, lng: 181, query: "food" },
    { lat: 0, lng: 0, query: "" },
    { lat: 0, lng: 0, query: "a".repeat(121) },
    { lat: 0, lng: 0, query: "food", radius: 0 },
  ])("rejects invalid places request %j", async (body) => {
    const { app, fetchImpl } = setup();
    expect(
      (await request(app).post("/api/places/search").send(body)).status,
    ).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("handles missing provider keys and malformed JSON", async () => {
    const { app } = setup(undefined, { config: readConfig({}) });
    expect(
      (
        await request(app)
          .post("/api/places/search")
          .send({ lat: 0, lng: 0, query: "food" })
      ).status,
    ).toBe(503);
    expect(
      (
        await request(app)
          .post("/api/places/search")
          .set("Content-Type", "application/json")
          .send("{")
      ).status,
    ).toBe(400);
  });
  it.each(["/api/weather", "/api/recycling-centers"])(
    "rejects location in legacy GET URLs %s",
    async (endpoint) => {
      const { app } = setup();
      expect((await request(app).get(endpoint)).status).toBe(405);
    },
  );
  it("fetches weather on explicit request and validates returned values", async () => {
    const forecast = (daily) =>
      json({
        current: { temperature_2m: 70.4 },
        daily: {
          temperature_2m_max: [75.6],
          temperature_2m_min: [52.2],
          ...daily,
        },
      });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(forecast({ precipitation_probability_max: [40] }))
      .mockResolvedValueOnce(forecast({}));
    const { app } = setup(fetchImpl);
    expect(
      (await request(app).post("/api/weather").send({ lat: 0, lng: 0 })).body,
    ).toEqual({
      temperature: 70,
      high: 76,
      low: 52,
      rainChance: 40,
      unit: "°F",
      source: "Open-Meteo",
    });
    expect(fetchImpl.mock.calls[0][0]).toContain("temperature_2m_min");
    // A missing rain chance is unknown, not zero.
    expect(
      (await request(app).post("/api/weather").send({ lat: 0, lng: 0 })).body
        .rainChance,
    ).toBeNull();
  });
  it("returns route estimates and rejects invalid travel modes", async () => {
    const { app } = setup(
      vi
        .fn()
        .mockResolvedValue(
          json({ routes: [{ distanceMeters: 500, duration: "360s" }] }),
        ),
    );
    const body = {
      origin: { lat: 0, lng: 0 },
      destination: { lat: 1, lng: 1 },
    };
    expect(
      (await request(app).post("/api/directions").send(body)).body.routes,
    ).toEqual([{ distanceMeters: 500, durationSeconds: 360 }]);
    expect(
      (
        await request(app)
          .post("/api/directions")
          .send({ ...body, mode: "FLY" })
      ).status,
    ).toBe(400);
  });
  it("serves policy pages, protects private paths and reports missing production build", async () => {
    const { app } = setup(undefined, { distDir: "/no-such-build" });
    expect((await request(app).get("/")).status).toBe(503);
    expect((await request(app).get("/privacy.html")).status).toBe(200);
    for (const route of [
      "/.env",
      "/server/index.js",
      "/src/App.jsx",
      "/nonexistent",
    ])
      expect((await request(app).get(route)).status).toBe(404);
  });
  it("limits total API volume without collecting participant IPs and leaves health available", async () => {
    const app = createApp({ config: readConfig({}) });
    for (let i = 0; i < 120; i++) await request(app).get("/api/capabilities");
    expect((await request(app).get("/api/capabilities")).status).toBe(429);
    expect((await request(app).get("/api/health")).status).toBe(200);
  });
});
describe("calculation and schema boundaries", () => {
  it.each([
    null,
    true,
    undefined,
    "",
    " ",
    [],
    {},
    "12x",
    Infinity,
    -1,
    100001,
  ])("rejects invalid numeric value %s", (value) =>
    expect(() => number(value, "Value", 0, 100000)).toThrow(),
  );
  it("handles valid zero, integers and coordinate limits", () => {
    expect(number("0", "Value", 0, 1)).toBe(0);
    expect(() => number(1.2, "Count", 0, 2, true)).toThrow();
    expect(coordinates({ lat: -90, lng: 180 })).toEqual({ lat: -90, lng: 180 });
    expect(() => coordinates()).toThrow();
  });
  it("supports declared image signatures and rejects empty/unsupported images", () => {
    validateImage({ buffer: png, mimetype: "image/png" });
    validateImage({
      buffer: Buffer.from([255, 216, 255, 0]),
      mimetype: "image/jpeg",
    });
    validateImage({
      buffer: Buffer.from("RIFF0000WEBP"),
      mimetype: "image/webp",
    });
    expect(() =>
      validateImage({ buffer: Buffer.alloc(0), mimetype: "image/png" }),
    ).toThrow();
    expect(() =>
      validateImage({ buffer: png, mimetype: "image/gif" }),
    ).toThrow();
    expect(() =>
      validateImage({
        buffer: Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]),
        mimetype: "image/png",
      }),
    ).toThrow();
  });
  it("keeps rough meal and water estimates, treating missing ones as zero", () => {
    const result = normalizeAnalysis({
      items: [
        { name: "Rice", category: "food", quantity: 1, meals: 9.87 },
        { name: "Water", category: "water", quantity: 2, liters: 3, meals: -1 },
      ],
      summary: "Rice and water.",
    });
    expect(result.items[0]).toMatchObject({ meals: 9.9, liters: 0 });
    expect(result.items[1]).toMatchObject({ meals: 0, liters: 3 });
  });
  it("reads 1,200. and 1200 as the same number when checking guide answers", () => {
    const topic = {
      id: "food",
      title: "Food",
      url: "https://211sandiego.org/",
    };
    const check = (answer) =>
      normalizeGuide(
        { answer, topic: "food", lang: "en" },
        (id) => (id === "food" ? topic : null),
        new Set(["211", "1200"]),
      );
    expect(check("Call 211. About 1,200. families get help.")).toMatchObject({
      grounded: true,
      leaked: [],
    });
    // A number the corpus does not contain withholds the answer.
    expect(check("You can get $291 a month.")).toMatchObject({
      answer: "",
      grounded: false,
      leaked: ["291"],
    });
  });
  it("drops odd entries instead of failing the whole photo", () => {
    const result = normalizeAnalysis({
      items: [
        { name: "Blanket", category: "bedding", quantity: 1.4 },
        { name: "Ghost", category: "food", quantity: -1 },
        { name: "", category: "food", quantity: 1 },
        null,
      ],
      summary: 7,
    });
    expect(result.items).toEqual([
      { name: "Blanket", category: "misc", quantity: 1, meals: 0, liters: 0 },
    ]);
    expect(result.summary).toBe("");
  });
  it.each([null, {}, { items: "Water" }])(
    "rejects an answer with no item list %j",
    (raw) => expect(() => normalizeAnalysis(raw)).toThrow(),
  );
  it("validates counts and place shapes", () => {
    expect(() => normalizeCounts({ counts: { aluminum: 0.5 } })).toThrow();
    expect(() => normalizeCounts(null)).toThrow();
    expect(normalizePlaces({}, { lat: 0, lng: 0 })).toEqual([]);
    expect(() =>
      normalizePlaces({ places: "bad" }, { lat: 0, lng: 0 }),
    ).toThrow();
    expect(() =>
      normalizePlaces({ places: [{}] }, { lat: 0, lng: 0 }),
    ).toThrow();
    expect(
      normalizePlaces(
        {
          places: [
            {
              ...place,
              currentOpeningHours: undefined,
              formattedAddress: null,
            },
          ],
        },
        { lat: 0, lng: 0 },
      )[0],
    ).toMatchObject({ openNow: null, address: "" });
  });
  it("computes great-circle distances", () => {
    expect(distance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
      111.195,
      2,
    );
    expect(distance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(
      20015.087,
      2,
    );
  });
});
describe("provider failures", () => {
  it.each([
    () => Promise.resolve({ ok: false }),
    () => Promise.reject(new Error("SECRET")),
    () =>
      Promise.resolve({
        ok: true,
        json: () => {
          throw new Error("SECRET");
        },
      }),
  ])("sanitizes provider errors", async (fetchImpl) => {
    const p = createProviders(config, fetchImpl);
    await expect(
      p.places("food", { lat: 0, lng: 0 }, 1000),
    ).rejects.toMatchObject({ status: 502, code: "PROVIDER_ERROR" });
  });
  it("aborts a stalled provider instead of waiting indefinitely", async () => {
    const p = createProviders(
      { ...config, timeout: 5 },
      (url, { signal }) =>
        new Promise((resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    );
    await expect(p.weather({ lat: 0, lng: 0 })).rejects.toMatchObject({
      status: 504,
    });
  });
  it("gives photo analysis its own, longer time limit", async () => {
    const stall = (url, { signal }) =>
      new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      );
    // The short text limit does not apply to photos...
    const photo = createProviders(
      { ...config, timeout: 5, analysisTimeout: 40 },
      stall,
    );
    const started = Date.now();
    await expect(photo.analyze(png, "image/png", false)).rejects.toMatchObject({
      status: 504,
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
    // ...and without a setting the photo limit defaults to 45 seconds.
    expect(readConfig({}).analysisTimeout).toBe(45000);
  });
  it.each([
    {},
    { candidates: [{ finishReason: "MAX_TOKENS" }] },
    {
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } },
      ],
    },
  ])("rejects incomplete AI output", async (raw) => {
    const p = createProviders(config, async () => json(raw));
    await expect(p.analyze(png, "image/png", false)).rejects.toMatchObject({
      status: 502,
    });
  });
  it.each([
    {},
    { routes: [{ distanceMeters: -1, duration: "1s" }] },
    { routes: [{ distanceMeters: 2, duration: "n/a" }] },
  ])("rejects malformed routes %j", async (raw) => {
    const p = createProviders(config, async () => json(raw));
    await expect(
      p.directions({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, "WALK"),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("rejects missing weather and accepts empty route results", async () => {
    await expect(
      createProviders(config, async () => json({})).weather({ lat: 0, lng: 0 }),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      createProviders(config, async () => json({ routes: [] })).directions(
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        "WALK",
      ),
    ).resolves.toEqual({ routes: [] });
  });
});
