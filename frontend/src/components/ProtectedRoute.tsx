import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getMe } from "../services/api";

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    const token = sessionStorage.getItem("session_token");
    if (!token) {
      setStatus("denied");
      return;
    }

    getMe(token)
      .then(() => setStatus("ok"))
      .catch(() => {
        // token is invalid or expired: clear it and send them to sign in
        sessionStorage.removeItem("session_token");
        setStatus("denied");
      });
  }, []);

  if (status === "loading") return <p style={{ padding: "2rem" }}>Checking your session...</p>;
  if (status === "denied") return <Navigate to="/signin" replace />;
  return <>{children}</>;
}