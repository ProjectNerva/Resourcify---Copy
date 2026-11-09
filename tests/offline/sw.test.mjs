import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());
async function worker({
  manifest = { version: "1234567890abcdef", files: ["/assets/app.js"] },
  fail = false,
} = {}) {
  const handlers = {},
    cache = {
      addAll: vi.fn().mockImplementation(async () => {
        if (fail) throw new Error("network");
      }),
      match: vi.fn().mockResolvedValue("cached"),
    },
    caches = {
      keys: vi
        .fn()
        .mockResolvedValue([
          "resourcify-v1",
          "other-app",
          "resourcify-static-1234567890abcdef",
        ]),
      open: vi.fn().mockResolvedValue(cache),
      delete: vi.fn(),
    },
    fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => manifest }),
    self = {
      location: { origin: "https://example.test" },
      addEventListener: (type, handler) => (handlers[type] = handler),
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    };
  vi.resetModules();
  vi.stubGlobal("self", self);
  vi.stubGlobal("caches", caches);
  vi.stubGlobal("fetch", fetch);
  await import("../../public/sw.js");
  return { handlers, cache, caches, fetch, self };
}
async function lifecycle(handler) {
  let promise;
  handler({ waitUntil: (value) => (promise = value) });
  await promise;
}
describe("service worker privacy boundaries", () => {
  it("caches complete static asset manifest, activates and removes only old app caches", async () => {
    const w = await worker();
    await lifecycle(w.handlers.install);
    expect(w.cache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining(["/assets/app.js", "/", "/privacy.html"]),
    );
    await lifecycle(w.handlers.activate);
    expect(w.caches.delete).toHaveBeenCalledWith("resourcify-v1");
    expect(w.caches.delete).not.toHaveBeenCalledWith("other-app");
    expect(w.self.clients.claim).toHaveBeenCalled();
  });
  it.each([
    { version: "bad", files: [] },
    { version: "1234567890abcdef", files: ["/api/analyze"] },
    { version: "1234567890abcdef", files: ["https://evil.test"] },
  ])("rejects invalid asset manifest %j", async (manifest) => {
    const w = await worker({ manifest });
    await expect(lifecycle(w.handlers.install)).rejects.toThrow();
  });
  it("deletes partial cache if installation fails", async () => {
    const w = await worker({ fail: true });
    await expect(lifecycle(w.handlers.install)).rejects.toThrow();
    expect(w.caches.delete).toHaveBeenCalledWith(
      "resourcify-static-1234567890abcdef",
    );
  });
  it.each([
    ["GET", "https://example.test/api/weather"],
    ["POST", "https://example.test/api/analyze"],
    ["GET", "https://google.com/maps"],
    ["GET", "https://example.test/unlisted"],
  ])("does not intercept %s %s", async (method, url) => {
    const w = await worker(),
      respondWith = vi.fn();
    w.handlers.fetch({ request: { method, url }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("serves cached static content and fetches uncached allowed assets", async () => {
    const w = await worker();
    let result;
    w.handlers.fetch({
      request: { method: "GET", url: "https://example.test/?action=budget" },
      respondWith: (r) => (result = r),
    });
    expect(await result).toBe("cached");
    w.cache.match.mockResolvedValue(undefined);
    w.handlers.fetch({
      request: { method: "GET", url: "https://example.test/assets/app.js" },
      respondWith: (r) => (result = r),
    });
    await result;
    expect(w.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.test/assets/app.js" }),
    );
  });
});
