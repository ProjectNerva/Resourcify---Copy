import { encodeConfig, encodeText, decodeRadio } from "./meshProtocol";
import { serialTransport, bluetoothTransport } from "./meshTransport";
export class MeshClient {
  constructor(
    onEvent,
    {
      serial = serialTransport,
      bluetooth = bluetoothTransport,
      timeout = 15000,
    } = {},
  ) {
    this.onEvent = onEvent;
    this.factories = { serial, bluetooth };
    this.timeout = timeout;
    this.transport = null;
    this.ready = false;
    this.generation = 0;
    this.seen = new Set();
  }
  async connect(kind) {
    await this.disconnect();
    const generation = ++this.generation;
    if (!this.factories[kind]) throw new Error("Unknown radio transport.");
    this.onEvent({
      type: "status",
      text: "Select a radio, then wait for its configuration.",
    });
    try {
      const transport = await this.factories[kind](
        (bytes) => {
          if (generation === this.generation) this.receive(bytes);
        },
        (error) => {
          if (generation === this.generation) this.fail(error);
        },
      );
      if (generation !== this.generation) {
        await transport.close();
        return;
      }
      this.transport = transport;
      this.configId = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
      this.timer = setTimeout(
        () =>
          this.fail(
            new Error(
              "Radio configuration timed out. Check firmware and connection.",
            ),
          ),
        this.timeout,
      );
      await transport.write(encodeConfig(this.configId));
    } catch (e) {
      if (generation === this.generation) {
        await this.disconnect();
        throw e;
      }
    }
  }
  receive(bytes) {
    try {
      const event = decodeRadio(bytes);
      if (!event) return;
      if (event.type === "ready") {
        if (event.id !== this.configId) return;
        clearTimeout(this.timer);
        this.ready = true;
        this.onEvent({
          type: "status",
          text: "Radio connected and configured.",
        });
        return;
      }
      if (event.type === "reboot") {
        this.fail(new Error("The radio restarted. Reconnect to continue."));
        return;
      }
      if (event.type === "text") {
        const key = `${event.from}:${event.id}`;
        if (this.seen.has(key)) return;
        this.seen.add(key);
        if (this.seen.size > 100)
          this.seen.delete(this.seen.values().next().value);
      }
      this.onEvent(event);
    } catch {
      this.onEvent({
        type: "warning",
        text: "An unreadable radio packet was ignored.",
      });
    }
  }
  async send(text, channel = 0) {
    if (!this.ready || !this.transport)
      throw new Error("Connect and configure a radio before sending.");
    const id = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    await this.transport.write(encodeText(text, id, channel));
    return id; // A transport write is not proof that another person received it.
  }
  fail(error) {
    this.onEvent({ type: "error", text: error.message });
    void this.disconnect();
  }
  async disconnect() {
    this.generation++;
    clearTimeout(this.timer);
    this.ready = false;
    this.seen.clear();
    const transport = this.transport;
    this.transport = null;
    if (transport) {
      try {
        await transport.close();
      } catch {
        this.onEvent({
          type: "error",
          text: "The device did not close cleanly. Unplug it before reconnecting.",
        });
      }
    }
  }
}
