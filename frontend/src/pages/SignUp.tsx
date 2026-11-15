import { useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";
import { register, enrollVoice } from "../services/api";

const PROMPTS = [
  "The quick brown fox jumps over the lazy dog near the quiet river, while seven bright lanterns glow beside the old wooden bridge.",
  "My voice is my password, so please verify me. Every morning I walk to the market, buy fresh fruit, and watch the sun rise over the hills.",
  "Clear skies and gentle winds make a perfect afternoon for reading a good book, drinking warm tea, and talking with old friends.",
];

export default function SignUp() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrollToken, setEnrollToken] = useState("");
  const [samples, setSamples] = useState<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [finished, setFinished] = useState(false);

  const handleStage1 = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !email || password.length < 6) {
      setError("Fill all fields. Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await register(username, email, password);
      setEnrollToken(data.enroll_token);
      setStage(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSample = async (blob: Blob) => {
    const updated = [...samples, blob];
    setSamples(updated);
    setError("");

    if (updated.length < PROMPTS.length) return;

    // all samples recorded: upload them
    setUploading(true);
    try {
      await enrollVoice(enrollToken, updated);
      setFinished(true);
      setTimeout(() => navigate("/signin"), 1500);
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : "Upload failed.") +
          " Please record all samples again."
      );
      setSamples([]); // start over so the user can retry
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Sign Up</h1>

        {stage === 1 && (
          <form onSubmit={handleStage1} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Next: Voice Setup"}
            </button>
            <p>
              Already have an account? <Link to="/signin">Sign in</Link>
            </p>
          </form>
        )}

        {stage === 2 && (
          <div style={styles.form}>
            <h3>Voice enrollment</h3>

            {!finished && !uploading && (
              <>
                <p>
                  Sample {samples.length + 1} of {PROMPTS.length}. Read the whole
                  sentence aloud at a natural pace.
                </p>
                <p style={styles.prompt}>"{PROMPTS[samples.length]}"</p>
                <VoiceRecorder
                  key={samples.length}
                  onSubmit={handleSample}
                  submitLabel="Save this sample"
                  maxSeconds={20}
                />
              </>
            )}

            {uploading && <p>Processing your voice, please wait...</p>}
            {finished && <p>Voice enrolled! Redirecting to sign in...</p>}
            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f3f4f6",
  },
  card: {
    background: "#fff",
    padding: "2rem",
    borderRadius: 12,
    width: 360,
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    color: "#111",
  },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  input: {
    padding: "0.6rem",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  },
  button: {
    padding: "0.7rem",
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
  prompt: {
    background: "#eef2ff",
    padding: "0.75rem",
    borderRadius: 6,
    fontStyle: "italic",
    margin: 0,
  },
  error: { color: "#dc2626", fontSize: 13, margin: 0 },
};