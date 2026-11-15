import os
import sys
from services.voice_service import embed_from_bytes, average_embeddings, similarity

AUDIO_EXT = (".mp3", ".wav", ".m4a", ".webm", ".ogg", ".mp4", ".flac")
BASE = "test_audio"


def embeds_in(folder):
    path = os.path.join(BASE, folder)
    results = []
    for name in sorted(os.listdir(path)):
        if not name.lower().endswith(AUDIO_EXT):
            continue
        try:
            with open(os.path.join(path, name), "rb") as f:
                results.append((name, embed_from_bytes(f.read())))
        except ValueError as e:
            print(f"  skipped {folder}/{name}: {e}")
    return results


enroll = embeds_in("enroll")
if len(enroll) < 3:
    sys.exit("Need at least 3 usable clips in test_audio/enroll")

# same method the app uses at sign up
voiceprint = average_embeddings([e for _, e in enroll])

genuine = [(n, similarity(voiceprint, e)) for n, e in embeds_in("genuine")]
impostor = [(n, similarity(voiceprint, e)) for n, e in embeds_in("impostor")]

if not genuine or not impostor:
    sys.exit("Need clips in both test_audio/genuine and test_audio/impostor")

print("\nGENUINE (you, should score HIGH):")
for n, s in genuine:
    print(f"  {s:.3f}  {n}")

print("\nIMPOSTOR (others, should score LOW):")
for n, s in impostor:
    print(f"  {s:.3f}  {n}")

g = [s for _, s in genuine]
i = [s for _, s in impostor]
print(f"\nGenuine  min={min(g):.3f}  mean={sum(g)/len(g):.3f}  max={max(g):.3f}")
print(f"Impostor min={min(i):.3f}  mean={sum(i)/len(i):.3f}  max={max(i):.3f}")

print("\nthreshold   FRR (you rejected)   FAR (impostor accepted)")
rows = []
t = 0.50
while t <= 0.95:
    frr = sum(1 for s in g if s < t) / len(g)
    far = sum(1 for s in i if s >= t) / len(i)
    print(f"  {t:.3f}      {frr:6.1%}               {far:6.1%}")
    # weigh false accepts double: letting a stranger in is worse than a retry
    rows.append((frr + 2 * far, t))
    t += 0.025

# among all thresholds tied for the lowest error, take the middle one
# (not the edge), so there is margin on both sides
lowest = min(c for c, _ in rows)
zone = [t for c, t in rows if abs(c - lowest) < 1e-9]
suggested = zone[len(zone) // 2]
print(f"\nBest zone: {zone[0]:.3f} to {zone[-1]:.3f}")
print(f"Suggested threshold (middle of zone): {suggested:.3f}")

if min(g) <= max(i):
    print("WARNING: the ranges overlap. No threshold separates you cleanly.")
    print("Record longer clips, use matching conditions, or add more samples.")