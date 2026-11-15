const API_URL = import.meta.env.VITE_API_URL as string;

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`);
  return handle<{ status: string; message: string }>(res);
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return handle<{ user_id: string; enroll_token: string }>(res);
}

export async function enrollVoice(enrollToken: string, samples: Blob[]) {
  const form = new FormData();
  samples.forEach((blob, i) => form.append("samples", blob, `sample${i + 1}.webm`));

  const res = await fetch(`${API_URL}/auth/enroll-voice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${enrollToken}` },
    body: form,
  });
  return handle<{ message: string }>(res);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle<{ pending_token: string; voice_enrolled: boolean }>(res);
}

export async function verifyVoice(pendingToken: string, sample: Blob) {
  const form = new FormData();
  form.append("sample", sample, "sample.webm");

  const res = await fetch(`${API_URL}/auth/verify-voice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pendingToken}` },
    body: form,
  });
  return handle<{ session_token: string; score?: number }>(res);
}

export async function getMe(sessionToken: string) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  return handle<{ username: string; email: string }>(res);
}
