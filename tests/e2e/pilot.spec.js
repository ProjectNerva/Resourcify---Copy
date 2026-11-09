import { test, expect } from "@playwright/test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const capabilities = {
  analysis: true,
  places: true,
  maps: false,
  directions: true,
  reports: false,
  retention: "none",
};
test("production app supports local workflows, clears session and has no storage writes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make a plan with what you have." }),
  ).toBeVisible();
  const nav = page.getByRole("navigation");
  await nav.getByRole("button", { name: "Rationer", exact: true }).click();
  await page.getByLabel("Money you can spend, in USD").fill("10");
  await page
    .getByLabel("Items", { exact: true })
    .fill("Water, 2, 1.5\nSoap, 1");
  await page.getByRole("button", { name: "Build plan" }).click();
  await expect(page.getByRole("region", { name: "Budget plan" })).toContainText(
    "Food: $6.00",
  );
  await nav.getByRole("button", { name: "Benefits", exact: true }).click();
  await page.getByLabel("Food", { exact: true }).check();
  await page.getByRole("button", { name: "Find programs" }).click();
  await expect(
    page.getByRole("link", { name: "SNAP food assistance" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Cash for Cans", exact: true }).click();
  await page.getByLabel("Aluminum cans quantity").fill("10");
  await page.getByLabel("Aluminum cans rate in USD").fill("0.05");
  await page.getByRole("button", { name: "Calculate value" }).click();
  await expect(
    page.getByRole("region", { name: "Recycling estimate" }),
  ).toContainText("$0.50");
  await nav.getByRole("button", { name: "Community Map", exact: true }).click();
  await expect(
    page.getByText(/Public reports and safe-location/),
  ).toBeVisible();
  // Online with no radio plugged in, the mesh screen is hidden until
  // someone turns it on in Settings.
  await expect(
    nav.getByRole("button", { name: "Mesh messages", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Settings", { exact: true }).click();
  await page.getByLabel(/Language/).selectOption("es");
  await expect(nav.getByRole("button", { name: "Inicio" })).toBeVisible();
  await page.getByLabel(/Idioma/).selectOption("en");
  await page.getByLabel("Show mesh radio messaging").check();
  await page.keyboard.press("Escape");
  await nav.getByRole("button", { name: "Mesh messages", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mesh messages" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear this session" }).click();
  await nav.getByRole("button", { name: "Rationer", exact: true }).click();
  await expect(page.getByLabel("Items", { exact: true })).toHaveValue("");
  const storage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    db: await indexedDB.databases(),
  }));
  expect(storage).toEqual({ local: 0, session: 0, db: [] });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("photo and nearby service flows with explicit provider fixtures", async ({
  page,
}) => {
  // These intercepted provider results test UI contracts, not live Google service.
  await page.route("**/api/capabilities", (r) =>
    r.fulfill({ json: capabilities }),
  );
  await page.route("**/api/analyze", (r) =>
    r.fulfill({
      json: {
        items: [{ name: "Water bottle", quantity: 1, category: "water" }],
        summary: "Fixture analysis",
        notice: "Test fixture; not live analysis",
      },
    }),
  );
  await page.route("**/api/places/search", (r) =>
    r.fulfill({
      json: {
        places: [
          {
            id: "fixture",
            name: "Fixture Food Bank",
            address: "Example address",
            location: { lat: 0, lng: 0 },
            distanceKm: 1,
            openNow: null,
          },
        ],
      },
    }),
  );
  await page.goto("/?action=analyze");
  const upload = page.getByRole("form", { name: "Analyze photo" });
  await expect(
    upload.getByRole("button", { name: "Analyze photo" }),
  ).toBeDisabled();
  await upload.getByLabel("Add a photo").setInputFiles({
    name: "supplies.png",
    mimeType: "image/png",
    buffer: png,
  });
  await upload.getByRole("button", { name: "Analyze photo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await expect(page.getByRole("region", { name: "Inventory" })).toContainText(
    "Water bottle",
  );
  await expect(upload.getByRole("img")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Community Map", exact: true })
    .click();
  const search = page
    .getByRole("form", { name: "Nearby search" })
    .filter({ visible: true });
  await search.getByText("Enter coordinates manually").click();
  await search.getByLabel("Latitude", { exact: true }).fill("0");
  await search.getByLabel("Longitude", { exact: true }).fill("0");
  await search.getByRole("button", { name: "Search nearby" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await expect(
    page.getByText("Fixture Food Bank", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open directions in Google Maps" }),
  ).toHaveAttribute("href", /destination=0%2C0/);
});
test("static app works offline and caches no API responses or participant data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect
    .poll(
      () =>
        page.evaluate(async () =>
          (await navigator.serviceWorker.getRegistrations()).some(
            (r) => r.active?.state === "activated",
          ),
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const caches = await page.evaluate(async () => {
    const result = [];
    for (const name of await window.caches.keys()) {
      for (const request of await (await window.caches.open(name)).keys())
        result.push(request.url);
    }
    return result;
  });
  expect(caches.some((url) => url.includes("/assets/"))).toBe(true);
  expect(caches.some((url) => url.includes("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  // Network emulation does not reliably change navigator.onLine in every Chrome
  // version. Verify a real uncached API call fails while the app remains usable.
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/api/health", { cache: "no-store" });
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Rationer", exact: true })
    .click();
  await page.getByLabel("Items", { exact: true }).fill("Blanket, 1");
  await page.getByRole("button", { name: "Build plan" }).click();
  await expect(page.getByRole("region", { name: "Inventory" })).toContainText(
    "Blanket",
  );
  await page.goto("/privacy.html");
  await expect(
    page.getByRole("heading", { name: "Privacy", exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("policies, static resources, private paths and health contracts", async ({
  request,
  page,
}) => {
  for (const path of [
    "/api/health",
    "/api/capabilities",
    "/privacy.html",
    "/terms.html",
    "/manifest.json",
    "/sw.js",
    "/precache-assets.json",
  ])
    expect((await request.get(path)).status()).toBe(200);
  for (const path of ["/.env", "/server/index.js", "/api/not-real"])
    expect((await request.get(path)).status()).toBe(404);
  expect((await request.get("/api/health")).headers()["cache-control"]).toBe(
    "no-store",
  );
  await page.goto("/privacy.html");
  await expect(
    page.getByText(
      /cannot promise that a hosting provider collects no technical data/,
    ),
  ).toBeVisible();
  await page.goto("/terms.html");
  await expect(
    page.getByRole("heading", { name: "No emergency or professional service" }),
  ).toBeVisible();
});
