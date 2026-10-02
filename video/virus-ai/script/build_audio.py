"""Synthesize narration (Piper/sherpa-onnx), compute timeline + lip-sync envelope, generate ambient score, mix."""
import json, glob, os
import numpy as np
import soundfile as sf
import sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_DIR = "/home/user/video/tts"
VOICE = os.environ.get("VOICE", "ruslan")
SPEED = float(os.environ.get("SPEED", "1.08"))
FPS = 30
SR = 22050
LINE_GAP = float(os.environ.get("LINE_GAP", "0.26"))
SCENE_GAP = float(os.environ.get("SCENE_GAP", "0.75"))


class _Audio:
    def __init__(self, samples, sample_rate):
        self.samples, self.sample_rate = samples, sample_rate


class ElevenLabsTTS:
    """ElevenLabs text-to-speech; raw 22.05 kHz PCM, cached per line so re-runs don't re-bill."""

    def __init__(self):
        self.key = os.environ["ELEVENLABS_API_KEY"]
        self.voice = os.environ.get("ELEVEN_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
        self.model = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
        self.cache = f"{ROOT}/script/.tts_cache"
        os.makedirs(self.cache, exist_ok=True)

    def generate(self, text, sid=0, speed=1.0):
        import hashlib, urllib.request
        speed = float(os.environ.get("ELEVEN_SPEED", "0.95"))  # ElevenLabs range 0.7–1.2
        h = hashlib.sha1(f"{self.voice}|{self.model}|{speed}|{text}".encode()).hexdigest()
        path = f"{self.cache}/{h}.pcm"
        if not os.path.exists(path):
            body = json.dumps({
                "text": text, "model_id": self.model,
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25,
                                   "use_speaker_boost": True, "speed": speed},
            }).encode()
            req = urllib.request.Request(
                f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice}?output_format=pcm_22050",
                data=body, headers={"xi-api-key": self.key, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                open(path, "wb").write(r.read())
        pcm = np.frombuffer(open(path, "rb").read(), dtype="<i2").astype(np.float32) / 32768
        return _Audio(pcm, SR)


def make_tts():
    if os.environ.get("TTS_ENGINE") == "elevenlabs":
        return ElevenLabsTTS()
    d = f"{TTS_DIR}/vits-piper-ru_RU-{VOICE}-medium"
    onnx = glob.glob(d + "/*.onnx")[0]
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=onnx, tokens=d + "/tokens.txt", data_dir=d + "/espeak-ng-data",
                noise_scale=0.62, noise_scale_w=0.75),
            num_threads=4),
        max_num_sentences=2)
    return sherpa_onnx.OfflineTts(cfg)


def trim(x, thr=0.006):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - 200): idx[-1] + 600]


