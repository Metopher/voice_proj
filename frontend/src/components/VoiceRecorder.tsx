import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

type Props = {
  onSubmit: (blob: Blob) => void;
  submitLabel?: string;
  maxSeconds?: number;
  disabled?: boolean;
};

export default function VoiceRecorder({
  onSubmit,
  submitLabel = "Use this recording",
  maxSeconds = 10,
  disabled = false,
}: Props) {
  const { status, audioBlob, error, startRecording, stopRecording, reset } =
    useAudioRecorder();
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");

  // timer while recording, auto-stops at maxSeconds
  useEffect(() => {
    if (status !== "recording") return;
    setSeconds(0);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= maxSeconds) {
          stopRecording();
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status, maxSeconds, stopRecording]);

  // create a playback URL for the recorded blob, and clean it up
  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  return (
    <div style={styles.box}>
      {status === "idle" && (
        <button
          style={styles.recordBtn}
          onClick={startRecording}
          disabled={disabled}
        >
          🎤 Start recording
        </button>
      )}

      {status === "recording" && (
        <>
          <p style={styles.timer}>
            Recording... {seconds}s / {maxSeconds}s
          </p>
          <button style={styles.stopBtn} onClick={stopRecording}>
            ⏹ Stop
          </button>
        </>
      )}

      {status === "stopped" && audioUrl && (
        <>
          <audio controls src={audioUrl} style={{ width: "100%" }} />
          <button
            style={styles.submitBtn}
            onClick={() => audioBlob && onSubmit(audioBlob)}
            disabled={disabled}
          >
            {submitLabel}
          </button>
          <button style={styles.linkBtn} onClick={reset}>
            Re-record
          </button>
        </>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    alignItems: "stretch",
  },
  recordBtn: {
    padding: "0.7rem",
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
  stopBtn: {
    padding: "0.7rem",
    borderRadius: 6,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
  submitBtn: {
    padding: "0.7rem",
    borderRadius: 6,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#4f46e5",
    cursor: "pointer",
    fontSize: 14,
  },
  timer: { margin: 0, textAlign: "center", color: "#dc2626" },
  error: { color: "#dc2626", fontSize: 13, margin: 0 },
};