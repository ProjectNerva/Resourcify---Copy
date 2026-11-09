import { useEffect, useRef, useState } from "react";
import { api } from "../utils/client";
import { API_ENDPOINTS } from "../config";
import { strings } from "../utils/lang";

const NOTICE_KEYS = {
  grounded: "noticeGrounded",
  uncovered: "noticeUncovered",
  crisis: "noticeCrisis",
};

// Kept in tab memory only, like the rest of the app. Nothing is sent anywhere
// except the single question the person submits. The model answers in the
// language the question is written in; the interface follows the app language.
export default function Guide({ capabilities = {}, lang = "en" }) {
  const t = strings(lang).guide;
  const [question, setQuestion] = useState(""),
    [turns, setTurns] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function ask(text) {
    const asked = text.trim();
    if (!asked || busy) return;
    request.current?.abort();
    request.current = new AbortController();
    setError("");
    setBusy(true);
    setQuestion("");
    try {
      const data = await api(API_ENDPOINTS.guide, {
        body: { question: asked },
        signal: request.current.signal,
      });
      setTurns((prev) => [
        ...prev,
        {
          question: asked,
          answer: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
          noticeKey: NOTICE_KEYS[data.noticeKey] ? data.noticeKey : null,
          notice: data.notice,
          crisis: data.crisis === true,
        },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" lang={lang}>
      <h2>{t.heading}</h2>
      <p>{t.intro}</p>
      {!capabilities.guide && <p role="status">{t.notConfigured}</p>}

      {turns.length === 0 && (
        <div className="guide-suggestions">
          <p>{t.tryAsking}</p>
          {t.suggestions.map((text) => (
            <button
              key={text}
              type="button"
              disabled={busy}
              onClick={() => ask(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <ol className="guide-thread">
        {turns.map((turn, index) => (
          <li key={index}>
            <p className="guide-question">{turn.question}</p>
            <div
              className={turn.crisis ? "guide-answer crisis" : "guide-answer"}
            >
              <p>{turn.answer}</p>
              {turn.sources.length > 0 && (
                <p className="guide-source">
                  {turn.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.sourcePrefix}
                      {source.title}
                    </a>
                  ))}
                </p>
              )}
              <p className="guide-notice">
                {turn.noticeKey ? t[NOTICE_KEYS[turn.noticeKey]] : turn.notice}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <form
        aria-label={lang === "en" ? "Ask the guide" : t.heading}
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <label>
          {t.questionLabel}
          <input
            maxLength="400"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t.placeholder}
          />
        </label>
        <button disabled={busy || !question.trim()}>
          {busy ? t.working : t.ask}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <p>
        {t.privacyWarning} <a href="/privacy.html">{t.privacyLink}</a>
      </p>
    </section>
  );
}
