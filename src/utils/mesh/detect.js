import { useEffect, useState } from "react";

// Decides when the mesh screen is worth showing. Most people never own a
// Meshtastic radio, so the screen stays out of the way until one of these is
// true:
//   - the device is offline, which is when a radio matters;
//   - a radio this site was given access to before is plugged in (browsers
//     only report ports the person already approved, so this needs no prompt);
//   - the person turned it on in Settings.
// Browsers with neither Web Serial nor Web Bluetooth (every iPhone browser)
// can never talk to a radio, so there it never appears.
export function useMeshAvailability(nav = navigator, win = window) {
  const supported = Boolean(nav.serial || nav.bluetooth);
  const [offline, setOffline] = useState(() => nav.onLine === false),
    [radio, setRadio] = useState(false),
    [detected, setDetected] = useState(false);

  useEffect(() => {
    const online = () => setOffline(false),
      gone = () => setOffline(true);
    win.addEventListener("online", online);
    win.addEventListener("offline", gone);
    return () => {
      win.removeEventListener("online", online);
      win.removeEventListener("offline", gone);
    };
  }, [win]);

  useEffect(() => {
    const serial = nav.serial;
    if (!serial?.getPorts) return;
    let live = true;
    const check = () =>
      serial.getPorts().then(
        (ports) => live && setRadio(ports.length > 0),
        () => live && setRadio(false),
      );
    const plugged = () => {
      setDetected(true);
      check();
    };
    const unplugged = () => {
      setDetected(false);
      check();
    };
    check();
    serial.addEventListener?.("connect", plugged);
    serial.addEventListener?.("disconnect", unplugged);
    return () => {
      live = false;
      serial.removeEventListener?.("connect", plugged);
      serial.removeEventListener?.("disconnect", unplugged);
    };
  }, [nav]);

  return { supported, offline, radio, detected };
}
