import {
  LESSONS,
  KEY_LESSONS,
  ENGLISH_LESSONS,
  CHINESE_LESSONS,
  ENGLISH_UNITS,
  CHINESE_UNITS,
  POOLS,
  CARDS,
} from './content.js';
import { keyLessonTasks } from './drills.js';
export const STORAGE = 'luna-and-keys:v1';
export const fresh = () => ({
  version: 1,
  diamonds: 0,
  records: [],
  skills: {},
  daily: {},
  first: [],
  cards: {},
  draws: [],
  weak: {},
  attempts: {},
  storySeen: {},
  settings: { level: 0, sound: true, hints: true },
  onboarded: false,
});
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeTasks(lesson, p, seed = Date.now(), storyChoice = null) {
  const rng = seeded(seed);
  const task = (text, extra = {}) => ({ text, ...extra });
  if (lesson.kind === 'keys') {
    const learned = lesson.keys.replaceAll(' ', '');
    const weak = Object.entries(p.weak)
      .filter(([k]) => k.length === 1 && learned.includes(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);
    return keyLessonTasks(lesson, weak, rng).map(t => task(t.text, { note: t.note }));
  }
  if (lesson.kind === 'english' || (lesson.kind === 'chinese' && lesson.unit)) {
    const english = lesson.kind === 'english',
      u = (english ? ENGLISH_UNITS : CHINESE_UNITS).find(x => x.id === lesson.unit);
    const convert = (item, note) =>
      english ? task(item[0], { translation: item[1], note }) : task(item, { note });
    if (lesson.mode === 'words') return shuffle(u.words, rng).map(t => convert(t, '词汇积累'));
    if (lesson.mode === 'sentences') {
      const split = english ? 4 : 3;
      return [
        ...shuffle(u.sentences.slice(0, split), rng).map(t => convert(t, '短语搭配')),
        ...shuffle(u.sentences.slice(split), rng).map(t => convert(t, '完整句子')),
      ];
    }
    const index =
      Number.isInteger(storyChoice) && storyChoice >= 0 && storyChoice < u.stories.length
        ? storyChoice
        : (p.storySeen[lesson.id] || 0) % u.stories.length;
    const story = u.stories[index];
    return story.text.map((text, i) =>
      task(text, {
        ...(english ? { translation: story.translation[i] } : {}),
        storyTitle: story.title,
        question: i === story.text.length - 1 ? story : null,
      }),
    );
  }
  if (lesson.kind === 'chinese') return shuffle(lesson.texts, rng).map(t => task(t));
  if (lesson.kind === 'edit')
    return shuffle(['The cat is on the bed.', 'I have a blue bag.', 'We can read together.'], rng).map(t =>
      task(t),
    );
  const words = ['cat', 'bag', 'sun', 'bed', 'red', 'cup', 'map', 'pen', 'sit', 'run', 'box', 'hat'];
  return Array.from({ length: 120 }, () =>
    task(
      lesson.keys
        ? Array.from({ length: 5 }, () => lesson.keys[Math.floor(rng() * lesson.keys.length)])
            .join('')
            .trim() || 'fj'
        : shuffle(words, rng).slice(0, 3).join(' '),
    ),
  );
}
export function normal(s, lesson) {
  return lesson.ime ? s.normalize('NFKC').replaceAll('。', '.') : lesson.caseSensitive ? s : s.toLowerCase();
}
export function matchInput(target, offset, value, lesson) {
  let matched = 0,
    wrong = false;
  for (const c of value) {
    if (offset + matched >= target.length) break;
    if (normal(c, lesson) !== normal(target[offset + matched], lesson)) {
      wrong = true;
      break;
    }
    matched++;
  }
  return { matched, wrong };
}
export function statusFor(p, id) {
  const s = p.skills[id];
  if (!s) return '未开始';
  return s.stable >= 2 ? '已熟练' : s.stable === 1 ? '再巩固一次' : '练习中';
}
// A key lesson counts as passed once it was finished with at least 80% accuracy.
// Passing unlocks the next recommendation; mastery (no hints, twice) stays a separate badge.
export const PASS_ACCURACY = 80;
export const passed = (p, id) => (p.skills[id]?.best || 0) >= PASS_ACCURACY;
export function recommendation(p) {
  return (
    KEY_LESSONS.find(l => !passed(p, l.id)) ||
    [...ENGLISH_LESSONS, ...CHINESE_LESSONS].find(l => !p.skills[l.id]) ||
    KEY_LESSONS.find(l => (p.skills[l.id]?.stable || 0) < 2) ||
    KEY_LESSONS[KEY_LESSONS.length - 1]
  );
}
const MODES = ['words', 'sentences', 'story'];
/** The lesson that naturally follows `lesson` in its own track. */
export function nextLesson(lesson, p) {
  if (lesson.kind === 'keys') return KEY_LESSONS[lesson.index + 1] || recommendation(p);
  if (lesson.id === 'zh-pinyin') return CHINESE_LESSONS[1];
  if (lesson.unit) {
    const list = lesson.kind === 'english' ? ENGLISH_LESSONS : CHINESE_LESSONS;
    const nextMode = MODES[MODES.indexOf(lesson.mode) + 1];
    return (
      list.find(l => l.unit === lesson.unit && l.mode === nextMode) ||
      list.find(l => l.chapter === lesson.chapter + 1 && l.mode === 'words') ||
      recommendation(p)
    );
  }
  return recommendation(p);
}
// Which keyboard lesson introduces a character. Uppercase needs the capitals lesson.
function keyLessonFor(c) {
  if (/[A-Z]/.test(c)) return KEY_LESSONS.find(l => l.id === 'key-capitals');
  return KEY_LESSONS.find(l => l.newKeys.includes(c.toLowerCase())) || null;
}
const gateCache = new Map();
/** The keyboard lesson a language lesson builds on, or null when it needs none. */
export function requiredKeyLesson(lesson) {
  if (!['english', 'chinese'].includes(lesson.kind)) return null;
  if (gateCache.has(lesson.id)) return gateCache.get(lesson.id);
  let text = '';
  if (lesson.ime || lesson.id === 'zh-pinyin')
    text = 'abcdefghijklmnopqrstuvwxyz'; // pinyin uses every letter
  else {
    const u = ENGLISH_UNITS.find(x => x.id === lesson.unit);
    text =
      lesson.mode === 'words'
        ? u.words.map(w => w[0]).join('')
        : lesson.mode === 'sentences'
          ? u.sentences.map(x => x[0]).join('')
          : u.stories.flatMap(x => x.text).join('');
  }
  let need = null;
  for (const c of new Set(text)) {
    const l = keyLessonFor(c);
    if (l && (!need || l.index > need.index)) need = l;
  }
  gateCache.set(lesson.id, need);
  return need;
}
export function gateOpen(p, lesson) {
  const need = requiredKeyLesson(lesson);
  return !need || !!p.settings.confident || KEY_LESSONS.slice(0, need.index + 1).every(l => passed(p, l.id));
}
/** Keystroke effort of a record. One Chinese character typed through pinyin is worth about three keys. */
export const effortUnits = record => Math.round((record.correct || 0) * (record.ime ? 3 : 1));
/** Completion reward scales with real work: 1 diamond per 10 correct keys, from 5 up to 30. */
export const completionReward = units => Math.max(5, Math.min(30, Math.round(units / 10)));
/** Share of correct keys typed while finger hints were visible. Old records only stored a flag. */
export const hintShare = record =>
  Number.isFinite(record.hintedKeys) && record.correct > 0
    ? Math.min(1, record.hintedKeys / record.correct)
    : record.hints
      ? 1
      : 0;
export function complete(p, record) {
  if (p.records.some(r => r.runId === record.runId))
    return { progress: p, reward: 0, breakdown: [], duplicate: true };
  const next = structuredClone(p),
    day = dayKey(new Date(record.date));
  const lesson = LESSONS.find(l => l.id === record.lessonId);
  if (!lesson) throw Error('Unknown lesson');
  const eligible = record.finished && record.correct > 0 && record.physical;
  const old = next.skills[lesson.id] || { stable: 0, best: 0, visits: 0 };
  const stable = eligible && hintShare(record) <= 0.2 && record.accuracy >= 90;
  next.skills[lesson.id] = {
    stable: old.stable + (stable ? 1 : 0),
    best: Math.max(old.best, record.accuracy),
    visits: old.visits + 1,
  };
  const entry = next.daily[day] || (next.daily[day] = { lessons: [], bonus: false });
  let reward = 0;
  const breakdown = [];
  if (eligible && !entry.lessons.includes(lesson.id)) {
    const base = completionReward(effortUnits(record));
    reward = base;
    breakdown.push([`完成练习 · ${effortUnits(record)} 次有效按键`, base]);
    if (record.accuracy >= 90) {
      reward += 5;
      breakdown.push(['准确率达到 90%', 5]);
    }
    if (!next.first.includes(lesson.id)) {
      reward += 10;
      next.first.push(lesson.id);
      breakdown.push(['第一次完成', 10]);
    }
    entry.lessons.push(lesson.id);
    if (entry.lessons.length >= 3 && !entry.bonus) {
      entry.bonus = true;
      reward += 15;
      breakdown.push(['今天完成三课', 15]);
    }
  }
  next.diamonds += reward;
  next.records = [{ ...record, reward }, ...next.records].slice(0, 300);
  for (const [k, v] of Object.entries(record.errors || {})) next.weak[k] = (next.weak[k] || 0) + v;
  if (lesson.mode === 'story' && record.finished)
    next.storySeen[lesson.id] = (next.storySeen[lesson.id] || 0) + 1;
  return { progress: next, reward, breakdown };
}
export function draw(p, tier, random = Math.random()) {
  const pool = POOLS.find(x => x.tier === tier);
  if (!pool) throw Error('没有找到这个卡包。');
  const choices = CARDS.filter(c => c.tier === tier && !p.cards[c.id]);
  if (!choices.length) throw Error('这个系列已经收集齐啦。');
  if (p.diamonds < pool.cost) throw Error('钻石还不够，先和 Luna 练一小段吧。');
  const card = choices[Math.min(choices.length - 1, Math.floor(Math.max(0, random) * choices.length))];
  const next = structuredClone(p);
  next.diamonds -= pool.cost;
  const date = new Date().toISOString();
  next.cards[card.id] = { date, favorite: false };
  next.draws.unshift({ id: crypto.randomUUID(), cardId: card.id, cost: pool.cost, date });
  return { progress: next, card };
}
export function parseProgress(raw) {
  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (p?.version !== 1) throw Error('这份存档的版本暂不支持。');
  if (
    !Number.isInteger(p.diamonds) ||
    p.diamonds < 0 ||
    p.diamonds > 10000000 ||
    !Array.isArray(p.records) ||
    p.records.length > 300 ||
    !Array.isArray(p.first) ||
    !Array.isArray(p.draws)
  )
    throw Error('这份存档不完整。');
  const safeMap = o =>
    o &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    !Object.keys(o).some(k => ['__proto__', 'prototype', 'constructor'].includes(k));
  for (const k of ['skills', 'daily', 'cards', 'weak', 'attempts', 'storySeen'])
    if (!safeMap(p[k])) throw Error('存档内容有误。');
  for (const [id, v] of Object.entries(p.cards))
    if (
      !CARDS.some(c => c.id === id) ||
      !v ||
      !Number.isFinite(Date.parse(v.date)) ||
      typeof v.favorite !== 'boolean'
    )
      throw Error('卡片记录有误。');
  for (const [id, v] of Object.entries(p.skills))
    if (
      !LESSONS.some(l => l.id === id) ||
      !v ||
      !['stable', 'best', 'visits'].every(k => Number.isFinite(v[k]) && v[k] >= 0) ||
      v.best > 100
    )
      throw Error('课程记录有误。');
  for (const v of Object.values(p.daily))
    if (
      !v ||
      !Array.isArray(v.lessons) ||
      v.lessons.some(id => !LESSONS.some(l => l.id === id)) ||
      typeof v.bonus !== 'boolean'
    )
      throw Error('每日记录有误。');
  for (const k of ['weak', 'attempts', 'storySeen'])
    for (const v of Object.values(p[k])) if (!Number.isInteger(v) || v < 0) throw Error('练习记录有误。');
  for (const r of p.records)
    if (
      !r ||
      typeof r.runId !== 'string' ||
      !LESSONS.some(l => l.id === r.lessonId) ||
      !Number.isFinite(Date.parse(r.date)) ||
      !['accuracy', 'correct', 'mistakes', 'seconds', 'cpm', 'reward'].every(
        k => Number.isFinite(r[k]) && r[k] >= 0,
      ) ||
      r.accuracy > 100
    )
      throw Error('成绩记录有误。');
  if (p.first.some(id => !LESSONS.some(l => l.id === id))) throw Error('课程记录有误。');
  if (
    !p.settings ||
    ![0, 1, 2].includes(p.settings.level) ||
    typeof p.settings.sound !== 'boolean' ||
    typeof p.settings.hints !== 'boolean'
  )
    throw Error('设置记录有误。');
  return { ...fresh(), ...p };
}

// ---- Progress code: a copy-and-paste alternative to backup files (for moving between computers). ----
const CODE_PREFIX = 'LK1.';
async function pipeBytes(bytes, transform) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer());
}
export async function encodeProgress(progress) {
  const bytes = await pipeBytes(
    new TextEncoder().encode(JSON.stringify(progress)),
    new CompressionStream('deflate-raw'),
  );
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return CODE_PREFIX + btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export async function decodeProgress(code) {
  const clean = String(code ?? '').replace(/\s+/g, '');
  if (!clean.startsWith(CODE_PREFIX)) throw Error('这不是 Luna & Keys 的进度码。');
  let b64 = clean.slice(CODE_PREFIX.length).replaceAll('-', '+').replaceAll('_', '/');
  while (b64.length % 4) b64 += '=';
  let text;
  try {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    text = new TextDecoder().decode(await pipeBytes(bytes, new DecompressionStream('deflate-raw')));
  } catch {
    throw Error('进度码不完整，请重新复制一次。');
  }
  return parseProgress(text);
}

// ---- Weekly summary for parents and teachers. ----
export function weeklySummary(progress, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(now.getTime() - (6 - i) * 86400000)));
  const recent = progress.records.filter(r => days.includes(dayKey(new Date(r.date))));
  const perDay = days.map(day => {
    const list = recent.filter(r => dayKey(new Date(r.date)) === day);
    return { day, minutes: Math.round(list.reduce((n, r) => n + r.seconds, 0) / 60), runs: list.length };
  });
  const typing = recent.filter(r => !r.ime && r.kind !== 'edit');
  const avg = (list, key) =>
    list.length ? Math.round(list.reduce((n, r) => n + r[key], 0) / list.length) : null;
  return {
    perDay,
    minutes: perDay.reduce((n, d) => n + d.minutes, 0),
    activeDays: perDay.filter(d => d.runs).length,
    runs: recent.length,
    accuracy: avg(recent, 'accuracy'),
    cpm: avg(typing, 'cpm'),
    keyLessonsPassed: KEY_LESSONS.filter(l => passed(progress, l.id)).length,
    weak: Object.entries(progress.weak)
      .filter(([k]) => /^[ -~]$/.test(k))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k),
  };
}
