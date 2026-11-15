import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../services/api";

export default function Success() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("session_token");
    if (!token) return;
    getMe(token)
      .then(setUser)
      .catch(() => navigate("/signin"));
  }, [navigate]);

  const handleSignOut = () => {
    sessionStorage.removeItem("session_token");
    navigate("/signin");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.check}>✓</div>
        <h1>Signed in successfully</h1>
        {user && (
          <p>
            Welcome, <strong>{user.username}</strong>
            <br />
            <span style={{ color: "#555" }}>{user.email}</span>
          </p>
        )}
        <p>Password and voice verification both passed.</p>
        <button style={styles.button} onClick={handleSignOut}>
          Sign out
        </button>
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
    textAlign: "center",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    color: "#111",
  },
  check: {
    width: 64,
    height: 64,
    lineHeight: "64px",
    borderRadius: "50%",
    background: "#16a34a",
    color: "#fff",
    fontSize: 32,
    margin: "0 auto 1rem",
  },
  button: {
    padding: "0.7rem 1.5rem",
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontSize: 15,
    cursor: "pointer",
  },
};