import { useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import VoiceRecorder from "../components/VoiceRecorder";
import { login, verifyVoice } from "../services/api";

const PHRASES = [
  "The quick brown fox jumps over the lazy dog near the quiet river, while seven bright lanterns glow beside the old wooden bridge.",
  "My voice is my password, so please verify me. Every morning I walk to the market, buy fresh fruit, and watch the sun rise over the hills.",
  "Clear skies and gentle winds make a perfect afternoon for reading a good book, drinking warm tea, and talking with old friends.",
];

export default function SignIn() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phrase] = useState(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)]
  );

  const handleStage1 = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (!data.voice_enrolled) {
        setError("No voice is enrolled for this account. Please sign up again.");
        return;
      }
      setPendingToken(data.pending_token);
      setStage(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async (blob: Blob) => {
    setError("");
    setVerifying(true);
    try {
      const data = await verifyVoice(pendingToken, blob);
      sessionStorage.setItem("session_token", data.session_token);
      navigate("/success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      if (message.includes("expired")) {
        // pending token only lasts 5 minutes: go back to the password step
        setStage(1);
        setPendingToken("");
        setError("Your login expired. Please sign in again.");
      } else {
        setError(message + " Try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Sign In</h1>

        {stage === 1 && (
          <form onSubmit={handleStage1} style={styles.form}>
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
              {loading ? "Checking..." : "Next: Voice Verification"}
            </button>
            <p>
              No account? <Link to="/signup">Sign up</Link>
            </p>
          </form>
        )}

        {stage === 2 && (
          <div style={styles.form}>
            <h3>Voice verification</h3>
            <p>Read this sentence aloud at a natural pace:</p>
            <p style={styles.prompt}>"{phrase}"</p>

            {!verifying && (
              <VoiceRecorder
                onSubmit={handleVoice}
                submitLabel="Verify"
                maxSeconds={20}
              />
            )}
            {verifying && <p>Verifying your voice...</p>}
            {error && <p style={styles.error}>{error}</p>}

            <button
              style={styles.linkButton}
              onClick={() => {
                setStage(1);
                setError("");
              }}
            >
              Back
            </button>
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
  linkButton: {
    background: "none",
    border: "none",
    color: "#4f46e5",
    cursor: "pointer",
    fontSize: 14,
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