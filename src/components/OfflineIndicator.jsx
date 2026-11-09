import { useEffect, useState } from "react";
import { strings } from "../utils/lang";
export default function OfflineIndicator({ lang = "en" }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online ? null : (
    <p className="notice" role="status" lang={lang}>
      {strings(lang).offline}
    </p>
  );
}
