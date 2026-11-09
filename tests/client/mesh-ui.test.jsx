import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
const mock = vi.hoisted(() => ({ instance: null }));
vi.mock("../../src/utils/mesh/meshClient", () => ({
  MeshClient: class {
    constructor(onEvent) {
      this.onEvent = onEvent;
      this.ready = false;
      this.connect = vi.fn(async () => {
        this.ready = true;
        this.onEvent({
          type: "status",
          text: "Radio connected and configured.",
        });
      });
      this.send = vi.fn(async () => 77);
      this.disconnect = vi.fn(async () => {
        this.ready = false;
      });
      mock.instance = this;
    }
  },
}));
import MeshtasticChat from "../../src/screens/MeshtasticChat";
beforeEach(() => {
  Object.defineProperty(navigator, "serial", { configurable: true, value: {} });
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: {},
  });
});
afterEach(() => {
  delete navigator.serial;
  delete navigator.bluetooth;
});
describe("mesh screen interactions", () => {
  it("connects, sends text, updates queue/ack and clears/disconnects", async () => {
    render(<MeshtasticChat />);
    expect(screen.getByText("Connect USB radio")).toBeEnabled();
    fireEvent.click(screen.getByText("Connect USB radio"));
    await screen.findByText("Radio connected and configured.");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.change(screen.getByLabelText(/Channel index/), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("Send message"));
    await screen.findByText(/Written to radio/);
    expect(mock.instance.send).toHaveBeenCalledWith("Hello", 1);
    act(() => mock.instance.onEvent({ type: "queue", id: 77, error: 0 }));
    expect(screen.getByText(/Queued by radio/)).toBeInTheDocument();
    act(() => mock.instance.onEvent({ type: "ack", id: 77, error: 0 }));
    expect(screen.getByText(/human receipt unconfirmed/)).toBeInTheDocument();
    act(() => mock.instance.onEvent({ type: "ack", id: 77, error: 1 }));
    expect(screen.getByText(/routing error/)).toBeInTheDocument();
    act(() =>
      mock.instance.onEvent({
        type: "text",
        id: 2,
        from: 42,
        text: "Received text",
      }),
    );
    expect(screen.getByText(/Received text/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear messages"));
    expect(
      screen.getByRole("list", { name: "Radio messages" }).children.length,
    ).toBe(0);
    fireEvent.click(screen.getByText("Disconnect"));
    await screen.findByText("Not connected.");
  });
  it("reports connect/send errors and handles radio errors and unmount cleanup", async () => {
    const { unmount } = render(<MeshtasticChat />);
    mock.instance.connect.mockRejectedValueOnce(new Error("No device"));
    fireEvent.click(screen.getByText("Connect Bluetooth radio"));
    await screen.findByText("No device");
    fireEvent.click(screen.getByText("Connect Bluetooth radio"));
    await screen.findByText("Radio connected and configured.");
    mock.instance.send.mockRejectedValueOnce(new Error("Write failed"));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi" },
    });
    fireEvent.click(screen.getByText("Send message"));
    await screen.findByText("Write failed");
    act(() =>
      mock.instance.onEvent({ type: "error", text: "Device disconnected" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Device disconnected");
    const instance = mock.instance;
    unmount();
    expect(instance.disconnect).toHaveBeenCalled();
    expect(() => instance.onEvent({ type: "text" })).not.toThrow();
  });
});
