import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHINESE_UNITS, CARDS } from '../src/content.js';
import { PINYIN } from '../src/pinyin-data.js';
import { fresh, complete, encodeProgress, decodeProgress, weeklySummary } from '../src/engine.js';
import { KEY_LESSONS } from '../src/content.js';
import { handsMarkup } from '../src/fingering.js';

test('every Chinese text has one pinyin slot per character', () => {
  for (const u of CHINESE_UNITS)
    for (const text of [...u.words, ...u.sentences, ...u.stories.flatMap(s => s.text)]) {
      assert.ok(PINYIN[text], text);
      const slots = PINYIN[text].split(' ');
      assert.equal(slots.length, [...text].length, text);
      [...text].forEach((c, i) => assert.equal(/[㐀-鿿]/.test(c), slots[i] !== '', text + ': ' + c));
    }
});

test('progress codes round-trip and reject damaged input', async () => {
  let p = fresh();
  p = complete(p, {
    runId: 'r1',
    lessonId: KEY_LESSONS[0].id,
    title: 'F/J',
    date: '2026-11-17T12:00:00Z',
    accuracy: 95,
    correct: 120,
    mistakes: 6,
    seconds: 90,
    cpm: 80,
    errors: { f: 2 },
    hintedKeys: 10,
    physical: true,
    finished: true,
  }).progress;
  const code = await encodeProgress(p);
  assert.match(code, /^LK1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeProgress('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' '), p);
  await assert.rejects(decodeProgress('hello'), /不是/);
  await assert.rejects(decodeProgress(code.slice(0, -12)), /不完整/);
});

test('weekly summary counts minutes, days, accuracy and speed within seven Beijing days', () => {
  let p = fresh();
  const run = (id, date, extra = {}) =>
    (p = complete(p, {
      runId: id,
      lessonId: KEY_LESSONS[0].id,
      title: 'F/J',
      date,
      accuracy: 90,
      correct: 100,
      mistakes: 10,
      seconds: 120,
      cpm: 60,
      errors: { j: 3 },
      hintedKeys: 0,
      physical: true,
      finished: true,
      ...extra,
    }).progress);
  run('a', '2026-11-20T02:00:00Z');
  run('b', '2026-11-21T02:00:00Z', { accuracy: 100, cpm: 80 });
  run('old', '2026-11-01T02:00:00Z');
  const w = weeklySummary(p, new Date('2026-11-21T08:00:00Z'));
  assert.equal(w.perDay.length, 7);
  assert.equal(w.minutes, 4);
  assert.equal(w.activeDays, 2);
  assert.equal(w.runs, 2);
  assert.equal(w.accuracy, 95);
  assert.equal(w.cpm, 70);
  assert.equal(w.keyLessonsPassed, 1);
  assert.deepEqual(w.weak, ['j']);
});

test('every card has a Chinese name and a short story', () => {
  for (const c of CARDS) {
    assert.ok(c.zh && c.zh.length <= 10, c.id);
    assert.ok(c.story && c.story.length <= 24, c.id);
  }
  assert.equal(new Set(CARDS.map(c => c.zh)).size, 36);
});

test('finger badges remember their home-row letter so they can show the target key', () => {
  const labels = [...handsMarkup().matchAll(/data-default-label="([^"]+)"/g)].map(m => m[1]);
  assert.equal(labels.length, 10);
});

test('the published site only ships compressed artwork', () => {
  const art = fs.readdirSync(new URL('../public/art/', import.meta.url));
  assert.ok(!art.some(f => f.endsWith('.png')), 'PNG originals belong in art-source/');
  for (const f of art.filter(f => f.endsWith('.webp')))
    assert.ok(fs.statSync(new URL('../public/art/' + f, import.meta.url)).size < 250_000, f);
});

test('every typing key belongs to a finger colour, and the hands use the same colours', async () => {
  const { fingerColors, fingerForKey, handsMarkup } = await import('../src/fingering.js');
  assert.equal(fingerColors.length, 10);
  for (const k of "abcdefghijklmnopqrstuvwxyz0123456789,./;'[]-= ") assert.ok(fingerForKey(k) >= 0, k);
  for (const id of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    assert.ok(handsMarkup().includes(`--finger:${fingerColors[id]}`), id);
  assert.equal(fingerForKey('f'), 3);
  assert.equal(fingerForKey('j'), 4);
});
