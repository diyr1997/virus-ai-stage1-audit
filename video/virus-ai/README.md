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
