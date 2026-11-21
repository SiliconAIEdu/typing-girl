import { HEART_AUDIO } from './heart-manifest.js';
// Keep speech user-initiated, wait for asynchronously loaded system voices,
// and cancel stale prompts when the learner types faster than the narration.
const friendlyNames =
  /samantha|karen|serena|aria|jenny|sara|zira|ava|emma|sonia|susan|ting.?ting|xiaoxiao|xiaoyi|huihui|meijia|美佳|婷婷|晓晓/i;
const novelty =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|fred|good news|grandma|grandpa|jester|junior|organ|superstar|ralph|trinoids|whisper|zarvox/i;
export function rankVoices(voices, lang, preferred = '') {
  const prefix = lang.slice(0, 2);
  return voices
    .filter(v => v.lang.toLowerCase().startsWith(prefix) && !novelty.test(v.name))
    .sort((a, b) => score(b) - score(a));
  function score(v) {
    return (
      (v.voiceURI === preferred ? 1000 : 0) +
      (friendlyNames.test(v.name) ? 100 : 0) +
      (v.lang.replace('_', '-') === lang ? 20 : 0) +
      (v.localService ? 5 : 0) +
      (v.default ? 1 : 0)
    );
  }
}
export function letterToSpeech(key) {
  return (
    {
      ' ': 'space',
      ';': 'semicolon',
      ',': 'comma',
      '.': 'period',
      '?': 'question mark',
      ':': 'colon',
      '!': 'exclamation mark',
      "'": 'apostrophe',
      '"': 'quotation mark',
      '-': 'hyphen',
      '/': 'slash',
      '\\': 'backslash',
      '=': 'equals',
      '[': 'left bracket',
      ']': 'right bracket',
    }[key] || key.toUpperCase()
  );
}
export function createVoice({
  settings,
  onStatus,
  recordings = HEART_AUDIO,
  audioFactory = url => new Audio(url),
}) {
  let token = 0,
    timer = null,
    watchdog = null,
    active = null,
    clip = null;
  const synth = globalThis.speechSynthesis;
  function stop() {
    token++;
    clearTimeout(timer);
    clearTimeout(watchdog);
    synth?.cancel();
    active = null;
    if (clip) {
      clip.onplaying = clip.onended = clip.onerror = null;
      clip.pause();
      clip.removeAttribute('src');
      clip.load();
      clip = null;
    }
  }
  function list(lang) {
    return rankVoices(synth?.getVoices() || [], lang, settings().voice);
  }
  async function available() {
    if (!synth) return [];
    if (synth.getVoices().length) return synth.getVoices();
    return new Promise(resolve => {
      let timeout;
      const finish = () => {
        clearTimeout(timeout);
        synth.removeEventListener('voiceschanged', finish);
        resolve(synth.getVoices());
      };
      synth.addEventListener('voiceschanged', finish, { once: true });
      timeout = setTimeout(finish, 1400);
    });
  }
  async function speak(text, lang = 'en-US', { delay = 0 } = {}) {
    stop();
    if (!settings().sound) return;
    const request = token;
    const run = async () => {
      onStatus('loading', '正在准备声音…');
      const file =
        lang.startsWith('en') && (!settings().voice || settings().voice === 'heart') && recordings[text];
      if (file) {
        const audio = audioFactory(new URL('../public/audio/heart/' + file, import.meta.url).href);
        clip = audio;
        const failed = message => {
          if (request !== token) return;
          clearTimeout(watchdog);
          onStatus('error', message);
        };
        audio.onplaying = () => {
          if (request === token) {
            clearTimeout(watchdog);
            onStatus('speaking', 'Luna 正在读给你听');
          }
        };
        audio.onended = () => {
          if (request === token) {
            clearTimeout(watchdog);
            clip = null;
            onStatus('ready', '声音已开启');
          }
        };
        audio.onerror = () => failed('声音暂时没有加载出来，请点“听一听”重试。');
        watchdog = setTimeout(() => {
          if (request === token) {
            audio.pause();
            failed('声音加载有些慢，请点“听一听”重试。');
          }
        }, 15000);
        try {
          await audio.play();
        } catch (error) {
          failed(
            error.name === 'NotAllowedError'
              ? '点一下“听一听”，就可以开启声音。'
              : '声音暂时没有播放出来，请再试一次。',
          );
        }
        return;
      }
      if (!synth) {
        onStatus('unavailable', '这个浏览器暂不支持这段内容的朗读。');
        return;
      }
      const voices = await available();
      if (request !== token) return;
      const voice = rankVoices(voices, lang, settings().voice)[0];
      if (!voice) {
        onStatus('unavailable', '还没有可用的朗读声音。请检查设备的语音设置，或换一个浏览器试听。');
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      active = utter;
      utter.lang = voice.lang || lang;
      utter.voice = voice;
      utter.rate = 0.86;
      utter.pitch = 1.06;
      utter.volume = 1;
      utter.onstart = () => {
        if (request === token) {
          clearTimeout(watchdog);
          onStatus('speaking', '正在轻声读给你听');
        }
      };
      utter.onend = () => {
        if (request === token) {
          clearTimeout(watchdog);
          active = null;
          onStatus('ready', '声音已开启');
        }
      };
      utter.onerror = e => {
        if (request !== token || ['interrupted', 'canceled'].includes(e.error)) return;
        clearTimeout(watchdog);
        active = null;
        onStatus(
          'error',
          e.error === 'not-allowed'
            ? '点一下“听一听”，就可以开启声音。'
            : '声音暂时没有播放出来，请点“声音与试听”重试。',
        );
      };
      watchdog = setTimeout(() => {
        if (request === token) {
          synth.cancel();
          onStatus('error', '没有听到声音？请点“声音与试听”，并检查设备音量。');
        }
      }, 6000);
      synth.resume();
      synth.speak(utter);
    };
    if (delay) timer = setTimeout(run, delay);
    else await run();
  }
  return { stop, speak, list, available };
}
