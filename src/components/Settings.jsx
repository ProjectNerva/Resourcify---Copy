import { useEffect, useRef } from "react";

// A small menu in the header instead of a language button that took space on
// every screen. Nothing here is saved: choices last for this tab only, the
// same as everything else in the app.
export default function Settings({ t, lang, setLang, mesh }) {
  const menu = useRef(null);
  useEffect(() => {
    const close = () => {
      if (menu.current) menu.current.open = false;
    };
    const outside = (e) => {
      if (!menu.current?.contains(e.target)) close();
    };
    const escape = (e) => {
      if (e.key === "Escape" && menu.current?.open) {
        close();
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="settings" ref={menu}>
      <summary>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
        {t.settings.title}
      </summary>
      <div className="settings-panel">
        <label>
          {t.settings.language}
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en" lang="en">
              English
            </option>
            <option value="es" lang="es">
              Español
            </option>
          </select>
        </label>
        {mesh.supported && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={mesh.pinned}
                onChange={(e) => mesh.setPinned(e.target.checked)}
              />
              {t.settings.mesh}
            </label>
            <p className="settings-hint">{t.settings.meshHint}</p>
          </>
        )}
      </div>
    </details>
  );
}
