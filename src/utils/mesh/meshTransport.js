import { frame, FrameDecoder } from "./meshProtocol";
export const BLE = {
  service: "6ba1b218-15a8-461f-9fa8-5dcae273eafd",
  from: "2c55e69e-4993-11ed-b878-0242ac120002",
  to: "f75c76d2-129e-4dad-a1dd-7866124401e7",
  num: "ed9da18c-a800-4f66-a670-aa7547e34453",
};
export async function serialTransport(
  onData,
  onError,
  serial = navigator.serial,
) {
  if (!serial)
    throw new Error(
      "Web Serial is unavailable. Use a supported desktop browser over HTTPS or localhost.",
    );
  // A radio approved on this site before is reused without the picker.
  let known = [];
  try {
    known = (await serial.getPorts?.()) ?? [];
  } catch {}
  const port = known[0] ?? (await serial.requestPort());
  let reader,
    writer,
    closed = false,
    reading;
  try {
    await port.open({ baudRate: 115200 });
    if (!port.readable || !port.writable)
      throw new Error("The selected device has no serial streams.");
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    const decoder = new FrameDecoder(onData);
    reading = (async () => {
      try {
        while (!closed) {
          const { done, value } = await reader.read();
          if (done || closed) break;
          decoder.push(value);
        }
        if (!closed) onError(new Error("The serial device disconnected."));
      } catch (e) {
        if (!closed) onError(e);
      } finally {
        reader.releaseLock();
      }
    })();
    return {
      write: (bytes) => writer.write(frame(bytes)),
      close: async () => {
        closed = true;
        await reader.cancel().catch(() => {});
        await reading;
        writer.releaseLock();
        await port.close();
      },
    };
  } catch (e) {
    closed = true;
    try {
      reader?.releaseLock();
      writer?.releaseLock();
      await port.close();
    } catch {}
    throw e;
  }
}
export async function bluetoothTransport(
  onData,
  onError,
  bluetooth = navigator.bluetooth,
) {
  if (!bluetooth)
    throw new Error(
      "Web Bluetooth is unavailable in this browser. Try a supported browser or USB.",
    );
  const device = await bluetooth.requestDevice({
    filters: [{ services: [BLE.service] }],
  });
  let num,
    closed = false,
    draining = false,
    pending = false,
    readFrom;
  const disconnected = () => {
    if (!closed) onError(new Error("The Bluetooth device disconnected."));
  };
  const drain = async () => {
    if (draining) {
      pending = true;
      return;
    }
    draining = true;
    try {
      do {
        pending = false;
        let count = 0;
        while (!closed) {
          const value = await readFrom.readValue();
          if (closed || !value.byteLength) break;
          onData(
            new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
          );
          if (++count > 1024)
            throw new Error("Radio receive queue exceeded the session limit.");
        }
      } while (pending && !closed);
    } catch (e) {
      if (!closed) onError(e);
    } finally {
      draining = false;
    }
  };
  try {
    const server = await device.gatt.connect(),
      service = await server.getPrimaryService(BLE.service);
    readFrom = await service.getCharacteristic(BLE.from);
    const to = await service.getCharacteristic(BLE.to);
    num = await service.getCharacteristic(BLE.num);
    device.addEventListener("gattserverdisconnected", disconnected);
    num.addEventListener("characteristicvaluechanged", drain);
    await num.startNotifications();
    return {
      write: async (bytes) => {
        await to.writeValueWithResponse(bytes);
        await drain();
      },
      close: async () => {
        closed = true;
        num.removeEventListener("characteristicvaluechanged", drain);
        device.removeEventListener("gattserverdisconnected", disconnected);
        try {
          await num.stopNotifications();
        } catch {}
        device.gatt.disconnect();
      },
    };
  } catch (e) {
    closed = true;
    num?.removeEventListener("characteristicvaluechanged", drain);
    device.removeEventListener("gattserverdisconnected", disconnected);
    device.gatt?.disconnect();
    throw e;
  }
}