def ambient(total_s, scene_spans):
    """Quiet D-minor pad with slow motion, soft tech pulse in analytic scenes, final chime."""
    n = int(total_s * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    chords = [[146.83, 220.0, 293.66, 349.23], [116.54, 174.61, 233.08, 293.66],
              [130.81, 196.0, 261.63, 329.63], [110.0, 164.81, 220.0, 277.18]]
    seg = 16.0
    for k in range(int(total_s // seg) + 2):
        ch = chords[k % 4]
        s0, s1 = int(k * seg * SR), int(min(n, (k + 1) * seg * SR + 4 * SR))
        if s0 >= n:
            break
        tt = t[s0:s1] - k * seg
        env = np.clip(tt / 4.0, 0, 1) * np.clip((seg + 4 - tt) / 4.0, 0, 1)
        for i, f in enumerate(ch):
            det = 1 + 0.0015 * np.sin(2 * np.pi * 0.07 * tt + i)
            out[s0:s1] += env * (np.sin(2 * np.pi * f * det * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + i)) / (4 + i)
    out += 0.35 * np.sin(2 * np.pi * 73.42 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t))
    inten = np.zeros(n)
    tech = {"s06": 1, "s08": 1, "s10": .7, "s11": 1, "s12": .8, "s20": .8, "s21": .6}
    for sid, a, b in scene_spans:
        if sid in tech:
            inten[int(a * SR):int(b * SR)] = tech[sid]
    k = int(1.5 * SR)
    inten = np.convolve(inten, np.ones(k) / k, mode="same")
    beat = (t * 2.0) % 1.0
    out += np.exp(-beat * 18) * np.sin(2 * np.pi * 587.33 * t) * 0.25 * inten
    if scene_spans:
        fa = scene_spans[-1][1] - 4.5
        i0 = int(fa * SR)
        tt = t[i0:] - fa
        for f, a in [(587.33, 1), (880, .6), (1174.66, .4), (293.66, .8)]:
            out[i0:] += a * np.exp(-tt * 0.9) * np.sin(2 * np.pi * f * tt) * 0.5
    out /= np.max(np.abs(out)) + 1e-9
    return out * np.clip(t / 3.0, 0, 1) * np.clip((total_s - t) / 3.0, 0, 1)


def main():
    scenes = json.load(open(f"{ROOT}/script/" + os.environ.get("SCENES", "scenes.json")))
    tts = make_tts()
    lead_in = 1.2
    chunks, cur = [np.zeros(int(lead_in * SR))], lead_in
    timeline = {"fps": FPS, "scenes": []}
    words, spans = 0, []
    for sc in scenes:
        s_start, lines = cur, []
        for ln in sc["lines"]:
            a = tts.generate(ln["t"], sid=0, speed=SPEED)
            assert a.sample_rate == SR, a.sample_rate
            x = trim(np.array(a.samples, dtype=np.float32))
            dur = len(x) / SR
            lines.append({**ln, "start": round(cur * FPS), "end": round((cur + dur) * FPS)})
            words += len(ln["t"].split())
            gap = LINE_GAP + ln.get("pause", 0)
            chunks += [x, np.zeros(int(gap * SR))]
            cur += dur + gap
            print(f"{sc['id']} {dur:5.1f}s  {ln['t'][:60]}", flush=True)
        chunks.append(np.zeros(int(SCENE_GAP * SR)))
        cur += SCENE_GAP
        spans.append((sc["id"], s_start, cur))
        timeline["scenes"].append({"id": sc["id"], "panel": sc["panel"], "start": round(s_start * FPS),
                                   "end": round(cur * FPS), "lines": lines})
    voice = np.concatenate(chunks)
    voice = voice / (np.max(np.abs(voice)) + 1e-9) * 0.89
    total = len(voice) / SR
    nfr = int(np.ceil(total * FPS))
    timeline["durationInFrames"] = nfr

    hop = SR // FPS
    env = np.array([np.sqrt(np.mean(voice[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(voice) else 0.0 for i in range(nfr)])
    env = np.clip(env / (np.percentile(env[env > 0.01], 90) + 1e-9), 0, 1)
    timeline["mouth"] = "".join(str(int(v * 9)) for v in env)

    music = ambient(total, spans)
    venv = np.repeat(env, hop)
    venv = np.pad(venv, (0, max(0, len(voice) - len(venv))))[: len(voice)]
    k = int(0.4 * SR)
    duck = np.convolve(venv, np.ones(k) / k, mode="same")
    mvol = 0.10 - 0.05 * np.clip(duck * 2, 0, 1)
    mix = voice + music[: len(voice)] * mvol
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    os.makedirs(f"{ROOT}/public", exist_ok=True)
    sf.write(f"{ROOT}/public/narration.wav", voice, SR)
    sf.write(f"{ROOT}/public/mix.wav", mix.astype(np.float32), SR)
    json.dump(timeline, open(f"{ROOT}/public/timeline.json", "w"), ensure_ascii=False)
    print(f"TOTAL {total:.1f}s  words={words}  wpm={words / (total / 60):.0f}")


if __name__ == "__main__":
    main()
