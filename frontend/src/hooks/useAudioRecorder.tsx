import { useRef, useState, useCallback } from "react";

type RecorderStatus = "idle" | "recording" | "stopped";

function pickMimeType(): string {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError("");
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        console.log("recorded:", blob.type, blob.size, "bytes, chunks:", chunksRef.current.length);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setAudioBlob(blob);
        setStatus("stopped");
      };

      recorder.start(250); // emit a chunk every 250 ms
      setStatus("recording");
    } catch (e) {
      console.log("mic error:", e);
      setError("Microphone access was denied or is unavailable.");
      setStatus("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setStatus("idle");
    setError("");
  }, []);

  return { status, audioBlob, error, startRecording, stopRecording, reset };
}