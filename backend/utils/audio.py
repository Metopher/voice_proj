import os
import subprocess
import tempfile


def convert_to_wav(input_bytes: bytes) -> str:
    """
    Takes raw audio bytes (webm, mp4, ogg, wav...) and returns the path
    to a 16 kHz mono WAV file. The caller must delete the file afterwards.
    """
    in_fd, in_path = tempfile.mkstemp(suffix=".audio")
    out_fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(in_fd)
    os.close(out_fd)

    try:
        with open(in_path, "wb") as f:
            f.write(input_bytes)

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", in_path,
                "-ac", "1",
                "-ar", "16000",
                out_path,
            ],
            capture_output=True,
        )
        if result.returncode != 0:
            raise ValueError("Could not convert audio: " + result.stderr.decode(errors="ignore")[-300:])
    except Exception:
        if os.path.exists(out_path):
            os.remove(out_path)
        raise
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)

    return out_path
