// Remove only storage owned by earlier Resourcify versions. No new personal data
// is persisted. A blocked deletion is surfaced instead of claiming it succeeded.
export async function purgeLegacyData(scope = window) {
  let complete = true;
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage = scope[name];
      const keys = Array.from({ length: storage.length }, (_, i) =>
        storage.key(i),
      );
      for (const key of keys)
        if (
          key?.startsWith("resourcify") ||
          key?.startsWith("mesh_") ||
          key === "pwa-install-dismissed"
        )
          storage.removeItem(key);
    } catch {
      complete = false;
    }
  }
  if (scope.indexedDB) {
    const deleted = await new Promise((resolve) => {
      try {
        const request = scope.indexedDB.deleteDatabase("resourcify-offline");
        request.onsuccess = () => resolve(true);
        request.onerror = request.onblocked = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
    complete = complete && deleted;
  }
  return complete;
}
