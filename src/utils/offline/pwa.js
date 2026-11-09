import { purgeLegacyData } from "./offlineStorage";
export async function startPrivacyCleanup(scope = window) {
  const complete = await purgeLegacyData(scope);
  if (!complete) {
    const notice = scope.document.createElement("p");
    notice.setAttribute("role", "alert");
    notice.textContent =
      "Old browser data could not be fully removed. Close other Resourcify tabs and clear this site’s data in browser settings.";
    scope.document.body.prepend(notice);
  }
  return complete;
}
export async function registerOffline(scope = window) {
  if (!scope.isSecureContext || !scope.navigator.serviceWorker) return false;
  try {
    await scope.navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    return true;
  } catch {
    return false;
  }
}
