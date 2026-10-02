# VIRUS AI — видеообзор (Remotion)

Документальный видеообзор VIRUS AI · GLOBAL CAUSAL INTELLIGENCE. Ролик собирается целиком из кода:
одна студия, один ведущий за столом, монитор с аналитическим интерфейсом, который реагирует на речь ведущего.

## Структура

- `script/scenes.json` — сценарий: 24 сцены, реплики, план камеры (`shot`), жест (`g`), взгляд (`look`),
  сколько элементов показать на мониторе (`r`), подсветка (`hl`), AR-карточка (`ar`).
- `script/build_audio.py` — озвучка (Piper / sherpa-onnx, голос `ru_RU-ruslan-medium`), тайминги,
  огибающая для синхронизации губ, фоновая музыка, сведение. Пишет `public/timeline.json` и `public/mix.wav`.
- `src/Video.tsx` — студия, камера, синхронизация с таймлайном.
- `src/Presenter.tsx` — ведущий (мимика, моргание, жесты, губы по аудио).
- `src/Panels.tsx` — экраны монитора (график, Cause Engine, Transmission, AI Council, сценарии и т. д.).
- `public/mix.mp3` + `public/timeline.json` — готовые озвучка с музыкой и тайминги.

## Версии

- **Полная** (~11 мин, весь мастер-сценарий): `script/scenes.json`, готовые файлы в `public/`.
- **Короткая** (~6 мин): `script/scenes_short.json`, готовые файлы в `variants/short/`.
  Чтобы отрендерить её, скопируйте `variants/short/timeline.json` и `variants/short/mix.mp3` в `public/`.
  Переозвучка: `SCENES=scenes_short.json SPEED=1.38 SCENE_GAP=0.5 python script/build_audio.py`.

- **Простыми словами** (~8,5 мин, для неспециалистов, спокойный темп): `script/scenes_simple.json`, готовые файлы в `variants/simple/`.
  Переозвучка: `SCENES=scenes_simple.json SPEED=0.78 LINE_GAP=0.55 SCENE_GAP=1.2 python script/build_audio.py`.

## Рендер

```bash
npm install
npx remotion render src/index.tsx Main out/virus-ai.mp4 --concurrency=4
```

## Переозвучка после правки текста

1. Скачать голос: `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ru_RU-ruslan-medium.tar.bz2`
   и распаковать в каталог из `TTS_DIR` в `build_audio.py`.
2. `pip install sherpa-onnx soundfile numpy`
3. `SPEED=1.3 python script/build_audio.py`
4. Сконвертировать `public/mix.wav` в `public/mix.mp3` (`ffmpeg -i public/mix.wav -b:a 160k public/mix.mp3`) и отрендерить заново.

Английские термины в репликах записаны русскими буквами (например, «Коз энджин»), чтобы русский голос их прочитал.

## Живой голос через ElevenLabs

Нужны доступ к `api.elevenlabs.io` и переменная окружения `ELEVENLABS_API_KEY`.

```bash
TTS_ENGINE=elevenlabs ELEVEN_VOICE_ID=<id голоса> ELEVEN_SPEED=0.95 \
  SCENES=scenes_simple.json LINE_GAP=0.55 SCENE_GAP=1.2 python script/build_audio.py
```

Модель по умолчанию `eleven_multilingual_v2` (говорит по-русски). Реплики кешируются в `script/.tts_cache/`,
поэтому повторный запуск не тратит кредиты.
