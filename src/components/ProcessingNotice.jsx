import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { strings } from "../utils/lang";

// One notice per kind of external processing. Shown as a dialog at the moment
// the person acts, instead of a checkbox they must tick first. "Accept" applies
// once; "Accept and don't ask again" lasts for the session only. It is kept in
// React state, never in storage, so it resets with "Clear this session" or a
// reload, which is what the privacy policy promises.
export const NOTICES = strings("en").notice;

// Without a provider (component tests render pieces on their own) the notice
// is treated as accepted. The app always mounts the provider; the end-to-end
// test asserts the dialog actually appears there.
const Context = createContext(() => Promise.resolve(true));

export function useProcessingNotice(kind) {
  const confirm = useContext(Context);
  return useCallback(() => confirm(kind), [confirm, kind]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ProcessingNoticeProvider({ lang = "en", children }) {
  const [pending, setPending] = useState(null);
  const remembered = useRef(new Set());
  const dialog = useRef(null);
  const confirm = useCallback((kind) => {
    if (remembered.current.has(kind)) return Promise.resolve(true);
    return new Promise((resolve) => setPending({ kind, resolve }));
  }, []);
  function answer(accepted, remember = false) {
    if (remember) remembered.current.add(pending.kind);
    pending.resolve(accepted);
    setPending(null);
  }
  // A real modal: Escape cancels, and Tab stays inside the dialog. Screen
  // reader and keyboard users otherwise land on the page behind it.
  useEffect(() => {
    if (!pending) return;
    const node = dialog.current;
    node?.querySelector("[data-default]")?.focus();
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        answer(false);
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // answer() closes over the current pending request; re-bind per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);
  const t = strings(lang).notice;
  const notice = pending && t[pending.kind];
  return (
    <Context.Provider value={confirm}>
      {children}
      {notice && (
        <div className="processing-notice-backdrop">
          <div
            ref={dialog}
            className="processing-notice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-title"
            lang={lang}
          >
            <h2 id="notice-title">{notice.title}</h2>
            <p>{notice.body}</p>
            <p>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
                {t.howProcessing}
              </a>
            </p>
            <div className="processing-notice-actions">
              <button type="button" onClick={() => answer(false)}>
                {t.cancel}
              </button>
              <button type="button" onClick={() => answer(true)} data-default>
                {t.accept}
              </button>
              <button type="button" onClick={() => answer(true, true)}>
                {t.acceptRemember}
              </button>
            </div>
          </div>
        </div>
      )}
    </Context.Provider>
  );
}
