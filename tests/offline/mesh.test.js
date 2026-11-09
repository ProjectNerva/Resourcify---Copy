import { describe, it, expect, vi, afterEach } from "vitest";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { Mesh, Portnums } from "@meshtastic/protobufs";
import {
  frame,
  FrameDecoder,
  encodeConfig,
  encodeText,
  decodeRadio,
} from "../../src/utils/mesh/meshProtocol";
import { MeshClient } from "../../src/utils/mesh/meshClient";
import {
  serialTransport,
  bluetoothTransport,
  BLE,
} from "../../src/utils/mesh/meshTransport";
const radio = (payloadVariant) =>
  toBinary(
    Mesh.FromRadioSchema,
    create(Mesh.FromRadioSchema, { payloadVariant }),
  );
const textPacket = (id = 1) =>
  radio({
    case: "packet",
    value: create(Mesh.MeshPacketSchema, {
      id,
      from: 42,
      payloadVariant: {
        case: "decoded",
        value: create(Mesh.DataSchema, {
          portnum: Portnums.PortNum.TEXT_MESSAGE_APP,
          payload: new TextEncoder().encode("Hello"),
        }),
      },
    }),
  });
afterEach(() => vi.useRealTimers());
describe("Meshtastic wire protocol", () => {
  it("frames bytes and reconstructs split/coalesced packets after noisy serial data", () => {
    const onFrame = vi.fn(),
      decoder = new FrameDecoder(onFrame),
      bytes = frame(new Uint8Array([1, 2, 3]));
    expect([...bytes]).toEqual([148, 195, 0, 3, 1, 2, 3]);
    decoder.push(new Uint8Array([65, 66, 148, 195, 255, 255]));
    decoder.push(bytes.slice(0, 3));
    decoder.push(new Uint8Array([...bytes.slice(3), ...bytes]));
    expect(onFrame).toHaveBeenCalledTimes(2);
    expect([...onFrame.mock.calls[0][0]]).toEqual([1, 2, 3]);
    expect(() => frame(new Uint8Array())).toThrow();
    expect(() => frame(new Uint8Array(513))).toThrow();
  });
  it("uses real ToRadio protobuf, broadcast destination, UTF-8 payload and channel", () => {
    const config = fromBinary(Mesh.ToRadioSchema, encodeConfig(123));
    expect(config.payloadVariant).toEqual({ case: "wantConfigId", value: 123 });
    const result = fromBinary(Mesh.ToRadioSchema, encodeText(" Hello ", 9, 2))
      .payloadVariant.value;
    expect(result.to).toBe(0xffffffff);
    expect(result.channel).toBe(2);
    expect(result.wantAck).toBe(true);
    expect(new TextDecoder().decode(result.payloadVariant.value.payload)).toBe(
      "Hello",
    );
  });
  it.each([
    ["", 0],
    ["a".repeat(201), 0],
    ["😀".repeat(51), 0],
    ["Hi", 8],
    ["Hi", 1.5],
  ])("enforces text and channel bounds", (text, channel) =>
    expect(() => encodeText(text, 1, channel)).toThrow(),
  );
  it("decodes configuration, text, queue status, acknowledgements and ignores telemetry", () => {
    expect(decodeRadio(radio({ case: "configCompleteId", value: 3 }))).toEqual({
      type: "ready",
      id: 3,
    });
    expect(decodeRadio(textPacket())).toMatchObject({
      type: "text",
      from: 42,
      text: "Hello",
    });
    expect(decodeRadio(radio({ case: "rebooted", value: true }))).toEqual({
      type: "reboot",
    });
    expect(
      decodeRadio(
        radio({
          case: "queueStatus",
          value: create(Mesh.QueueStatusSchema, { res: 1, meshPacketId: 9 }),
        }),
      ),
    ).toMatchObject({ type: "queue", error: 1, id: 9 });
    expect(
      decodeRadio(
        radio({ case: "myInfo", value: create(Mesh.MyNodeInfoSchema) }),
      ),
    ).toBeNull();
    const payload = toBinary(
      Mesh.RoutingSchema,
      create(Mesh.RoutingSchema, {
        variant: { case: "errorReason", value: 0 },
      }),
    );
    expect(
      decodeRadio(
        radio({
          case: "packet",
          value: create(Mesh.MeshPacketSchema, {
            payloadVariant: {
              case: "decoded",
              value: create(Mesh.DataSchema, {
                portnum: Portnums.PortNum.ROUTING_APP,
                requestId: 3,
                payload,
              }),
            },
          }),
        }),
      ),
    ).toEqual({ type: "ack", id: 3, error: 0 });
    expect(
      decodeRadio(
        radio({ case: "packet", value: create(Mesh.MeshPacketSchema) }),
      ),
    ).toBeNull();
  });
});
describe("radio lifecycle", () => {
  it("ignores old transport callbacks after reconnect and reports current disconnects", async () => {
    const callbacks = [],
      events = vi.fn();
    const client = new MeshClient(events, {
      serial: async (data, error) => {
        callbacks.push({ data, error });
        return { write: vi.fn(), close: vi.fn() };
      },
    });
    await client.connect("serial");
    await client.connect("serial");
    callbacks[1].data(
      radio({ case: "configCompleteId", value: client.configId }),
    );
    callbacks[0].error(new Error("old disconnect"));
    callbacks[0].data(textPacket());
    expect(client.ready).toBe(true);
    expect(events.mock.calls.some(([e]) => e.type === "text")).toBe(false);
    callbacks[1].error(new Error("current disconnect"));
    expect(client.ready).toBe(false);
    expect(events).toHaveBeenCalledWith({
      type: "error",
      text: "current disconnect",
    });
    await client.disconnect();
  });
  it("requires matching configuration before send, deduplicates messages and closes on disconnect", async () => {
    let receive;
    const transport = {
        write: vi.fn().mockResolvedValue(),
        close: vi.fn().mockResolvedValue(),
      },
      events = vi.fn();
    const client = new MeshClient(events, {
      serial: async (callback) => {
        receive = callback;
        return transport;
      },
    });
    await expect(client.send("Hi")).rejects.toThrow("Connect");
    await client.connect("serial");
    receive(radio({ case: "configCompleteId", value: client.configId + 1 }));
    expect(client.ready).toBe(false);
    receive(radio({ case: "configCompleteId", value: client.configId }));
    expect(client.ready).toBe(true);
    await client.send("Hi", 0);
    expect(transport.write).toHaveBeenCalledTimes(2);
    receive(textPacket());
    receive(textPacket());
    expect(events.mock.calls.filter(([e]) => e.type === "text")).toHaveLength(
      1,
    );
    await client.disconnect();
    expect(transport.close).toHaveBeenCalledOnce();
    expect(client.ready).toBe(false);
  });
  it("surfaces failed connection and write, invalid packets and reboot", async () => {
    const events = vi.fn(),
      transport = { write: vi.fn(), close: vi.fn() };
    const client = new MeshClient(events, { serial: async () => transport });
    await expect(client.connect("unknown")).rejects.toThrow();
    transport.write.mockRejectedValueOnce(new Error("write failed"));
    await expect(client.connect("serial")).rejects.toThrow("write failed");
    await client.connect("serial");
    client.receive(new Uint8Array([255]));
    expect(events).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning" }),
    );
    client.receive(radio({ case: "rebooted", value: true }));
    await Promise.resolve();
    expect(client.ready).toBe(false);
  });
  it("times out absent radio configuration and closes failed transport", async () => {
    vi.useFakeTimers();
    const events = vi.fn(),
      transport = {
        write: vi.fn(),
        close: vi.fn().mockRejectedValue(new Error("close")),
      };
    const client = new MeshClient(events, {
      serial: async () => transport,
      timeout: 100,
    });
    await client.connect("serial");
    await vi.advanceTimersByTimeAsync(101);
    expect(events.mock.calls.some(([e]) => e.text?.includes("timed out"))).toBe(
      true,
    );
    expect(
      events.mock.calls.some(([e]) => e.text?.includes("close cleanly")),
    ).toBe(true);
  });
  it("closes a connection selected after the session was cleared", async () => {
    let resolve;
    const transport = { write: vi.fn(), close: vi.fn() },
      client = new MeshClient(() => {}, {
        serial: () => new Promise((r) => (resolve = r)),
      });
    const connect = client.connect("serial");
    await Promise.resolve();
    await client.disconnect();
    resolve(transport);
    await connect;
    expect(transport.close).toHaveBeenCalledOnce();
    expect(transport.write).not.toHaveBeenCalled();
  });
});
describe("browser transports", () => {
  it("releases serial streams even when cancellation fails after device removal", async () => {
    const errors = vi.fn(),
      reader = {
        read: vi.fn().mockRejectedValue(new Error("unplugged")),
        cancel: vi.fn().mockRejectedValue(new Error("already closed")),
        releaseLock: vi.fn(),
      },
      writer = { write: vi.fn(), releaseLock: vi.fn() };
    const port = {
      open: vi.fn(),
      close: vi.fn(),
      readable: { getReader: () => reader },
      writable: { getWriter: () => writer },
    };
    const transport = await serialTransport(vi.fn(), errors, {
      requestPort: async () => port,
    });
    await Promise.resolve();
    expect(errors).toHaveBeenCalledWith(
      expect.objectContaining({ message: "unplugged" }),
    );
    await transport.close();
    expect(reader.releaseLock).toHaveBeenCalledOnce();
    expect(writer.releaseLock).toHaveBeenCalledOnce();
    expect(port.close).toHaveBeenCalledOnce();
  });
  it("reads framed serial protobuf and closes reader/writer/port in order", async () => {
    const onData = vi.fn(),
      onError = vi.fn();
    let finish;
    const reader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: frame(new Uint8Array([1, 2])),
          })
          .mockImplementation(() => new Promise((r) => (finish = r))),
        cancel: vi.fn(async () => finish?.({ done: true })),
        releaseLock: vi.fn(),
      },
      writer = { write: vi.fn(), releaseLock: vi.fn() },
      port = {
        open: vi.fn(),
        close: vi.fn(),
        readable: { getReader: () => reader },
        writable: { getWriter: () => writer },
      };
    const transport = await serialTransport(onData, onError, {
      requestPort: async () => port,
    });
    await Promise.resolve();
    await transport.write(new Uint8Array([3]));
    expect(onData).toHaveBeenCalledWith(new Uint8Array([1, 2]));
    expect([...writer.write.mock.calls[0][0]]).toEqual([148, 195, 0, 1, 3]);
    await transport.close();
    expect(port.close).toHaveBeenCalledOnce();
    expect(reader.releaseLock).toHaveBeenCalled();
    expect(writer.releaseLock).toHaveBeenCalled();
  });
  it("reuses a radio approved before instead of opening the picker", async () => {
    const reader = {
        read: vi.fn(() => new Promise(() => {})),
        cancel: vi.fn(async () => {}),
        releaseLock: vi.fn(),
      },
      writer = { write: vi.fn(), releaseLock: vi.fn() },
      port = {
        open: vi.fn(),
        close: vi.fn(),
        readable: { getReader: () => reader },
        writable: { getWriter: () => writer },
      },
      requestPort = vi.fn();
    await serialTransport(vi.fn(), vi.fn(), {
      getPorts: async () => [port],
      requestPort,
    });
    expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(requestPort).not.toHaveBeenCalled();
    // A browser that refuses to list ports falls back to the picker.
    const picked = { ...port, open: vi.fn() };
    await serialTransport(vi.fn(), vi.fn(), {
      getPorts: async () => {
        throw new Error("blocked");
      },
      requestPort: async () => picked,
    });
    expect(picked.open).toHaveBeenCalled();
  });
  it("reports missing browser support and unusable ports", async () => {
    await expect(
      serialTransport(
        () => {},
        () => {},
        null,
      ),
    ).rejects.toThrow("unavailable");
    await expect(
      bluetoothTransport(
        () => {},
        () => {},
        null,
      ),
    ).rejects.toThrow("unavailable");
    const port = { open: vi.fn(), close: vi.fn() };
    await expect(
      serialTransport(
        () => {},
        () => {},
        { requestPort: async () => port },
      ),
    ).rejects.toThrow("no serial streams");
    expect(port.close).toHaveBeenCalled();
  });
  it("uses the official BLE characteristics and drains protobuf reads after writing", async () => {
    const onData = vi.fn(),
      onError = vi.fn(),
      listeners = {};
    const from = {
        readValue: vi
          .fn()
          .mockResolvedValueOnce(new DataView(new Uint8Array([1, 2]).buffer))
          .mockResolvedValue(new DataView(new ArrayBuffer(0))),
      },
      to = { writeValueWithResponse: vi.fn() },
      num = {
        startNotifications: vi.fn(),
        stopNotifications: vi.fn(),
        addEventListener: vi.fn((n, f) => (listeners[n] = f)),
        removeEventListener: vi.fn(),
      };
    const service = {
        getCharacteristic: vi.fn(
          async (id) =>
            ({ [BLE.from]: from, [BLE.to]: to, [BLE.num]: num })[id],
        ),
      },
      device = {
        gatt: {
          connect: async () => ({
            getPrimaryService: async (id) => {
              expect(id).toBe(BLE.service);
              return service;
            },
          }),
          disconnect: vi.fn(),
        },
        addEventListener: vi.fn((n, f) => (listeners[n] = f)),
        removeEventListener: vi.fn(),
      };
    const transport = await bluetoothTransport(onData, onError, {
      requestDevice: async () => device,
    });
    await transport.write(new Uint8Array([9]));
    expect(to.writeValueWithResponse).toHaveBeenCalledWith(new Uint8Array([9]));
    expect(onData).toHaveBeenCalledWith(new Uint8Array([1, 2]));
    expect(num.startNotifications).toHaveBeenCalled();
    await listeners.characteristicvaluechanged();
    listeners.gattserverdisconnected();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "The Bluetooth device disconnected.",
      }),
    );
    await transport.close();
    onError.mockClear();
    listeners.gattserverdisconnected();
    expect(onError).not.toHaveBeenCalled();
    expect(device.gatt.disconnect).toHaveBeenCalled();
    expect(num.removeEventListener).toHaveBeenCalled();
  });
});
