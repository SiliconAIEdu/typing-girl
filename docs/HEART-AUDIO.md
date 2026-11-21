# Heart recordings

English voice: Kokoro v1.0 `af_heart`, speed 1.0, matching the selected demo setting. Generated locally with Kokoro.js 1.2.1 and the 8-bit ONNX model, then encoded as 24 kHz mono MP3 at 64 kbit/s. The runtime plays static audio and sends no typed text to a voice service.

Sources:
- https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0 weights)
- https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
- https://github.com/hexgrad/kokoro/tree/main/kokoro.js
- License: licenses/Kokoro-Apache-2.0.txt

All curriculum text is original. The audio manifest preserves exact text keys and uses content-hashed filenames. Single letters A–Z are synthesized from a fixed table of American English phonemes (for example F = ˈɛf, A = ˈeɪ) at speed 0.9, bypassing the text phonemizer. Spelling them as words made the phonemizer read "eff" as "ee-eff-eff" and "ay" as "eye". Chinese text continues to use the device's Mandarin voice. Device voices can also be explicitly selected for English; old saved lesson text missing from the current recording library uses device speech as a fallback.

To regenerate after curriculum changes (optional authoring dependencies; not required to play or deploy):

```sh
npm install --prefix scripts/audio
node scripts/generate-heart.mjs   # behind a proxy: NODE_USE_ENV_PROXY=1 node scripts/generate-heart.mjs
npm test
npm run build
```

The first generation downloads model weights. The generator skips completed recordings and can be resumed. To change the voice or speed, regenerate into an empty output directory. Do not commit downloaded model weights or node_modules.

The public website uses only the generated MP3 files, without a Hugging Face account, hosted GPU quota, or API key. Model and encoder software are not shipped in the runtime.
