// VoiceRecorder.jsx — "Record a voice note" for a task: often faster than writing the brief or
// the question. Records with the browser's MediaRecorder (WebM/Ogg Opus, or MP4 on Safari),
// stops by itself at 5 minutes (~2–3 MB, under the 5 MB attachment limit) and hands a File to
// onDone(file) — Attachments.jsx uploads it like any other file.
import { useEffect, useRef, useState } from "react";
import { SHARED_COPY } from "../../lib/team";
import { MicIcon } from "./icons";

const MAX_SECONDS = 300;
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };

export const canRecord = () => typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);

export default function VoiceRecorder({ lang, onDone, onError, className }) {
  const c = SHARED_COPY[lang];
  const [seconds, setSeconds] = useState(null); // null = not recording
  const rec = useRef(null);

  // Stop the microphone if the window closes mid-recording.
  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const start = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onError(c.micBlocked);
    }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(rec.current?.timer);
      rec.current = null;
      setSeconds(null);
      const type = (recorder.mimeType || "audio/webm").split(";")[0];
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      if (chunks.length) onDone(new File(chunks, `voice-note-${stamp}.${EXT[type] || "webm"}`, { type }));
    };
    recorder.start(1000);
    const begun = Date.now();
    const timer = setInterval(() => {
      const s = Math.round((Date.now() - begun) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) recorder.stop();
    }, 500);
    rec.current = { recorder, stream, timer };
    setSeconds(0);
  };

  return seconds === null
    ? <button type="button" className={className} onClick={start}><MicIcon size={15} /> {c.record}</button>
    : (
      <button type="button" className={`${className} is-recording`} onClick={() => rec.current?.recorder.stop()}>
        <span className="tm-rec-dot" aria-hidden="true" /> {c.recording(seconds)} · {c.stopRec}
      </button>
    );
}
