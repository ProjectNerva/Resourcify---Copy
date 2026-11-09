import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { purgeLegacyData } from "../../src/utils/offline/offlineStorage";
import {
  startPrivacyCleanup,
  registerOffline,
} from "../../src/utils/offline/pwa";
import OfflineIndicator from "../../src/components/OfflineIndicator";
import InstallPrompt from "../../src/components/InstallPrompt";
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
describe("browser privacy and install", () => {
  it("purges only legacy app data, including IndexedDB, without writing new values", async () => {
    localStorage.setItem("resourcify_user_location", "private");
    localStorage.setItem("other-app", "keep");
    sessionStorage.setItem("mesh_message", "private");
    const indexedDB = new IDBFactory();
    await expect(
      purgeLegacyData({ localStorage, sessionStorage, indexedDB }),
    ).resolves.toBe(true);
    expect(localStorage.getItem("resourcify_user_location")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem("other-app")).toBe("keep");
    expect(await indexedDB.databases()).toEqual([]);
  });
  it("reports blocked or denied cleanup", async () => {
    const scope = {
      get localStorage() {
        throw new Error("denied");
      },
      sessionStorage,
      indexedDB: {
        deleteDatabase() {
          const request = {};
          queueMicrotask(() => request.onblocked());
          return request;
        },
      },
    };
    await expect(purgeLegacyData(scope)).resolves.toBe(false);
    const fakeDocument = document.implementation.createHTMLDocument();
    await expect(
      startPrivacyCleanup(
        Object.assign(Object.create(scope), { document: fakeDocument }),
      ),
    ).resolves.toBe(false);
    expect(fakeDocument.body.textContent).toContain(
      "could not be fully removed",
    );
  });
  it("handles unavailable IndexedDB and successful startup cleanup", async () => {
    expect(
      await startPrivacyCleanup({ localStorage, sessionStorage, document }),
    ).toBe(true);
    expect(
      await purgeLegacyData({
        localStorage,
        sessionStorage,
        indexedDB: {
          deleteDatabase() {
            throw new Error("denied");
          },
        },
      }),
    ).toBe(false);
  });
  it("registers a service worker only in secure supported contexts", async () => {
    expect(await registerOffline({ isSecureContext: false })).toBe(false);
    expect(
      await registerOffline({ isSecureContext: true, navigator: {} }),
    ).toBe(false);
    const register = vi.fn().mockResolvedValue({});
    expect(
      await registerOffline({
        isSecureContext: true,
        navigator: { serviceWorker: { register } },
      }),
    ).toBe(true);
    expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" });
    register.mockRejectedValue(new Error("blocked"));
    expect(
      await registerOffline({
        isSecureContext: true,
        navigator: { serviceWorker: { register } },
      }),
    ).toBe(false);
  });
  it("tracks online/offline changes and removes listeners on unmount", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { unmount } = render(<OfflineIndicator />);
    expect(screen.queryByRole("status")).toBeNull();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("status")).toHaveTextContent("Manual planning");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    fireEvent(window, new Event("online"));
    expect(screen.queryByRole("status")).toBeNull();
    unmount();
  });
  it("waits for install availability, installs, and supports dismiss/error", async () => {
    render(<InstallPrompt />);
    expect(screen.queryByText("Install app")).toBeNull();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = vi.fn().mockResolvedValue();
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    fireEvent(window, event);
    fireEvent.click(screen.getByText("Install app"));
    await waitFor(() => expect(screen.queryByText("Install app")).toBeNull());
    expect(event.prompt).toHaveBeenCalled();
    event.prompt = vi.fn().mockRejectedValue(new Error("failed"));
    fireEvent(window, event);
    fireEvent.click(screen.getByText("Install app"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByText("Install app")).toBeNull();
  });
});
