import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Mesh, Portnums } from "@meshtastic/protobufs";
export const MAX_TEXT_BYTES = 200;
export function frame(payload) {
  if (!payload.length || payload.length > 512)
    throw new Error("Invalid radio frame size.");
  const result = new Uint8Array(payload.length + 4);
  result.set([0x94, 0xc3, payload.length >> 8, payload.length & 255]);
  result.set(payload, 4);
  return result;
}
export class FrameDecoder {
  constructor(onFrame) {
    this.buffer = new Uint8Array();
    this.onFrame = onFrame;
  }
  push(chunk) {
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer = combined;
    while (this.buffer.length >= 4) {
      const size = (this.buffer[2] << 8) | this.buffer[3];
      if (
        this.buffer[0] !== 0x94 ||
        this.buffer[1] !== 0xc3 ||
        !size ||
        size > 512
      ) {
        this.buffer = this.buffer.slice(1);
        continue;
      }
      if (this.buffer.length < size + 4) break;
      const payload = this.buffer.slice(4, size + 4);
      this.buffer = this.buffer.slice(size + 4);
      this.onFrame(payload);
    }
  }
}
export function encodeConfig(id) {
  return toBinary(
    Mesh.ToRadioSchema,
    create(Mesh.ToRadioSchema, {
      payloadVariant: { case: "wantConfigId", value: id },
    }),
  );
}
export function encodeText(text, id, channel = 0) {
  const payload = new TextEncoder().encode(text.trim());
  if (!payload.length || payload.length > MAX_TEXT_BYTES)
    throw new Error(`Enter 1–${MAX_TEXT_BYTES} UTF-8 bytes of text.`);
  if (!Number.isInteger(channel) || channel < 0 || channel > 7)
    throw new Error("Channel must be between 0 and 7.");
  return toBinary(
    Mesh.ToRadioSchema,
    create(Mesh.ToRadioSchema, {
      payloadVariant: {
        case: "packet",
        value: create(Mesh.MeshPacketSchema, {
          to: 0xffffffff,
          id,
          channel,
          hopLimit: 3,
          wantAck: true,
          payloadVariant: {
            case: "decoded",
            value: create(Mesh.DataSchema, {
              portnum: Portnums.PortNum.TEXT_MESSAGE_APP,
              payload,
            }),
          },
        }),
      },
    }),
  );
}
export function decodeRadio(bytes) {
  const value = fromBinary(Mesh.FromRadioSchema, bytes).payloadVariant;
  if (value.case === "configCompleteId")
    return { type: "ready", id: value.value };
  if (value.case === "rebooted") return { type: "reboot" };
  if (value.case === "queueStatus")
    return {
      type: "queue",
      id: value.value.meshPacketId,
      error: value.value.res,
    };
  if (value.case !== "packet") return null;
  const packet = value.value,
    data = packet.payloadVariant;
  if (data.case !== "decoded") return null;
  if (data.value.portnum === Portnums.PortNum.TEXT_MESSAGE_APP)
    return {
      type: "text",
      id: packet.id,
      from: packet.from,
      text: new TextDecoder().decode(data.value.payload).slice(0, 1000),
    };
  if (data.value.portnum === Portnums.PortNum.ROUTING_APP) {
    const routing = fromBinary(Mesh.RoutingSchema, data.value.payload).variant;
    return {
      type: "ack",
      id: data.value.requestId,
      error: routing.case === "errorReason" ? routing.value : 0,
    };
  }
  return null;
}
