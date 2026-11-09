import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import App from "../../src/App";

// A stand-in for navigator.serial that can list approved ports and fire
// plug and unplug events the way Chrome does.
function fakeSerial(ports = []) {
  const target = new EventTarget();
  target.getPorts = vi.fn(async () => ports);
  target.requestPort = vi.fn();
  target.ports = ports;
  return target;
}
function setSerial(value) {
  Object.defineProperty(navigator, "serial", { configurable: true, value });
}
const nav = () => screen.getByRole("navigation");
const meshTab = () =>
  within(nav()).queryByRole("button", { name: "Mesh messages" });

beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  ),
);
afterEach(() => {
  vi.unstubAllGlobals();
  delete navigator.serial;
  delete navigator.bluetooth;
});

describe("settings menu", () => {
  it("holds the language choice and closes on outside click or Escape", () => {
    render(<App />);
    const menu = screen.getByText("Settings").closest("details");
    fireEvent.click(screen.getByText("Settings"));
    menu.open = true;
    fireEvent.change(screen.getByLabelText(/Language/), {
      target: { value: "es" },
    });
    expect(within(nav()).getByRole("button", { name: "Inicio" })).toBeVisible();
    expect(screen.getByText("Ajustes")).toBeInTheDocument();
    // Clicks inside keep it open; clicks elsewhere close it.
    fireEvent.pointerDown(screen.getByLabelText(/Idioma/));
    expect(menu.open).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(menu.open).toBe(false);
    menu.open = true;
    fireEvent.keyDown(document, { key: "Enter" });
    expect(menu.open).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector("summary"));
    // Escape with the menu already closed changes nothing.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu.open).toBe(false);
  });
});

describe("mesh screen appears only when it can help", () => {
  it("never appears where radios are impossible, such as on an iPhone", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<App />);
    expect(meshTab()).toBeNull();
    expect(screen.queryByLabelText("Show mesh radio messaging")).toBeNull();
  });

  it("stays hidden online until turned on in Settings", async () => {
    setSerial(fakeSerial());
    render(<App />);
    await act(async () => {});
    expect(meshTab()).toBeNull();
    fireEvent.click(screen.getByLabelText("Show mesh radio messaging"));
    fireEvent.click(meshTab());
    expect(
      screen.getByRole("heading", { level: 1, name: "Mesh messages" }),
    ).toBeVisible();
    // Staying listed while open: turning the setting off does not remove it.
    fireEvent.click(screen.getByLabelText("Show mesh radio messaging"));
    expect(meshTab()).not.toBeNull();
  });

  it("appears when the device goes offline and leaves when it is back", () => {
    Object.defineProperty(navigator, "bluetooth", {
      configurable: true,
      value: {},
    });
    render(<App />);
    expect(meshTab()).toBeNull();
    act(() => window.dispatchEvent(new Event("offline")));
    expect(meshTab()).not.toBeNull();
    act(() => window.dispatchEvent(new Event("online")));
    expect(meshTab()).toBeNull();
  });

  it("appears when a radio approved before is already plugged in", async () => {
    setSerial(fakeSerial([{}]));
    render(<App />);
    expect(await within(nav()).findByText("Mesh messages")).toBeVisible();
    expect(screen.queryByTestId("radio-found")).toBeNull();
  });

  it("notices a radio being plugged in and offers to open the screen", async () => {
    const serial = fakeSerial();
    setSerial(serial);
    render(<App />);
    await act(async () => {});
    expect(meshTab()).toBeNull();
    serial.ports.push({});
    await act(async () => serial.dispatchEvent(new Event("connect")));
    expect(screen.getByTestId("radio-found")).toHaveTextContent(
      "A Meshtastic radio is plugged in.",
    );
    fireEvent.click(screen.getByText("Open mesh messages"));
    expect(
      screen.getByRole("heading", { level: 1, name: "Mesh messages" }),
    ).toBeVisible();
    serial.ports.pop();
    await act(async () => serial.dispatchEvent(new Event("disconnect")));
    expect(screen.queryByTestId("radio-found")).toBeNull();
  });

  it("treats a browser that refuses to list ports as having no radio", async () => {
    const serial = fakeSerial();
    serial.getPorts = vi.fn(async () => {
      throw new Error("blocked");
    });
    setSerial(serial);
    const { unmount } = render(<App />);
    await act(async () => {});
    expect(meshTab()).toBeNull();
    const removed = vi.spyOn(serial, "removeEventListener");
    unmount();
    expect(removed).toHaveBeenCalledWith("connect", expect.any(Function));
  });

  it("ignores a port lookup that finishes after the app has closed", async () => {
    let finish;
    const serial = fakeSerial();
    serial.getPorts = vi.fn(() => new Promise((r) => (finish = r)));
    setSerial(serial);
    const { unmount } = render(<App />);
    unmount();
    await act(async () => finish([{}]));
    expect(serial.getPorts).toHaveBeenCalled();
  });
});
