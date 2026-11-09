import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { startPrivacyCleanup, registerOffline } from "./utils/offline/pwa";

void startPrivacyCleanup();
if (import.meta.env.PROD) void registerOffline();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
