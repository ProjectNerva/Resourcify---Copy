import { useEffect, useState } from "react";
import ImageAnalysis from "./screens/ImageAnalysis";
import EligibilityForm from "./screens/EligibilityForm";
import CashForCans from "./screens/CashForCans";
import MapSection from "./screens/MapSection";
import MeshtasticChat from "./screens/MeshtasticChat";
import Guide from "./screens/Guide";
import { ProcessingNoticeProvider } from "./components/ProcessingNotice";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import Settings from "./components/Settings";
import { useMeshAvailability } from "./utils/mesh/detect";
import { api } from "./utils/client";
import { API_ENDPOINTS, NO_CAPABILITIES } from "./config";
import { pickLang, strings } from "./utils/lang";
import "./app.css";
const VIEW_KEYS = ["guide", "analysis", "programs", "recycle", "map", "mesh"];
// Screens whose own copy has not been translated yet. In Spanish they carry a
// note pointing to 211 rather than mixing languages inside a form.
const ENGLISH_ONLY = new Set([
  "analysis",
  "programs",
  "recycle",
  "map",
  "mesh",
]);
export function initialView(search = window.location.search) {
  const action = new URLSearchParams(search).get("action");
  return ["analyze", "budget"].includes(action) ? "analysis" : "home";
}
export default function App() {
  const [view, setView] = useState(initialView),
    [capabilities, setCapabilities] = useState(NO_CAPABILITIES),
    [statusKey, setStatusKey] = useState("checking"),
    [session, setSession] = useState(0),
    [lang, setLang] = useState(pickLang),
    [meshPinned, setMeshPinned] = useState(false);
  const t = strings(lang);
  const mesh = useMeshAvailability();
  // The mesh screen only earns a place in the menu when it can do something.
  // It stays listed while open so going back online does not yank it away.
  const showMesh =
    mesh.supported &&
    (mesh.offline || mesh.radio || meshPinned || view === "mesh");
  const views = VIEW_KEYS.filter((key) => key !== "mesh" || showMesh);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const request = new AbortController();
    api(API_ENDPOINTS.capabilities, { signal: request.signal })
      .then((data) => {
        const configured = Object.fromEntries(
          Object.keys(NO_CAPABILITIES).map((key) => [
            key,
            data?.[key] === true,
          ]),
        );
        setCapabilities(configured);
        setStatusKey(
          configured.analysis && configured.places ? "online" : "partial",
        );
      })
      .catch(() => setStatusKey("offline"));
    return () => request.abort();
  }, []);
  const englishOnlyNote = (key) =>
    lang !== "en" &&
    ENGLISH_ONLY.has(key) && (
      <p className="notice" lang={lang}>
        {t.englishOnly}
      </p>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <button className="brand" onClick={() => setView("home")}>
          Resourcify
        </button>
        {/* Sits beside the brand, outside the scrolling row, so it never
            ends up off-screen on a phone. */}
        <Settings
          t={t}
          lang={lang}
          setLang={setLang}
          mesh={{ ...mesh, pinned: meshPinned, setPinned: setMeshPinned }}
        />
        <nav aria-label="Main navigation">
          <button
            aria-current={view === "home" ? "page" : undefined}
            onClick={() => setView("home")}
          >
            {t.nav.home}
          </button>
          {views.map((key) => (
            <button
              key={key}
              aria-current={view === key ? "page" : undefined}
              onClick={() => setView(key)}
            >
              {t.nav[key]}
            </button>
          ))}
        </nav>
      </header>
      <OfflineIndicator lang={lang} />
      <main id="main" key={session}>
        <ProcessingNoticeProvider lang={lang}>
          <div hidden={view !== "home"}>
            <h1>{t.home.title}</h1>
            <p className="lead">{t.home.lead}</p>
            {/* The phone line is the one thing that works for everyone, on
                every device, in 200 languages. It belongs above the tools,
                not in the footer. */}
            <p className="notice" data-testid="help-now">
              {t.home.helpNow}
            </p>
            <p role="status">{t.home[statusKey]}</p>
            {mesh.supported && mesh.detected && (
              <p className="notice" data-testid="radio-found">
                {t.settings.radioFound}{" "}
                <button onClick={() => setView("mesh")}>
                  {t.settings.openMesh}
                </button>
              </p>
            )}
            <div className="home-actions">
              {views.map((key) => (
                <button key={key} onClick={() => setView(key)}>
                  {t.nav[key]} <span>{t.home.subtitles[key]}</span>
                </button>
              ))}
            </div>
            <p>
              {t.home.privacy} <a href="/privacy.html">{t.home.privacyLink}</a>
            </p>
          </div>
          <div hidden={view !== "guide"}>
            <Guide capabilities={capabilities} lang={lang} />
          </div>
          <div hidden={view !== "analysis"}>
            {englishOnlyNote("analysis")}
            <ImageAnalysis capabilities={capabilities} />
          </div>
          <div hidden={view !== "programs"}>
            {englishOnlyNote("programs")}
            <EligibilityForm />
          </div>
          <div hidden={view !== "recycle"}>
            {englishOnlyNote("recycle")}
            <CashForCans
              capabilities={capabilities}
              active={view === "recycle"}
            />
          </div>
          <div hidden={view !== "map"}>
            {englishOnlyNote("map")}
            <MapSection capabilities={capabilities} active={view === "map"} />
          </div>
          <div hidden={view !== "mesh"}>
            {englishOnlyNote("mesh")}
            <MeshtasticChat />
          </div>
        </ProcessingNoticeProvider>
        <InstallPrompt lang={lang} />
      </main>
      <footer>
        <button
          onClick={() => {
            setSession((n) => n + 1);
            setView("home");
          }}
        >
          {t.footer.clear}
        </button>
        <p>{t.footer.clearNote}</p>
        <p>{t.footer.disclaimer}</p>
        <p>
          <a href="/privacy.html">{t.footer.privacy}</a> ·{" "}
          <a href="/terms.html">{t.footer.terms}</a> ·{" "}
          <a href="mailto:chenhaozhang01@gmail.com">{t.footer.contact}</a>
        </p>
      </footer>
    </div>
  );
}
