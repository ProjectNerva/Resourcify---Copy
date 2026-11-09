const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const {
  HttpError,
  number,
  coordinates,
  validateImage,
  normalizeAnalysis,
  normalizeCounts,
  normalizePlaces,
} = require("./validation");
const { createProviders } = require("./providers");
const {
  crisisAnswer,
  topicById,
  allowedNumbers,
  CRISIS_BACKSTOP,
  DECLINE,
  HOTLINE_211,
} = require("./guide/guide211");
const { redactIdentifiers } = require("./guide/redact");
const { normalizeGuide } = require("./guide/answer");

function readConfig(env = process.env) {
  return {
    external: env.ENABLE_EXTERNAL_SERVICES === "true",
    geminiKey: env.GEMINI_API_KEY || "",
    geminiModel: env.GEMINI_MODEL || "",
    geminiFallbackModel: env.GEMINI_FALLBACK_MODEL || "",
    placesKey: env.PLACES_API_KEY || "",
    mapsKey: env.MAPS_BROWSER_API_KEY || "",
    routesKey: env.ROUTES_API_KEY || "",
    trustProxy: env.TRUST_PROXY === "1" ? 1 : false,
    timeout: 20000,
    analysisTimeout: 45000,
  };
}
function createApp({
  config = readConfig(),
  fetchImpl = globalThis.fetch,
  distDir = path.join(__dirname, "..", "dist"),
  publicDir = path.join(__dirname, "..", "public"),
  rateLimitEnabled = true,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "geolocation=(self), camera=(self), microphone=()",
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.get("sec-fetch-site") === "cross-site")
      return res.status(403).json({
        error: "Cross-site API requests are not allowed.",
        code: "CROSS_SITE",
      });
    next();
  });
  // Service-wide counter: no per-participant IP addresses retained.
  if (rateLimitEnabled)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 120,
        keyGenerator: () => "service",
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip: (req) => req.path === "/health",
        message: {
          error: "Service is busy. Try again in a minute.",
          code: "RATE_LIMIT",
        },
      }),
    );
  app.use(express.json({ limit: "8mb" }));
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 4096 },
  });
  const providers = createProviders(config, fetchImpl);
  const route = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res)).catch(next);
  const enabled = (key, label) => {
    if (!config.external || !key)
      throw new HttpError(
        503,
        `${label} is not configured for this deployment. You can still use the local tools.`,
        "SERVICE_UNAVAILABLE",
      );
  };
  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", service: "resourcify" }),
  );
  app.get("/api/capabilities", (req, res) =>
    res.json({
      analysis: Boolean(
        config.external && config.geminiKey && config.geminiModel,
      ),
      places: Boolean(config.external && config.placesKey),
      maps: Boolean(config.external && config.mapsKey),
      directions: Boolean(config.external && config.routesKey),
      weather: Boolean(config.external),
      guide: Boolean(config.external && config.geminiKey && config.geminiModel),
      reports: false,
      retention: "none",
    }),
  );
  app.get(
    ["/api/maps-config", "/api/maps-key"],
    route(async (req, res) => {
      enabled(config.mapsKey, "Maps");
      res.json({ mapsApiKey: config.mapsKey });
    }),
  );
  app.all("/api/places-key", (req, res) =>
    res.status(410).json({
      error: "Server API keys are never exposed. Use /api/places/search.",
      code: "ENDPOINT_REMOVED",
    }),
  );
  app.post(
    "/api/analyze",
    upload.single("image"),
    route(async (req, res) => {
      validateImage(req.file);
      enabled(config.geminiKey && config.geminiModel, "Photo analysis");
      res.json(
        normalizeAnalysis(
          await providers.analyze(req.file.buffer, req.file.mimetype, false),
        ),
      );
    }),
  );
  app.post(
    "/api/analyze-recyclables",
    upload.single("image"),
    route(async (req, res) => {
      validateImage(req.file);
      enabled(config.geminiKey && config.geminiModel, "Photo analysis");
      res.json({
        counts: normalizeCounts(
          await providers.analyze(req.file.buffer, req.file.mimetype, true),
        ),
        notice:
          "AI counts are estimates. Confirm material, size and refund eligibility yourself.",
      });
    }),
  );
  // The guide is the one route that spends money per call. Its own
  // service-wide cap sits well under the general one so a burst against it
  // cannot run up the Gemini bill or crowd out the manual tools.
  const guideLimiter = rateLimitEnabled
    ? rateLimit({
        windowMs: 60000,
        limit: 30,
        keyGenerator: () => "guide",
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: {
          error: "The guide is busy. Try again in a minute.",
          code: "RATE_LIMIT",
        },
      })
    : (req, res, next) => next();
  const SAFETY_NOTICE = "This is an automatic safety message, not a person.";
  app.post(
    "/api/guide",
    guideLimiter,
    route(async (req, res) => {
      const question = req.body?.question;
      if (
        typeof question !== "string" ||
        !question.trim() ||
        question.length > 400
      )
        throw new HttpError(400, "Ask a question of 1-400 characters.");
      // Crisis routing happens before any model call, and works even when the
      // deployment has no Gemini key at all.
      const crisis = crisisAnswer(question);
      if (crisis)
        return res.json({
          ...crisis,
          noticeKey: "crisis",
          notice: SAFETY_NOTICE,
        });
      enabled(config.geminiKey && config.geminiModel, "Guide");
      // Identifiers come out before the question leaves this server.
      const result = normalizeGuide(
        await providers.guide(redactIdentifiers(question.trim())),
        topicById,
        allowedNumbers(),
      );
      // Second net: the model flagged a possible crisis the patterns missed.
      // Its own words are discarded; the fixed message is served.
      if (result.crisisBackstop)
        return res.json({
          crisis: true,
          id: "model",
          lang: result.lang,
          answer: CRISIS_BACKSTOP[result.lang],
          sources: [],
          noticeKey: "crisis",
          notice: SAFETY_NOTICE,
        });
      res.json({
        answer: result.answer || DECLINE[result.lang],
        sources: result.sources,
        grounded: result.grounded,
        lang: result.lang,
        crisis: false,
        // The client shows the notice in its own language; the English text
        // stays for anyone reading the API directly.
        noticeKey: result.grounded ? "grounded" : "uncovered",
        notice: result.grounded
          ? "Answers come from 211 material and may be out of date. Resourcify cannot decide whether you qualify."
          : `Resourcify does not have that information. ${HOTLINE_211}`,
      });
    }),
  );
  app.post(
    "/api/places/search",
    route(async (req, res) => {
      const location = coordinates(req.body),
        query = req.body.query;
      if (typeof query !== "string" || !query.trim() || query.length > 120)
        throw new HttpError(400, "Enter a search of 1–120 characters.");
      const radius = number(req.body.radius ?? 10000, "Radius", 100, 50000);
      enabled(config.placesKey, "Nearby places");
      res.json({
        places: normalizePlaces(
          await providers.places(query.trim(), location, radius),
          location,
        ),
      });
    }),
  );
  app.post(
    "/api/recycling-centers",
    route(async (req, res) => {
      const location = coordinates(req.body),
        radius = number(req.body.radius ?? 16000, "Radius", 100, 50000);
      enabled(config.placesKey, "Recycling centers");
      res.json({
        centers: normalizePlaces(
          await providers.places("recycling center", location, radius),
          location,
        ),
        notice: "Contact centers for accepted materials, rates and hours.",
      });
    }),
  );
  app.post(
    "/api/weather",
    route(async (req, res) => {
      const location = coordinates(req.body);
      enabled(config.external, "Weather");
      res.json(await providers.weather(location));
    }),
  );
  app.post(
    "/api/directions",
    route(async (req, res) => {
      const origin = coordinates(req.body.origin),
        destination = coordinates(req.body.destination),
        mode = req.body.mode ?? "WALK";
      if (!["WALK", "DRIVE", "BICYCLE", "TRANSIT"].includes(mode))
        throw new HttpError(400, "Invalid travel mode.");
      enabled(config.routesKey, "Directions");
      res.json(await providers.directions(origin, destination, mode));
    }),
  );
  app.get(["/api/recycling-centers", "/api/weather"], (req, res) =>
    res.status(405).set("Allow", "POST").json({
      error: "Use POST so location is not put in a request URL.",
      code: "METHOD_NOT_ALLOWED",
    }),
  );
  app.all(
    [
      "/api/alerts/:type",
      "/api/alerts",
      "/api/safe-locations",
      "/api/police-reports",
    ],
    (req, res) =>
      res.status(410).json({
        error:
          "Community reporting is disabled because this pilot does not retain participant data.",
        code: "COMMUNITY_REPORTING_DISABLED",
      }),
  );
  app.use("/api", (req, res) =>
    res
      .status(404)
      .json({ error: "API endpoint not found.", code: "NOT_FOUND" }),
  );
  // Never expose the repository or credentials. Only the compiled app and public assets.
  app.use(
    express.static(distDir, {
      index: false,
      dotfiles: "deny",
      setHeaders: (res, file) =>
        res.set(
          "Cache-Control",
          /[\\/]assets[\\/]/.test(file)
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        ),
    }),
  );
  app.use(
    express.static(publicDir, { index: false, dotfiles: "deny", maxAge: 0 }),
  );
  app.get("/", (req, res) => {
    if (!fs.existsSync(path.join(distDir, "index.html")))
      return res
        .status(503)
        .type("text")
        .send(
          "Run npm run build before starting the production app. For development use npm run dev.",
        );
    res
      .set("Cache-Control", "no-cache")
      .sendFile(path.join(distDir, "index.html"));
  });
  app.use((req, res) =>
    res.status(404).sendFile(path.join(publicDir, "404.html")),
  );
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err instanceof multer.MulterError
        ? err.code === "LIMIT_FILE_SIZE"
          ? 413
          : 400
        : err.status || 500;
    const message =
      err instanceof multer.MulterError
        ? "Upload one JPEG, PNG or WebP image, at most 5 MB."
        : err instanceof HttpError
          ? err.message
          : status === 400
            ? "Invalid request."
            : "The request could not be completed.";
    res
      .status(status)
      .set("Cache-Control", "no-store")
      .json({
        error: message,
        code: err instanceof HttpError ? err.code : "REQUEST_FAILED",
      });
  });
  return app;
}
// Process entry point. The browser end-to-end run and the Render health
// check exercise it; unit tests import createApp instead, so it is left
// out of unit coverage.
/* v8 ignore start */
if (require.main === module) {
  require("dotenv").config({ quiet: true });
  const port = number(process.env.PORT || 3000, "Port", 1, 65535, true);
  const server = createApp().listen(port, "0.0.0.0", () =>
    console.log(`Resourcify ready on port ${port}`),
  );
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
/* v8 ignore stop */
module.exports = { createApp, readConfig };
