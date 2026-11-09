import { useEffect, useRef, useState } from "react";
import { api, validImage } from "../utils/client";
import { API_ENDPOINTS } from "../config";
import { useProcessingNotice } from "./ProcessingNotice";

// One photo control for every upload in the app. On a phone, a single file
// input already offers "Take Photo" and "Photo Library" in the same sheet,
// like attaching an image in a chat app, so there is no separate camera
// button. On a computer it opens the file picker and also accepts a dropped
// image.
export default function UploadForm({
  onAnalysisComplete,
  enabled = false,
  recycling = false,
}) {
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const confirmNotice = useProcessingNotice("photo");
  const request = useRef(null),
    fileInput = useRef(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => request.current?.abort(), []);
  function choose(candidate) {
    setError("");
    setFile(null);
    try {
      setFile(validImage(candidate));
    } catch (e) {
      setError(e.message);
    }
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (!enabled)
        throw new Error(
          "Photo analysis is not configured. Use manual entry below.",
        );
      validImage(file);
      if (!(await confirmNotice())) return;
      const data = new FormData();
      data.append("image", file);
      request.current = new AbortController();
      setBusy(true);
      const result = await api(
        recycling ? API_ENDPOINTS.recyclables : API_ENDPOINTS.analyze,
        // Longer than the server's photo limit plus its one retry, so the
        // server's own message arrives instead of a browser timeout.
        { body: data, signal: request.current.signal, timeout: 95000 },
      );
      onAnalysisComplete(result);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="panel"
      aria-label={recycling ? "Count recycling photo" : "Analyze photo"}
    >
      <h2>{recycling ? "Count containers from a photo" : "Analyze a photo"}</h2>
      {!enabled && (
        <p role="status">
          Photo analysis is unavailable on this deployment. Manual entry works
          without it.
        </p>
      )}
      <label
        className="photo-picker"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) choose(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Add a photo"
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {preview ? (
          <img
            className="preview"
            src={preview}
            alt="Selected items for analysis"
          />
        ) : (
          <svg
            className="photo-picker-icon"
            aria-hidden="true"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
        <span className="photo-picker-title">
          {preview ? "Change photo" : "Add a photo"}
        </span>
        <span className="photo-picker-hint">
          Take one with your camera or pick one you already have. You can also
          drop an image here. JPEG, PNG or WebP, up to 5 MB.
        </span>
      </label>
      {preview && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setFile(null);
            fileInput.current.value = "";
          }}
        >
          Remove photo
        </button>
      )}
      <p>
        <a href="/privacy.html">Photo processing and privacy</a>
      </p>
      <button disabled={busy || !enabled || !file}>
        {busy ? "Analyzing…" : recycling ? "Count containers" : "Analyze photo"}
      </button>
      {busy && (
        <>
          <p role="status">Reading the photo. This can take up to a minute.</p>
          <button type="button" onClick={() => request.current?.abort()}>
            Cancel
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
