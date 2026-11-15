# Voice Authenticator

A web app with two-factor login: **password first, then your voice**.

- **Sign up:** create an account, then record 3 voice samples to enroll your voiceprint.
- **Sign in:** enter your email and password, then read a short sentence aloud to verify your voice.
- **Success page:** only opens for a user who passed both steps, and the backend checks this.

This is a learning project, not production security. See [Limitations](#limitations).

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React + TypeScript (Vite), React Router |
| Backend | Python, Flask, Flask-CORS |
| Database | MongoDB Atlas (PyMongo) |
| Voice model | [Resemblyzer](https://github.com/resemble-ai/Resemblyzer) |
| Audio conversion | ffmpeg |
| Sessions | JWT (PyJWT) |

## How it works

**Enrollment.** The browser records 3 samples. The backend converts each one to 16 kHz mono WAV with ffmpeg, trims silence, and turns it into a 256-number embedding with Resemblyzer. The three embeddings are averaged into one voiceprint and saved in MongoDB. The raw audio is deleted right after processing.

**Verification.** The backend turns the login recording into an embedding the same way and compares it with the stored voiceprint using cosine similarity. If the score is at or above the threshold, the login succeeds.

**Tokens.** Three short-lived JWTs, each with a `purpose`, connect the steps:

| Token | Lifetime | Issued by | Accepted by |
|---|---|---|---|
| `enroll` | 15 min | `/register` | `/enroll-voice` |
| `pending` | 5 min | `/login` (password correct) | `/verify-voice` |
| `session` | 60 min | `/verify-voice` (voice matched) | `/me` |

## API endpoints

| Method | Endpoint | Needs | Purpose |
|---|---|---|---|
| GET | `/api/health` | nothing | Connection check |
| POST | `/api/auth/register` | nothing | Create user, return enroll token |
| POST | `/api/auth/enroll-voice` | enroll token | Save voiceprint from 3 samples |
| POST | `/api/auth/login` | nothing | Check password, return pending token |
| POST | `/api/auth/verify-voice` | pending token | Compare voice, return session token |
| GET | `/api/auth/me` | session token | Return the signed-in user |

## Project structure

```
voice_proj/
  backend/
    app.py                  # Flask app, CORS, blueprints
    database.py             # MongoDB connection and collections
    routes/
      auth.py               # register, enroll-voice, login
      voice.py              # verify-voice
      session.py            # me
    services/
      voice_service.py      # embeddings, averaging, similarity
    utils/
      tokens.py             # JWT create/decode
      audio.py              # ffmpeg conversion
    threshold_test.py       # tool for choosing the voice threshold
    .env.example
  frontend/
    src/
      pages/                # SignUp, SignIn, Success
      components/           # VoiceRecorder, ProtectedRoute
      hooks/                # useAudioRecorder
      services/api.tsx      # all backend calls
    .env.example
```

## Prerequisites

- Python 3.13 (what this was built and tested on)
- Node.js and npm
- [ffmpeg](https://ffmpeg.org/) installed and on your PATH (`ffmpeg -version` should work). On Windows: `winget install Gyan.FFmpeg`, then open a new terminal.
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster with a database user, and your IP address on the Network Access list

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
```

Install the packages in this order. On Python 3.13 on Windows, `webrtcvad` (a Resemblyzer dependency) has no prebuilt package, so the prebuilt `webrtcvad-wheels` replaces it and Resemblyzer is installed without its own dependency list:

```bash
pip install webrtcvad-wheels
pip install resemblyzer --no-deps
pip install flask flask-cors python-dotenv pymongo dnspython pyjwt numpy scipy librosa numba torch tqdm
```

`requirements.txt` is a snapshot of the exact versions used. Because of the `webrtcvad` issue above, use the commands above for a fresh install instead of `pip install -r requirements.txt`.

Create your environment file:

```bash
copy .env.example .env
```

Then fill in `backend/.env`:

| Variable | Value |
|---|---|
| `MONGO_URI` | Your Atlas connection string, with your real password in it |
| `DB_NAME` | `voice_auth` |
| `JWT_SECRET` | A long random string. Generate one with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `VOICE_THRESHOLD` | Minimum similarity score to pass, such as `0.78`. If missing, the code falls back to `0.75`. |

The threshold is read once at startup, so restart Flask after changing it.

### 2. Frontend

```bash
cd frontend
copy .env.example .env
npm install
```

`frontend/.env` should contain `VITE_API_URL=http://localhost:5000/api`. Vite reads it at startup, so restart `npm run dev` after changing it.

## Running

Use two terminals and leave both open.

**Terminal 1: backend**

```bash
cd backend
venv\Scripts\activate
python app.py
```

Wait for `Running on http://127.0.0.1:5000`. The first start takes a few seconds while the voice model loads.

**Terminal 2: frontend**

```bash
cd frontend
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). The microphone only works on `localhost` or HTTPS.

MongoDB runs in Atlas, so there is nothing to start locally. If the backend can't connect, check that your current IP is on the Atlas Network Access list.

## Choosing the voice threshold

The threshold must sit between how you score against yourself and how other people score against you. `backend/threshold_test.py` measures both. Create this folder layout locally (it is git-ignored because it holds voice recordings):

```
backend/test_audio/
  enroll/      3 clips of you, simulating sign up
  genuine/     6+ more clips of you in varied conditions
  impostor/    clips of other people, ideally on the same microphone
```

Then run:

```bash
cd backend
python threshold_test.py
```

It prints the score of every clip, the false-reject and false-accept rates at each threshold, and a suggested value to put in `.env`. Use clips of 10 seconds or more of continuous speech. Short or very different recordings give unreliable scores.

## Data stored in MongoDB

| Collection | Contents |
|---|---|
| `users` | username, email, password hash, `voice_enrolled`, created date |
| `voiceprints` | user id and the 256-number embedding |
| `auth_logs` | every voice attempt: user id, score, pass/fail, IP, timestamp |

Raw passwords and raw audio are never stored.

## Limitations

- **Replay attacks.** A recording of your voice can pass the check. The sentence shown on screen is displayed but not verified. Fixing this needs speech-to-text to confirm the user said the displayed phrase.
- **Voice cloning.** Modern voice synthesis can imitate voices, so voice should only be a second factor behind the password.
- **Provisional threshold.** It was tuned on a small number of clips, and the impostor recordings were compressed phone audio, which likely makes the result look better than it is. Re-tune with more people on the same microphone.
- **No rate limiting.** Password and voice attempts are unlimited.
- **Dev-only score in the response.** `/verify-voice` returns the match score for testing. Remove the `"score"` line in `backend/routes/voice.py` before any real deployment.
- **Token storage.** The session token lives in `sessionStorage`. A production app would use an httpOnly cookie.
