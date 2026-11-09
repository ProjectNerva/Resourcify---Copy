import { useEffect, useState } from "react";
import { strings } from "../utils/lang";
export default function InstallPrompt({ lang = "en" }) {
  const t = strings(lang).install;
  const [prompt, setPrompt] = useState(null),
    [dismissed, setDismissed] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const capture = (e) => {
        e.preventDefault();
        setPrompt(e);
      },
      installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  async function install() {
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      setError(t.error);
    }
  }
  if (!prompt || dismissed) return null;
  return (
    <aside className="notice" lang={lang}>
      <p>{t.text}</p>
      <button onClick={install}>{t.button}</button>
      <button onClick={() => setDismissed(true)}>{t.dismiss}</button>
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
