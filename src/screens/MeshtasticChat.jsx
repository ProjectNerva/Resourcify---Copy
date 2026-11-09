import { useEffect, useRef, useState } from "react";
import { useProcessingNotice } from "../components/ProcessingNotice";
import { MeshClient } from "../utils/mesh/meshClient";
import { MAX_TEXT_BYTES } from "../utils/mesh/meshProtocol";
export default function MeshtasticChat() {
  const [status, setStatus] = useState("Not connected."),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [messages, setMessages] = useState([]),
    [channel, setChannel] = useState("0"),
    [busy, setBusy] = useState(false);
  const confirmNotice = useProcessingNotice("radio");
  const client = useRef(null);
  useEffect(() => {
    client.current = new MeshClient((event) => {
      if (event.type === "status") setStatus(event.text);
      else if (event.type === "warning") setError(event.text);
      else if (event.type === "error") {
        setError(event.text);
        setStatus("Not connected.");
      } else if (event.type === "text")
        setMessages((old) => [
          ...old.slice(-99),
          {
            id: event.id,
            from: `Node ${event.from.toString(16)}`,
            text: event.text,
            status: "Received",
          },
        ]);
      else if (event.type === "ack" || event.type === "queue")
        setMessages((old) =>
          old.map((m) =>
            m.id === event.id
              ? {
                  ...m,
                  status: event.error
                    ? "Radio reported a routing error"
                    : event.type === "ack"
                      ? "Radio acknowledgement received; human receipt unconfirmed"
                      : "Queued by radio; delivery unconfirmed",
                }
              : m,
          ),
        );
    });
    return () => {
      client.current.onEvent = () => {};
      void client.current.disconnect();
    };
  }, []);
  async function connect(kind) {
    if (!(await confirmNotice())) return;
    setError("");
    setBusy(true);
    try {
      await client.current.connect(kind);
    } catch (e) {
      setStatus("Not connected.");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const id = await client.current.send(text, Number(channel));
      setMessages((old) => [
        ...old.slice(-99),
        {
          id,
          from: "You",
          text,
          status: "Written to radio; delivery unconfirmed",
        },
      ]);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Mesh messages</h1>
      <p className="notice">
        <strong>This screen needs a Meshtastic radio.</strong> That is a small
        device, about the size of a phone charger, that sends short text
        messages to other radios nearby with no cell service and no Wi-Fi.
        Everyone in the conversation needs one. It does not share another
        phone’s internet, and it does not work phone to phone. If you do not
        have a radio, the other tools work without it.
      </p>
      <p>
        Plug the radio in with USB or connect over Bluetooth, then messages you
        type here go out on the radio’s channel. This works in Chrome on a
        computer or Android; iPhones cannot connect to radios from a website.
      </p>
      <p>
        The app keeps up to 100 messages in this tab only. Radios, other
        recipients and any radio-configured gateways can store or forward
        messages. Do not send personal or sensitive information. This is not
        emergency dispatch or an internet gateway for photos.
      </p>
      <section className="panel">
        <button
          disabled={busy || !navigator.serial}
          onClick={() => connect("serial")}
        >
          Connect USB radio
        </button>
        <button
          disabled={busy || !navigator.bluetooth}
          onClick={() => connect("bluetooth")}
        >
          Connect Bluetooth radio
        </button>
        <button
          onClick={async () => {
            await client.current.disconnect();
            setStatus("Not connected.");
          }}
        >
          Disconnect
        </button>
        {!navigator.serial && !navigator.bluetooth && (
          <p>
            This browser does not expose USB serial or Bluetooth. Use a
            supported browser with a Meshtastic device.
          </p>
        )}
        <p role="status">{status}</p>
        {error && <p role="alert">{error}</p>}
        <form onSubmit={send}>
          <label>
            Channel index (0 is primary)
            <input
              type="number"
              min="0"
              max="7"
              step="1"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />
          </label>
          <label>
            Message
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength="200"
              rows="3"
            />
          </label>
          <p>
            {new TextEncoder().encode(text.trim()).length}/{MAX_TEXT_BYTES}{" "}
            UTF-8 bytes
          </p>
          <button disabled={busy || !client.current?.ready || !text.trim()}>
            Send message
          </button>
        </form>
        <ol className="messages" aria-label="Radio messages">
          {messages.map((m, i) => (
            <li key={`${m.id}-${i}`}>
              <strong>{m.from}</strong>: {m.text}
              <p>{m.status}</p>
            </li>
          ))}
        </ol>
        <button onClick={() => setMessages([])}>Clear messages</button>
      </section>
    </>
  );
}
