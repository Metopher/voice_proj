import os
import numpy as np
from resemblyzer import VoiceEncoder, preprocess_wav
from utils.audio import convert_to_wav

# load the model once when the server starts, not on every request
encoder = VoiceEncoder()

SAMPLE_RATE = 16000
MIN_SPEECH_SECONDS = 1.5


def embed_from_bytes(audio_bytes: bytes) -> np.ndarray:
    """Raw uploaded audio -> 256-number voice embedding."""
    wav_path = convert_to_wav(audio_bytes)
    try:
        # trims silence and normalizes volume
        wav = preprocess_wav(wav_path)
    finally:
        os.remove(wav_path)

    if len(wav) / SAMPLE_RATE < MIN_SPEECH_SECONDS:
        raise ValueError("Not enough speech detected. Speak clearly for a few seconds.")

    return encoder.embed_utterance(wav)


def average_embeddings(embeds: list) -> np.ndarray:
    """Combine several enrollment embeddings into one voiceprint."""
    mean = np.mean(embeds, axis=0)
    return mean / np.linalg.norm(mean)


def similarity(a, b) -> float:
    """Cosine similarity: closer to 1.0 means more similar voices."""
    a = np.asarray(a)
    b = np.asarray(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
