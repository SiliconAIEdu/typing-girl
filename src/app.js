import { keyInfo, handsMarkup, fingerNames, fingerColors, fingerForKey } from './fingering.js';
import { createVoice, letterToSpeech } from './voice.js';
import { createSfx } from './sfx.js';
import { PINYIN } from './pinyin-data.js';
import {
  BRAND,
  KEY_LESSONS,
  ENGLISH_UNITS,
  ENGLISH_LESSONS,
  CHINESE_UNITS,
  CHINESE_LESSONS,
  TEST_LESSONS,
  LESSONS,
  POOLS,
  CARDS,
} from './content.js';
import {
  STORAGE,
  fresh,
  dayKey,
  makeTasks,
  matchInput,
  statusFor,
  recommendation,
  nextLesson,
  requiredKeyLesson,
  gateOpen,
  passed,
  hintShare,
  complete,
  draw,
  parseProgress,
  encodeProgress,
  decodeProgress,
  weeklySummary,
} from './engine.js';
const $ = s => document.querySelector(s),
  esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const icons = {
  home: '⌂',
  keys: '⌨',
  english: '❀',
  chinese: '文',
  packs: '◇',
  collection: '▧',
  journey: '↗',
};
const nav = [
  ['home', '我的小天地', 'My Studio'],
  ['keys', '键盘小径', 'Key Trails'],
  ['english', '英语故事花园', 'Story Garden'],
  ['chinese', '中文输入', 'Word Atelier'],
  ['packs', '拆开小惊喜', 'Little Surprises'],
  ['collection', '我的收藏', 'My Collection'],
  ['journey', '成长足迹', 'My Journey'],
];
let p = fresh(),
  saveWarning = '',
  view = 'home',
  englishMode = 'words',
  chineseMode = 'words',
  collectionTier = 0,
  favorites = false,
  s = null,
  result = null,
  modal = null,
  packStage = 'closed',
  packTimer = null,
  composing = false;
try {
  const raw = localStorage.getItem(STORAGE);
  if (raw) p = parseProgress(raw);
} catch {
  saveWarning = '暂时无法读取成长记录。原有存档没有被覆盖，请先导出备份或检查浏览器设置。';
}
if (!p.settings.heartVoiceVersion) p.settings = { ...p.settings, voice: 'heart', heartVoiceVersion: 1 };
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE + ':session'));
  if (
    raw &&
    LESSONS.some(l => l.id === raw.lessonId) &&
    Array.isArray(raw.tasks) &&
    raw.tasks.length &&
    raw.tasks.every(t => typeof t.text === 'string')
  )
    s = { ...raw, lastTick: null, paused: true };
} catch {}
function save(next) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
    p = next;
    saveWarning = '';
    return true;
  } catch {
    saveWarning = '这次没有保存成功。请保留页面，导出存档后再试。';
    toast(saveWarning);
    return false;
  }
}
function draft() {
  if (!s) return;
  try {
    localStorage.setItem(
      STORAGE + ':session',
      JSON.stringify({ ...s, elapsed: elapsed(), lastTick: null, paused: true }),
    );
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(STORAGE + ':session');
  } catch {}
}
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
let voiceStatus = { state: 'ready', message: '声音已开启' };
const sfx = createSfx(() => p.settings.sfx !== false);
const voice = createVoice({
  settings: () => p.settings,
  onStatus: (state, message) => {
    voiceStatus = { state, message };
    updateVoiceStatus();
  },
});
function updateVoiceStatus() {
  document.querySelectorAll('[data-voice-status]').forEach(el => {
    el.textContent = p.settings.sound ? voiceStatus.message : '声音已关闭';
    el.dataset.state = p.settings.sound ? voiceStatus.state : 'muted';
  });
}
function stopVoice() {
  voice.stop();
  voiceStatus = { state: 'ready', message: '声音已开启' };
  updateVoiceStatus();
}
function speak(text, lang = 'en-US', options = {}) {
  return voice.speak(text, lang, options);
}
const canHint = l => !!l && !l.ime && !['test', 'edit'].includes(l.kind);
const hintOn = () => !!s && canHint(lesson()) && (s.hints || s.peek);
const lesson = () => LESSONS.find(l => l.id === s?.lessonId),
  current = () => s?.tasks[s.task],
  elapsed = () => (s ? s.elapsed + (s.lastTick ? Date.now() - s.lastTick : 0) : 0);
function pause() {
  if (s && !s.paused) {
    s.elapsed = elapsed();
    s.lastTick = null;
    s.paused = true;
    stopVoice();
    draft();
    if (view === 'session') render();
  }
}
function navigate(next) {
  if (view === 'session') pause();
  view = next;
  result = null;
  modal = null;
  stopVoice();
  window.scrollTo(0, 0);
  render();
}
function start(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l) return;
  if (!gateOpen(p, l)) {
    modal = { type: 'gate', id };
    render();
    return;
  }
  if (l.mode === 'story' && l.unit) {
    modal = { type: 'article-picker', id };
    render();
    return;
  }
  chooseStart(id);
}
function chooseStart(id, storyIndex = null) {
  if (s && s.correct > 0 && !s.finished) {
    modal = { type: 'leave', id, storyIndex };
    render();
    return;
  }
  startNow(id, storyIndex);
}
function startNow(id, storyIndex = null) {
  const l = LESSONS.find(x => x.id === id);
  const last = p.records.find(r => r.lessonId === id);
  const fade = canHint(l) && p.settings.hints && !!last && last.accuracy >= 90;
  const next = structuredClone(p);
  const attempt = (next.attempts[id] || 0) + 1;
  next.attempts[id] = attempt;
  if (!save(next)) return;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  s = {
    runId: crypto.randomUUID(),
    lessonId: id,
    tasks: makeTasks(l, p, seed, storyIndex),
    storyIndex,
    task: 0,
    offset: 0,
    correct: 0,
    mistakes: 0,
    errors: {},
    elapsed: 0,
    lastTick: null,
    started: false,
    paused: false,
    usedHints: false,
    physical: true,
    hints: canHint(l) && p.settings.hints && !fade,
    hintedKeys: 0,
    peek: false,
    wrongStreak: 0,
    combo: 0,
    bestCombo: 0,
    showTranslation: l.kind === 'english' && l.mode === 'words',
    showPinyin: true,
    feedback: '',
    finished: false,
    seed,
    editText: '',
  };
  result = null;
  modal = null;
  view = 'session';
  draft();
  render();
  window.scrollTo(0, 0);
  if (fade) toast('上次打得很准，这次先收起指法提示。连续按错两次，Luna 会悄悄提醒你。');
  sayCurrent();
}
function sayCurrent(manual = false) {
  const l = lesson(),
    t = current();
  if (!l || !t) return;
  if (manual && !p.settings.sound) {
    save({ ...p, settings: { ...p.settings, sound: true } });
    render();
  }
  if (manual && l.kind === 'keys') {
    s.peek = true;
    draft();
    updateSession();
  }
  if (l.kind === 'keys') {
    if (hintOn() || manual)
      speak(letterToSpeech(t.text[s.offset] || ''), 'en-US', { delay: manual ? 0 : 140 });
  } else if (l.kind === 'english' || l.kind === 'edit') speak(t.text);
  else if (l.ime) speak(t.text, 'zh-CN');
  else if (l.kind === 'chinese') speak([...t.text].map(letterToSpeech).join(', '));
  else if (manual) toast('小检查时先自己找键，结束后再听一听。');
}
function resume() {
  view = 'session';
  if (lesson()?.ime || lesson()?.kind === 'edit') s.hints = false;
  if (s.started) s.lastTick = Date.now();
  s.paused = false;
  result = null;
  modal = null;
  render();
  window.scrollTo(0, 0);
  sayCurrent();
}
function markStart() {
  if (!s.started) {
    s.started = true;
    s.lastTick = Date.now();
  }
}
function handleInput(value, physical = true) {
  if (!s || view !== 'session' || s.paused || s.finished || modal || result) return;
  const l = lesson();
  if (l.kind === 'edit') return;
  markStart();
  if (!physical) s.physical = false;
  const t = current();
  const { matched, wrong } = matchInput(t.text, s.offset, value, l);
  if (matched > 0) {
    if (hintOn()) s.hintedKeys = (s.hintedKeys ?? 0) + matched;
    s.peek = false;
    s.wrongStreak = 0;
    s.combo = (s.combo || 0) + matched;
    s.bestCombo = Math.max(s.bestCombo || 0, s.combo);
  }
  if (wrong) {
    s.mistakes++;
    const key = t.text[s.offset + matched];
    s.errors[key] = (s.errors[key] || 0) + 1;
    s.feedback = 'wrong';
    s.wrongStreak = (s.wrongStreak || 0) + 1;
    s.combo = 0;
    if (!s.hints && canHint(l) && s.wrongStreak >= 2) s.peek = true;
    sfx('wrong');
  } else s.feedback = 'good';
  s.correct += matched;
  s.offset += matched;
  if (s.offset >= t.text.length) {
    s.task++;
    s.offset = 0;
    s.feedback = 'celebrate';
    if (s.task >= s.tasks.length) {
      finish();
      return;
    }
    sfx('task');
    refreshTask();
    sayCurrent();
  } else {
    const milestone = matched > 0 && [10, 25, 50, 100].some(n => s.combo >= n && s.combo - matched < n);
    if (milestone) {
      s.feedback = 'combo';
      sfx('combo');
    } else if (matched > 0) sfx('key');
    updateSession();
    if (l.kind === 'keys' && matched > 0) sayCurrent();
  }
  draft();
}
function finish() {
  if (!s || s.finished) return;
  const l = lesson();
  s.elapsed = elapsed();
  s.lastTick = null;
  s.finished = true;
  stopVoice();
  const sec = Math.max(1, Math.round(s.elapsed / 1000));
  const r = {
    runId: s.runId,
    lessonId: l.id,
    title: l.title,
    date: new Date().toISOString(),
    accuracy: s.correct + s.mistakes ? Math.round((s.correct / (s.correct + s.mistakes)) * 100) : 0,
    correct: s.correct,
    mistakes: s.mistakes,
    seconds: sec,
    cpm: Math.round((s.correct / sec) * 60),
    errors: s.errors,
    hintedKeys: Math.min(s.correct, s.hintedKeys ?? (s.usedHints ? s.correct : 0)),
    physical: s.physical,
    finished: true,
    kind: l.kind,
    ime: !!l.ime,
    storyTitle: s.tasks[0]?.storyTitle || null,
    bestCombo: s.bestCombo || 0,
  };
  r.hints = hintShare(r) > 0.2;
  sfx('finish');
  const completed = complete(p, r);
  result = {
    ...r,
    ...completed,
    quiz: s.tasks.at(-1).question || null,
    quizDone: false,
    saved: save(completed.progress),
  };
  if (result.saved) clearDraft();
  render();
  window.scrollTo(0, 0);
}
function retrySave() {
  if (!result) return;
  if (save(result.progress)) {
    result.saved = true;
    clearDraft();
    render();
  }
}
function header(eyebrow, title, desc, extra = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${extra}</div>`;
}
function button(label, action, extra = '', cls = 'primary') {
  return `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
}
const art = (card, extra = '') =>
  `<div class="card-art ${extra}" role="img" aria-label="${esc(card.name)} 小猫插画" style="background-image:url('./public/art/tier-${card.tier}.webp');background-position:${(card.index % 3) * 50}% ${(Math.floor(card.index / 3) * 100) / 3}%"></div>`;
function shell(body) {
  return `<aside class="sidebar"><a class="brand" href="#home" data-action="nav" data-view="home"><img src="./public/favicon.svg" alt=""><span>Luna <i>&</i> Keys<small>A LITTLE EVERYDAY MAGIC</small></span></a><div class="nav-caption">YOUR LITTLE WORLD</div><nav>${nav.map(([id, title, sub]) => `<button data-action="nav" data-view="${id}" class="nav-item ${view === id || (view === 'session' && ((lesson()?.kind === 'english' && id === 'english') || (lesson()?.kind === 'chinese' && id === 'chinese') || (!['english', 'chinese'].includes(lesson()?.kind) && id === 'keys'))) ? 'active' : ''}"><span class="nav-icon">${icons[id]}</span><span>${title}<small>${sub}</small></span></button>`).join('')}</nav><div class="sidebar-note"><span>✧</span><h3>Little steps count.</h3><p>今天的一点点，<br>也值得好好收藏。</p></div><div class="sidebar-bottom">MADE FOR YOUR OWN PACE</div></aside><div class="main"><header class="topbar"><button class="mobile-menu" data-action="menu" aria-label="打开导航">☰</button><span class="breadcrumb">${view === 'session' ? '练习中' : nav.find(n => n[0] === view)?.[1] || '我的小天地'} <span> / ${view === 'session' ? '和 Luna 一起练习' : '每一小步，都算数'}</span></span><div class="top-actions"><button class="diamond-pill" data-action="nav" data-view="packs" aria-label="${p.diamonds} 钻石，查看卡包"><span>◇</span> ${p.diamonds}</button><button class="sound-button" data-action="sound" aria-label="${p.settings.sound ? '关闭' : '开启'}朗读">${p.settings.sound ? '♫' : '♪'}</button><span class="avatar">L</span></div></header>${saveWarning ? `<div class="save-warning" role="alert">${esc(saveWarning)}</div>` : ''}<main>${body}</main><footer>A little practice. A little magic. <span>Luna & Keys</span></footer></div>`;
}
function home() {
  const rec = recommendation(p),
    today = p.daily[dayKey()]?.lessons.length || 0,
    count = Object.keys(p.cards).length;
  return (
    header(
      'MY STUDIO',
      '每天，亮一点点。',
      '一点点练习，一点点发现。Luna 在这里陪着你。',
      `<span class="date-chip">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · 按自己的节奏</span>`,
    ) +
    `<section class="hero"><div class="hero-copy"><div class="soft-tag">MEET YOUR LITTLE COMPANION</div><h2>小小键盘，<br>大大的可能<span>。</span></h2><p>让手指熟悉新的小径，<br>让故事带你去更远的地方。</p>${button(s && !s.finished && lesson() ? `继续：${esc(lessonLabel(lesson()))} <span>↗</span>` : '和 Luna 开始今天 <span>↗</span>', s && !s.finished ? 'resume' : 'start', s && !s.finished ? '' : `data-id="${rec.id}"`)}<div class="hero-note">不用着急，准确比速度更重要。</div></div><img class="hero-cat" src="./public/art/hero.webp" width="900" height="900" decoding="async" alt="白色小猫 Luna 陪着 F 和 J 键"><div class="hero-label"><span>✧</span> 你的小小啦啦队</div></section><div class="notice device-note">打字练习需要电脑和实体键盘。用手机或平板时，可以先浏览课程、看看收藏。</div><div class="home-summary"><div><span class="summary-icon rose">⌨</span><span><strong>${Math.min(today, 3)} <small>/ 3</small></strong><small>今天的小脚印</small></span><div class="dots">${[0, 1, 2].map(i => `<i class="${i < today ? 'filled' : ''}"></i>`).join('')}</div></div><div><span class="summary-icon lilac">◇</span><span><strong>${p.diamonds}</strong><small>攒下的小惊喜</small></span></div><div><span class="summary-icon sage">▧</span><span><strong>${count} <small>/ 36</small></strong><small>收藏的小伙伴</small></span></div></div><div class="section-title"><div><span class="eyebrow">A PATH FOR EVERY MOOD</span><h2>今天，想去哪里？</h2></div><span class="muted">跟着自己的节奏就好</span></div><div class="entry-grid"><button data-action="nav" data-view="keys" class="entry-card rose"><span class="entry-number">01 / FIND YOUR RHYTHM</span><div class="key-illustration"><kbd>F</kbd><span>✧</span><kbd>J</kbd></div><h3>键盘小径</h3><p>从两个键开始，让双手慢慢熟悉键盘。</p><span class="entry-bottom">Key Trails <b>↗</b></span></button><button data-action="nav" data-view="english" class="entry-card lilac"><span class="entry-number">02 / A WORLD OF STORIES</span><div class="book-illustration">Aa<span>hello, little world.</span></div><h3>英语故事花园</h3><p>认识几个词，读一句话，发现一个小故事。</p><span class="entry-bottom">Story Garden <b>↗</b></span></button><button data-action="nav" data-view="chinese" class="entry-card sage"><span class="entry-number">03 / 中文输入</span><div class="book-illustration zh-illustration">文<span>你好，小世界。</span></div><h3>中文输入</h3><p>用拼音输入法，打出词语、句子和小故事。</p><span class="entry-bottom">Word Atelier <b>↗</b></span></button><button data-action="nav" data-view="packs" class="entry-card cream"><span class="entry-number">04 / SOMETHING TO KEEP</span><div class="mini-pack">◇<small>LUNA & KEYS</small></div><h3>拆开小惊喜</h3><p>用练习攒下的钻石，拆开一位新朋友。</p><span class="entry-bottom">Little Surprises <b>↗</b></span></button></div><section class="next-step"><span class="tiny-spark">✧</span><div><small>下一小步</small><h3>${esc(lessonLabel(rec))}</h3><p>${esc(rec.goal)}</p></div>${button('去练一小段 ↗', 'start', `data-id="${rec.id}"`, 'secondary')}</section>`
  );
}
function lessonTile(l) {
  const state = statusFor(p, l.id),
    today = p.daily[dayKey()]?.lessons.includes(l.id);
  return `<button class="lesson-card" data-action="start" data-id="${l.id}"><div class="lesson-meta"><span>${l.kind === 'keys' ? '第 ' + (l.index + 1) + ' 课' : l.kind === 'test' ? '小检查' : l.kind === 'edit' ? '真实修改' : '练习'}</span><span class="status ${state === '已熟练' ? 'stable' : ''}">${state}</span></div><h3>${esc(l.subtitle)}</h3><h4>${esc(l.title)}</h4><p>${esc(l.goal)}</p><div class="lesson-tail"><span>${today ? '再巩固一下 · 今日奖励已领取' : '开始练习'}</span><span>↗</span></div></button>`;
}
function keysPage() {
  return (
    header('KEY TRAILS', '键盘小径', '从手指找到自己的位置开始。每次学一点，也复习一点。') +
    `<div class="notice">✧ 可以看键盘。先把左右食指放到 F 和 J 的凸点上，双手轻轻放松。</div>${[
      '起步',
      '向上探索',
      '向下探索',
      '自由表达',
    ]
      .map(
        (stage, i) =>
          `<div class="section-title"><h2><span class="chapter-no">0${i + 1}</span> ${stage}</h2><span class="muted">${i === 0 ? '认识双手的起点' : i === 3 ? '把操作用在真实输入里' : '新键与旧键一起练'}</span></div><div class="lesson-grid">${KEY_LESSONS.filter(
            l => l.stage === stage,
          )
            .map(lessonTile)
            .join('')}</div>`,
      )
      .join(
        '',
      )}<div class="section-title"><h2>小检查</h2><span class="muted">准备好了，再来看看自己的进步</span></div><div class="lesson-grid">${TEST_LESSONS.map(lessonTile).join('')}</div>`
  );
}
function articleLength(story, english) {
  return english
    ? story.text.join(' ').split(/\s+/).length + ' 词'
    : story.text.join('').replace(/[^\u3400-\u9fff]/g, '').length + ' 字';
}
function courseUnit(l) {
  return (l.kind === 'english' ? ENGLISH_UNITS : CHINESE_UNITS).find(u => u.id === l.unit);
}
function courseTile(l) {
  const gate = gateOpen(p, l) ? null : requiredKeyLesson(l),
    u = courseUnit(l),
    state = statusFor(p, l.id),
    today = p.daily[dayKey()]?.lessons.includes(l.id),
    isEnglish = l.kind === 'english';
  const summary =
    l.mode === 'words'
      ? u.words.length + ' 个词语'
      : l.mode === 'sentences'
        ? u.sentences.length + ' 组短语与句子'
        : u.stories.length + ' 篇完整文章';
  return `<button class="lesson-card course-card" data-action="start" data-id="${l.id}"><div class="lesson-meta"><span>第 ${l.chapter} 关</span><span class="status ${state === '已熟练' ? 'stable' : ''}">${state}</span></div><h3>${esc(u.subtitle)}</h3>${isEnglish ? `<h4>${esc(u.title)}</h4>` : ''}<p class="course-preview">${esc(l.mode === 'words' ? (isEnglish ? u.words.slice(0, 4).map(x => x[0]) : u.words.slice(0, 4)).join(' · ') : l.mode === 'sentences' ? (isEnglish ? u.sentences[4][0] : u.sentences[3]) : u.stories.map(x => x.title).join(' / '))}</p><div class="course-amount">${summary}${l.mode === 'story' ? ' · ' + u.stories.map(x => articleLength(x, isEnglish)).join(' / ') : ''}</div><div class="lesson-tail"><span>${gate ? `建议先完成键位前 ${gate.index + 1} 课` : today ? '继续练习 · 今日奖励已领取' : l.mode === 'story' ? '选一篇，开始读' : '开始这一关'}</span><span>↗</span></div></button>`;
}
function languagePage(english) {
  const units = english ? ENGLISH_UNITS : CHINESE_UNITS,
    mode = english ? englishMode : chineseMode,
    list = english ? ENGLISH_LESSONS : CHINESE_LESSONS,
    action = english ? 'english-mode' : 'chinese-mode';
  return (
    header(
      english ? 'STORY GARDEN' : 'WORD ATELIER',
      english ? '英语故事花园' : '中文输入',
      english ? '积累词汇，练习句子，再走进一篇完整的文章。' : '认识词语，写好句子，再读懂一个完整的故事。',
    ) +
    `${list.some(l => !gateOpen(p, l)) ? `<div class="notice">✧ 这里的词和句子会用到整个键盘。还在学键位的话，建议先走完键盘小径；已经会打字，点开任意一关就能直接开始。</div>` : ''}<div class="course-overview"><span>${units.length} 个主题关卡</span><span>${units.reduce((n, u) => n + u.stories.length, 0)} 篇${english ? '英语' : '中文'}文章</span><span>可以暂停，下次接着练</span></div><div class="learning-path">${[
      ['words', '词汇积累', '先认识，再记住'],
      ['sentences', '短语与句子', '把词语连成意思'],
      ['story', '文章阅读', '读完整的故事与发现'],
    ]
      .map(
        ([id, title, sub], i) =>
          `<button data-action="${action}" data-mode="${id}" aria-pressed="${mode === id}" class="${mode === id ? 'active' : ''}"><span class="path-number">0${i + 1}</span><span><b>${title}</b><small>${sub}</small></span><span class="path-arrow">→</span></button>`,
      )
      .join(
        '',
      )}</div>${!english && mode === 'words' ? `<div class="pinyin-entry"><div><b>第一次用中文输入法？</b><p>先用拼音找字，再开始下面的主题关卡。</p></div>${button('先练拼音 ↗', 'start', 'data-id="zh-pinyin"', 'secondary small')}</div>` : ''}<div class="section-title"><h2>${{ words: '一个主题，一篮新词', sentences: '把熟悉的词用起来', story: '选一个想探索的主题' }[mode]}</h2><span class="muted">按关卡顺序练，也可以选择喜欢的主题</span></div><div class="lesson-grid">${list
      .filter(l => l.mode === mode)
      .map(courseTile)
      .join('')}</div>`
  );
}
function englishPage() {
  return languagePage(true);
}
function chinesePage() {
  return languagePage(false);
}
function zoneAttr(k) {
  const finger = k === 'ShiftLeft' ? 0 : k === 'ShiftRight' ? 7 : k.length === 1 ? fingerForKey(k) : -1;
  return finger >= 0 ? `data-zone="${finger}" style="--zone:${fingerColors[finger]}"` : '';
}
function keyboard() {
  const l = lesson();
  if (l.ime)
    return `<section class="keyboard-and-hands compact-tip"><span>用拼音输入法：先打拼音，再按数字或空格选字。上面的拼音可以帮你找到读音。</span></section>`;
  if (l.kind === 'edit')
    return `<section class="keyboard-and-hands compact-tip"><span>检查大小写、空格和标点，用退格改正，再按 Enter 提交。</span></section>`;
  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', ...'qwertyuiop', '[', ']', '\\'],
    ['Caps', ...'asdfghjkl', ';', "'", 'Enter'],
    ['ShiftLeft', ...'zxcvbnm', ',', '.', '/', 'ShiftRight'],
    [' '],
  ];
  return `<section class="keyboard-and-hands"><div class="keyboard-toolbar"><span>键盘与双手 · 按完回到基准位置</span>${l.ime || l.kind === 'edit' ? '<span>双手回到基准位置</span>' : `<button data-action="hints" ${l.kind === 'test' ? 'disabled' : ''}>${s.hints ? '隐藏指法提示' : '显示指法提示'}</button>`}</div><div class="keyboard" aria-label="键盘位置提示">${rows.map(row => `<div class="key-row">${row.map(k => `<span data-key="${esc(k)}" ${zoneAttr(k)} class="key ${k.length > 1 ? 'control' : ''} ${k === ' ' ? 'space' : ''} ${k === 'f' || k === 'j' ? 'home-key' : ''}">${k === ' ' ? '空格' : k === 'Backspace' ? '⌫' : k.startsWith('Shift') ? 'SHIFT' : esc(k.toUpperCase())}</span>`).join('')}</div>`).join('')}</div>${handsMarkup()}</section>`;
}
function practiceMeta(l, t) {
  return `<div class="practice-meta"><span>${esc(t.storyTitle || t.note || (l.kind === 'edit' ? '用退格修改，检查后按 Enter' : '慢慢看清，再轻轻输入'))}</span><span id="task-count"></span></div>`;
}
function typingArea(l, t) {
  const pinyin = l.ime && PINYIN[t.text];
  return `<div class="typing-area">${t.translation ? `<p class="translation ${s.showTranslation ? 'shown' : ''}">${esc(t.translation)}</p>` : ''}<div id="target-text" class="target-text ${t.text.length > 12 ? 'sentence' : ''} ${pinyin && s.showPinyin ? 'with-pinyin' : ''}" aria-label="请按顺序输入：${esc(t.text)}"></div><div class="typing-help"><div id="instruction" class="instruction" aria-live="polite"></div><div class="task-tools">${l.kind !== 'test' ? button('♫ 听一听', 'speak', '', 'text-button') : ''}${t.translation ? `<button class="text-button" data-action="translation">${s.showTranslation ? '收起意思' : '看看意思'}</button>` : ''}${pinyin ? `<button class="text-button" data-action="pinyin">${s.showPinyin ? '收起拼音' : '显示拼音'}</button>` : ''}</div></div>${l.ime ? '<input id="ime-input" class="typing-input" placeholder="在这里用拼音输入法选字" aria-label="中文输入" autocomplete="off" autocapitalize="off">' : ''}${l.kind === 'edit' ? `<input id="edit-input" class="typing-input" value="${esc(s.editText || '')}" placeholder="在这里输入，检查后按 Enter" aria-label="输入并修改句子" autocomplete="off" spellcheck="false" autocapitalize="off">` : ''}</div>`;
}
function companionCard() {
  const c = CARDS.find(x => x.id === p.settings.companion && p.cards[x.id]);
  return c
    ? `<div id="practice-cat" class="companion-art">${art(c)}</div>`
    : `<img id="practice-cat" src="./public/art/hero.webp" width="900" height="900" decoding="async" alt="Luna">`;
}
function sessionPage() {
  const l = lesson();
  if (!l || !current()) return '';
  const t = current();
  return `<div class="session-toolbar"><div class="session-title">${button('← 返回', 'exit', '', 'text-button')}<h2>${esc(l.subtitle)}</h2></div><div class="session-metrics"><span>准确率 <strong id="accuracy">100<em>%</em></strong></span><span class="combo-metric">连击 <strong id="combo">0</strong></span><span>${l.seconds ? '剩余' : '用时'} <strong id="timer">00:00</strong></span></div><div class="session-controls">${button('♫ 声音', 'voice-settings', '', 'secondary small')}${button('Ⅱ 暂停', 'pause', '', 'secondary small')}</div></div><div class="practice-layout"><section class="practice-card">${practiceMeta(l, t)}<div class="progress-track"><i id="progress-fill"></i></div>${typingArea(l, t)}${keyboard()}</section><div class="session-footnote"><div class="little-companion">${companionCard()}<p id="cat-bubble">慢慢来，我陪着你。</p></div><span class="voice-status" data-voice-status role="status"></span><button class="help-button" data-action="help">双手怎么放？ ↗</button></div></div>`;
}
/** Swap only the text area when moving to the next item, so the keyboard and hands never flicker. */
function refreshTask() {
  const l = lesson(),
    t = current();
  if (view !== 'session' || result || !t || !$('.typing-area')) return render();
  $('.practice-meta').outerHTML = practiceMeta(l, t);
  $('.typing-area').outerHTML = typingArea(l, t);
  updateSession();
  const input = $('#ime-input') || $('#edit-input');
  input?.focus({ preventScroll: true });
}
function updateSession() {
  if (view !== 'session' || result || !s) return;
  const l = lesson(),
    t = current();
  if (!t || !$('#target-text')) return;
  const syllables = l.ime && s.showPinyin && PINYIN[t.text] ? PINYIN[t.text].split(' ') : null;
  $('#target-text').innerHTML = [...t.text]
    .map((c, i) => {
      const cls = i < s.offset ? 'typed' : i === s.offset ? 'current' : '';
      const glyph = c === ' ' ? '␣' : esc(c);
      return syllables?.[i]
        ? `<ruby class="${cls}">${glyph}<rt>${esc(syllables[i])}</rt></ruby>`
        : `<span class="${cls}">${glyph}</span>`;
    })
    .join('');
  $('#task-count').textContent = l.seconds
    ? `${l.seconds} 秒小检查`
    : `第 ${s.task + 1} / ${s.tasks.length} ${l.mode === 'story' ? '句' : l.mode === 'words' ? '个词' : '组'}`;
  $('#progress-fill').style.width =
    (l.seconds
      ? Math.min(100, (elapsed() / 1000 / l.seconds) * 100)
      : ((s.task + s.offset / t.text.length) / s.tasks.length) * 100) + '%';
  const k = keyInfo(t.text[s.offset] || '');
  $('#instruction').textContent =
    s.feedback === 'wrong' && s.caps
      ? '大写锁定（Caps Lock）开着，先按一下它关掉，再继续。'
      : s.feedback === 'wrong' && !s.peek
        ? '没关系，看看当前位置，再试一下。'
        : l.ime
          ? '用中文输入法选字，确认后继续。'
          : l.kind === 'edit'
            ? '打错可以退格，检查后按 Enter。'
            : hintOn()
              ? s.peek && !s.hints
                ? 'Luna 提醒你：' + k.name
                : k.name
              : '试着自己找到下一个键。';
  $('#instruction').classList.toggle('error', s.feedback === 'wrong');
  $('#accuracy').innerHTML =
    (s.correct + s.mistakes ? Math.round((s.correct / (s.correct + s.mistakes)) * 100) : 100) + '<em>%</em>';
  if ($('#combo')) {
    $('#combo').textContent = s.combo || 0;
    $('.combo-metric').classList.toggle('hot', (s.combo || 0) >= 10);
  }
  $('#cat-bubble').textContent =
    s.feedback === 'combo'
      ? `连续 ${s.combo} 个都对了，太稳了！`
      : s.feedback === 'wrong'
        ? '不用着急，再看看那个键。'
        : s.feedback === 'celebrate'
          ? '又完成一小段，做得好！'
          : s.feedback === 'good'
            ? '就是这样，保持自己的节奏。'
            : '慢慢来，我陪着你。';
  const cat = $('#practice-cat');
  cat.classList.remove('happy', 'oops');
  void cat.offsetWidth; // restart the reaction animation
  if (s.feedback === 'celebrate' || s.feedback === 'combo') cat.classList.add('happy');
  if (s.feedback === 'wrong') cat.classList.add('oops');
  $('.combo-metric')?.classList.toggle('pop', s.feedback === 'combo');
  document
    .querySelectorAll('[data-key]')
    .forEach(el =>
      el.classList.toggle(
        'lit',
        hintOn() &&
          (el.dataset.key === k.base ||
            (k.shift && el.dataset.key === (k.shiftFinger === 0 ? 'ShiftLeft' : 'ShiftRight'))),
      ),
    );
  updateHands();
  updateTimer();
}
function updateHands() {
  const l = lesson(),
    k = keyInfo(current()?.text[s.offset] || '');
  const show = hintOn();
  document
    .querySelectorAll('[data-finger]')
    .forEach(el => el.classList.toggle('active', show && k.fingers.includes(Number(el.dataset.finger))));
  document.querySelectorAll('[data-finger-label]').forEach(el => {
    const id = Number(el.dataset.fingerLabel),
      on = show && k.fingers.includes(id);
    el.classList.toggle('active', on);
    el.textContent = !on
      ? el.dataset.defaultLabel
      : k.shift && id === k.shiftFinger
        ? '⇧'
        : k.base === ' '
          ? '␣'
          : keyName(k.base);
  });
  if (!$('#finger-caption')) return;
  $('#finger-caption').textContent = show
    ? k.base === ' '
      ? '拇指轻按空格'
      : fingerNames[k.index] || '双手轻轻放好'
    : '双手回到基准位置';
  $('#finger-detail').textContent = show
    ? k.shift
      ? fingerNames[k.shiftFinger] + '同时按住 Shift'
      : k.base === ' '
        ? '左右拇指选一只，轻轻按下。'
        : '哪颗肉垫亮了，就用那根手指按同样颜色的键。'
    : '左食指放 F，右食指放 J。';
}
function updateTimer() {
  if (!s || view !== 'session' || result || !$('#timer')) return;
  const l = lesson();
  const seconds = l.seconds
    ? Math.max(0, Math.ceil(l.seconds - elapsed() / 1000))
    : Math.floor(elapsed() / 1000);
  $('#timer').textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  if (l.seconds && s.started && !s.paused && seconds === 0) finish();
}
const modeNames = { words: '词汇积累', sentences: '短语与句子', story: '文章阅读' };
function lessonLabel(l) {
  if (l.kind === 'keys') return `键位第 ${l.index + 1} 课 · ${l.subtitle}`;
  if (l.unit) return `${courseUnit(l).subtitle} · ${modeNames[l.mode]}`;
  return l.subtitle;
}
const keyName = k => (k === ' ' ? '空格' : /[a-z]/.test(k) ? k.toUpperCase() : k);
function resultPage() {
  const l = lesson(),
    next = nextLesson(l, result.progress),
    unit = l.ime ? '字' : '字符';
  const prev = result.progress.records.filter(r => r.lessonId === l.id)[1];
  const compare = prev
    ? [
        result.cpm - prev.cpm > 0 ? `比上次快 ${result.cpm - prev.cpm} ${unit}/分钟` : '',
        result.accuracy - prev.accuracy > 0 ? `准确率比上次高 ${result.accuracy - prev.accuracy}%` : '',
      ]
        .filter(Boolean)
        .join('，')
    : '';
  const weak = Object.entries(result.errors || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const independent = canHint(l) ? Math.round((1 - hintShare(result)) * 100) : null;
  const retry = result.accuracy < 80;
  const message = retry
    ? '这次有点难，先把准确率练到 80% 以上再往前走，会更轻松。'
    : independent !== null && independent < 80
      ? result.accuracy >= 90
        ? '打得很准！下次 Luna 会先收起提示，试试自己找键。'
        : '跟着提示打完了。准确率到 90% 后，Luna 会慢慢收起提示。'
      : '少一些提示，你也做到了。';
  const nextButton =
    next && next.id !== l.id
      ? button(
          `下一课：${esc(lessonLabel(next))} →`,
          'start',
          `data-id="${next.id}"`,
          retry ? 'secondary' : 'primary',
        )
      : '';
  const again = button(
    l.mode === 'story' ? '再读一篇' : retry ? '再练一次' : '换一组，再练练',
    'restart',
    '',
    retry || !nextButton ? 'primary' : 'secondary',
  );
  return `<section class="result-page"><div class="result-paw">✧</div><span class="eyebrow">练习完成</span><h1>${retry ? '再练一次，会更稳。' : '这一次，又向前了一点。'}</h1><p>${esc(l.title)} · ${esc(l.subtitle)}</p><div class="result-numbers"><div><b>${result.accuracy}%</b><span>准确率</span></div><div><b>${result.cpm}</b><span>${unit} / 分钟</span></div><div><b>${result.seconds}s</b><span>练习时长 · ${result.correct} ${l.ime ? '个字与标点' : '个正确字符'}</span></div><div><b>+${result.reward}</b><span>获得钻石</span></div></div>${compare ? `<p class="result-compare">${compare} ↗</p>` : ''}<div class="result-message">${message}${independent !== null ? ` <span class="result-independent">独立按键 ${independent}%</span>` : ''}</div>${weak.length ? `<div class="weak-keys"><span>这次容易按错</span>${weak.map(([k, n]) => `<kbd>${esc(keyName(k))}</kbd><small>×${n}</small>`).join('')}<span class="muted">${l.kind === 'keys' ? '下一组练习会多安排这些键' : '下次留意这些地方'}</span></div>` : ''}${result.breakdown.length ? `<div class="reward-breakdown">${result.breakdown.map(([name, n]) => `<span>${name} <b>+${n} ◇</b></span>`).join('')}</div>` : '<p class="muted">今天这课的奖励已经领取，复习的进步同样值得收藏。</p>'}${!result.saved ? `<div class="save-warning">成绩还没有保存成功。${button('再试一次', 'retry-save', '', 'secondary')}</div>` : ''}${result.quiz ? `<section class="quiz"><span class="eyebrow">ONE LITTLE THOUGHT</span><h3>${esc(result.quiz.question)}</h3><div>${result.quiz.options.map((o, i) => `<button data-action="quiz" data-index="${i}" ${result.quizDone ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div><p id="quiz-feedback" role="status">${result.quizDone ? '你找到了文章里的线索。' : ''}</p></section>` : ''}<div class="result-actions">${retry ? again + nextButton : nextButton + again}</div><div class="result-links">${result.progress.diamonds >= POOLS[0].cost ? button(`拆开小惊喜 · ◇ ${result.progress.diamonds}`, 'nav', 'data-view="packs"', 'text-button') : ''}${button('回到我的小天地', 'nav', 'data-view="home"', 'text-button')}</div></section>`;
}
function packsPage() {
  return (
    header(
      'LITTLE SURPRISES',
      '拆开小惊喜',
      '练习攒下的每一颗钻石，都藏着一个小惊喜。',
      `<div class="wallet"><span>◇</span><b>${p.diamonds}</b><small>你的钻石</small></div>`,
    ) +
    `<div class="pack-grid">${POOLS.map(pool => {
      const owned = CARDS.filter(c => c.tier === pool.tier && p.cards[c.id]).length;
      return `<article class="pool-card ${pool.color}"><div class="pool-top"><span>SERIES 0${pool.tier}</span><span>${owned} / 12</span></div><div class="foil-pack tier-${pool.tier}"><div class="pack-seal"></div><small>LUNA & KEYS</small><span class="pack-symbol">${pool.tier === 1 ? '❀' : pool.tier === 2 ? '✿' : '☾'}</span><b>${pool.title}</b><span class="pack-caption">A LITTLE FRIEND INSIDE</span><div class="pack-seal bottom"></div></div><h2>${pool.title}</h2><p>${pool.subtitle} · ${['柔和插画', '细腻珠光', '月光镭射'][pool.tier - 1]}</p><div class="pool-price">◇ <b>${pool.cost}</b><small>钻石 / 包</small></div>${button(owned === 12 ? '这个系列已集齐 ✓' : p.diamonds < pool.cost ? `还差 ${pool.cost - p.diamonds} 钻石` : '选这个小惊喜 ↗', 'draw', `data-tier="${pool.tier}" ${owned === 12 || p.diamonds < pool.cost ? 'disabled' : ''}`)}<button class="text-button" data-action="pool-preview" data-tier="${pool.tier}">看看这个系列</button></article>`;
    }).join(
      '',
    )}</div><div class="pack-rules"><div><span>01</span><h3>一包，一位新朋友</h3><p>每包得到对应系列的一张卡，集齐前不会重复。收到的伙伴可以陪你一起练习。</p></div><div><span>02</span><h3>慢慢攒，也可以</h3><p>三个系列自由选择。钻石没有期限，不用赶时间。</p></div><div><span>03</span><h3>把努力变成惊喜</h3><p>每 10 次有效按键约得 1 颗钻石，一课 5–30 颗。第一次完成、打得准确，还有额外奖励。</p></div></div>`
  );
}
function collectionPage() {
  const list = CARDS.filter(
    c => (!collectionTier || c.tier === collectionTier) && (!favorites || p.cards[c.id]?.favorite),
  );
  return (
    header(
      'MY COLLECTION',
      '我的收藏',
      '把遇见的小伙伴，一张一张好好收藏。',
      `<span class="collection-count">${Object.keys(p.cards).length}<small> / 36 位伙伴</small></span>`,
    ) +
    `<div class="collection-filters"><div class="mode-tabs">${[[0, '全部伙伴'], ...POOLS.map(x => [x.tier, x.subtitle])].map(([i, t]) => `<button data-action="collection-tier" data-tier="${i}" class="${collectionTier === i ? 'active' : ''}">${t}</button>`).join('')}</div><button class="secondary small ${favorites ? 'selected' : ''}" data-action="favorites">${favorites ? '♥' : '♡'} 我的心选</button></div><div class="collection-grid">${list
      .map(c => {
        const own = p.cards[c.id];
        return `<button class="collectible tier-${c.tier} ${own ? 'owned' : 'unowned'}" data-action="card" data-id="${c.id}"><div class="collection-art-wrap">${art(c)}${own ? '' : `<span class="card-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg>尚未解锁</span>`}</div><div class="card-label"><small>No. ${c.number} <span>${own?.favorite ? '♥' : ['普通', '珠光', '镭射'][c.tier - 1]}</span></small><h3>${esc(c.zh)}</h3><p>${own ? (p.settings.companion === c.id ? '正在陪你练习' : esc(c.name)) : '在「' + POOLS[c.tier - 1].subtitle + '」中遇见'}</p></div></button>`;
      })
      .join(
        '',
      )}</div>${list.length ? '' : '<div class="empty-state">♡<h3>把喜欢的小伙伴放在这里。</h3><p>打开已收集的卡片，点击爱心就能加入心选。</p></div>'}`
  );
}
function journeyPage() {
  const records = p.records,
    stable = Object.values(p.skills).filter(v => v.stable >= 2).length;
  return (
    header(
      'MY JOURNEY',
      '成长足迹',
      '看看走过的小径。只和昨天的自己比。',
      button('练习设置', 'settings', '', 'secondary'),
    ) +
    `<div class="journey-summary">${[
      [stable, '已熟练课程'],
      [records.length, '练习足迹'],
      [Math.round(records.reduce((n, r) => n + r.seconds, 0) / 60), '练习分钟'],
      [Object.keys(p.cards).length, '收藏伙伴'],
    ]
      .map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`)
      .join(
        '',
      )}</div><section class="chart-panel"><h2>每一次，都在成长</h2><p>最近十次练习的准确率</p><div class="chart">${
      records
        .slice(0, 10)
        .reverse()
        .map(
          r =>
            `<div class="bar-column"><small>${r.accuracy}%</small><i style="height:${Math.max(3, r.accuracy * 1.3)}px"></i><span>${new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span></div>`,
        )
        .join('') || '<p class="muted">完成第一小段练习，就会留下第一道脚印。</p>'
    }</div></section>${(() => {
      const sp = records
          .filter(r => !r.ime && r.kind !== 'edit')
          .slice(0, 10)
          .reverse(),
        max = Math.max(1, ...sp.map(r => r.cpm)),
        weak = Object.entries(p.weak)
          .filter(([k]) => /^[ -~]$/.test(k))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);
      return `<section class="chart-panel speed-panel"><h2>越来越顺手</h2><p>最近十次键盘练习的速度（字符 / 分钟）。速度不设门槛，只和自己比。</p><div class="chart">${sp.map(r => `<div class="bar-column"><small>${r.cpm}</small><i style="height:${Math.max(3, (r.cpm / max) * 130)}px"></i><span>${new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span></div>`).join('') || '<p class="muted">完成一节键盘练习，就能看到自己的速度。</p>'}</div>${weak.length ? `<div class="weak-keys"><span>最需要多练的键</span>${weak.map(([k, n]) => `<kbd>${esc(keyName(k))}</kbd><small>×${n}</small>`).join('')}<span class="muted">键位练习会自动多安排这些键</span></div>` : ''}</section>`;
    })()}<section class="history"><div class="section-title"><h2>最近的练习</h2><span class="muted">最近二十次</span></div><div class="table-scroll"><table><thead><tr><th>练习</th><th>准确率</th><th>输入 / 分钟</th><th>提示</th><th>钻石</th></tr></thead><tbody>${records
      .slice(0, 20)
      .map(
        r =>
          `<tr><td>${esc(r.title)}<small>${new Date(r.date).toLocaleDateString()}</small></td><td>${r.accuracy}%</td><td>${r.cpm} ${r.ime ? '字/标点' : '字符'}</td><td>${r.hints ? '有提示' : '独立练习'}</td><td>+${r.reward}</td></tr>`,
      )
      .join(
        '',
      )}</tbody></table></div></section>${parentReport()}<section class="backup-panel"><div><span class="eyebrow">KEEP YOUR LITTLE WORLD</span><h2>把成长装进口袋</h2><p>换电脑时，复制“进度码”发给自己，在另一台电脑上粘贴就能接着练。也可以导出备份文件。</p></div><div>${button('复制进度码', 'copy-code', '', 'secondary')}${button('粘贴进度码', 'paste-code', '', 'secondary')}${button('导出存档 ↓', 'export', '', 'text-button')}${button('恢复存档 ↑', 'import', '', 'text-button')}${button('找回恢复前的记录', 'undo-import', '', 'text-button')}<input type="file" id="import-file" accept="application/json,.json" hidden></div></section>`
  );
}
function parentReport() {
  const w = weeklySummary(p),
    max = Math.max(1, ...w.perDay.map(d => d.minutes));
  return `<section class="chart-panel parent-report"><div class="section-title"><div><span class="eyebrow">FOR PARENTS & TEACHERS</span><h2>给家长看的一周小结</h2></div>${button('打印 / 保存为 PDF', 'print', '', 'secondary small')}</div><div class="journey-summary">${[
    [w.minutes, '本周练习分钟'],
    [`${w.activeDays} / 7`, '练习天数'],
    [w.accuracy === null ? '—' : w.accuracy + '%', '平均准确率'],
    [w.cpm === null ? '—' : w.cpm, '平均速度（字符/分钟）'],
    [`${w.keyLessonsPassed} / ${KEY_LESSONS.length}`, '已通过键位课'],
  ]
    .map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`)
    .join(
      '',
    )}</div><div class="chart week-chart">${w.perDay.map(d => `<div class="bar-column"><small>${d.minutes}′</small><i style="height:${Math.max(3, (d.minutes / max) * 110)}px"></i><span>${Number(d.day.slice(5, 7))}/${Number(d.day.slice(8))}</span></div>`).join('')}</div><p class="report-note">${w.runs ? `本周完成 ${w.runs} 次练习。` : '本周还没有练习记录。'}${w.weak.length ? `最常按错的键：${w.weak.map(keyName).join('、')}，键位课会自动多安排这些键。` : ''}建议每天 10–20 分钟，准确率稳定在 90% 以上再追求速度。</p></section>`;
}
function overlays() {
  if (view === 'session' && s?.paused && !result && !modal)
    return `<div class="overlay"><section role="dialog" aria-modal="true" aria-label="休息一下" class="modal pause-modal"><span class="modal-symbol">☾</span><div class="eyebrow">TAKE YOUR TIME</div><h2>小憩一下，再出发。</h2><p>活动一下手指，准备好了再继续。</p>${button('继续练习 →', 'resume')}${button('先回我的小天地', 'nav', 'data-view="home"', 'text-button')}</section></div>`;
  if (!modal) return '';
  let content = '';
  if (modal.type === 'onboard' || modal.type === 'settings')
    content = `<span class="modal-symbol">✧</span><div class="eyebrow">MAKE THIS SPACE YOURS</div><h2>${modal.type === 'onboard' ? '你好，我是 Luna。' : '找到舒服的节奏。'}</h2><p>从两个键开始。认识词语，写好句子，慢慢读懂完整的故事。</p><div class="welcome-path"><span>词汇积累</span><b>→</b><span>短语与句子</span><b>→</b><span>文章阅读</span></div><label class="setting-toggle"><input id="default-hints" type="checkbox" ${p.settings.hints ? 'checked' : ''}> 开始练习时显示双手指法提示</label><p class="small-note">先跟着亮起的小肉垫练。打得准了，Luna 会慢慢收起提示。</p><label class="setting-toggle"><input id="confident" type="checkbox" ${p.settings.confident ? 'checked' : ''}> 我已经会用键盘打字，英语和中文课不用等键位课</label><label class="setting-toggle"><input id="sfx" type="checkbox" ${p.settings.sfx !== false ? 'checked' : ''}> 按键音效（按对、按错、完成时的小声音）</label>${button(modal.type === 'onboard' ? '这是我的小天地 →' : '保存设置', 'welcome')}`;
  if (modal.type === 'article-picker') {
    const l = LESSONS.find(x => x.id === modal.id),
      u = courseUnit(l),
      english = l.kind === 'english';
    content = `<div class="eyebrow">第 ${l.chapter} 关</div><h2>${esc(u.subtitle)}</h2><p>今天想读哪一篇？可以分几次完成。</p><div class="article-options">${u.stories.map((story, i) => `<button data-action="start-story" data-id="${l.id}" data-index="${i}"><small>第 ${i + 1} 篇 · ${articleLength(story, english)}${p.records.some(r => r.lessonId === l.id && r.storyTitle === story.title) ? ' · 已读过' : ''}</small><h3>${esc(story.title)}</h3><p>${esc(story.text[0])}</p><span>读这一篇 →</span></button>`).join('')}</div>`;
  }
  if (modal.type === 'voice') {
    const voices = voice.list('en-US');
    content = `<div class="eyebrow">A GENTLE LITTLE VOICE</div><h2>轻轻读给你听。</h2><p>慢一点，柔和一点。听听 Luna 为你读一小句。</p><label class="voice-label" for="voice-select">英语朗读声音</label><select id="voice-select"><option value="heart" ${!p.settings.voice || p.settings.voice === 'heart' ? 'selected' : ''}>Heart · 美式英语</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${p.settings.voice === v.voiceURI ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('')}</select><p class="voice-device-note">英语课程使用 Heart 的声音；中文使用设备上的普通话声音。</p>${button('♫ 试听 Luna 的声音', 'voice-preview')}<p class="voice-status" data-voice-status role="status"></p><p class="small-note">键位课会轻声提示下一个字母；英语课朗读词语和句子。隐藏指法时，不自动报出字母。</p>${button('准备好了', 'close', '', 'secondary')}`;
  }
  if (modal.type === 'gate') {
    const l = LESSONS.find(x => x.id === modal.id),
      need = requiredKeyLesson(l),
      todo = KEY_LESSONS.find(k => !passed(p, k.id)) || need,
      done = KEY_LESSONS.slice(0, need.index + 1).filter(k => passed(p, k.id)).length;
    content = `<span class="modal-symbol">⌨</span><div class="eyebrow">ONE STEP AT A TIME</div><h2>先认识这些键，会轻松很多。</h2><p>${l.ime || l.id === 'zh-pinyin' ? '用拼音输入中文，要用到全部 26 个字母键。' : `这一关会用到键位小径前 ${need.index + 1} 课的键${need.id === 'key-capitals' ? '，包括标点和大写字母' : ''}。`}</p><p>你已经完成 ${done} / ${need.index + 1} 课，下一课是「${esc(todo.subtitle)}」。</p><div class="modal-actions">${button('先去练这一课 ↗', 'start', `data-id="${todo.id}"`)}${button('我已经会打字了，直接开始', 'gate-skip', `data-id="${l.id}"`, 'text-button')}</div>`;
  }
  if (modal.type === 'leave')
    content = `<h2>开启一条新的小径？</h2><p>刚才那课还没完成。开始新课会替换未完成的练习。</p>${button('开始这节课', 'confirm-start', `data-id="${modal.id}"`)}${button('接着练刚才的', 'resume', '', 'secondary')}`;
  if (modal.type === 'help')
    content = `<div class="eyebrow">A FEW FRIENDLY TIPS</div><h2>轻轻放好双手。</h2><p>左手放在 A S D F，右手放在 J K L ;，拇指靠近空格。先摸摸 F 和 J 上的小凸点。</p><p>看清屏幕提示，用电脑键盘输入。按错不会扣钻石，可以慢慢再试。</p><p>中文课程请用输入法选择汉字；修改练习用退格纠错，再按 Enter 确认。</p>${button('我知道啦', 'close')}`;
  if (modal.type === 'card') {
    const c = CARDS.find(x => x.id === modal.id),
      own = p.cards[c.id];
    content = `<div class="detail-card tier-${c.tier} ${own ? '' : 'locked-detail'}">${art(c)}<small>No. ${c.number} · ${POOLS[c.tier - 1].subtitle} · ${esc(c.name)}</small><h2>${esc(c.zh)}</h2></div>${own ? `<p class="card-story">${esc(c.story)}</p><p>相遇于 ${new Date(own.date).toLocaleDateString('zh-CN')}</p><div class="modal-actions">${p.settings.companion === c.id ? button('✓ 正在陪你练习', 'companion', `data-id=""`, 'secondary') : button('请它陪我练习', 'companion', `data-id="${c.id}"`)}${button(own.favorite ? '♥ 已加入心选' : '♡ 放进我的心选', 'favorite', `data-id="${c.id}"`, 'secondary')}</div>` : `<p>这位小伙伴藏在「${POOLS[c.tier - 1].subtitle}」中。</p>${button('去解锁这位伙伴', 'nav', 'data-view="packs"')}`}`;
  }
  if (modal.type === 'code-copy')
    content = `<div class="eyebrow">PROGRESS CODE</div><h2>你的进度码</h2><p>已经复制好了。把它发给自己（微信、邮件都可以），在另一台电脑的「成长足迹 → 粘贴进度码」里粘贴。</p><textarea id="code-text" class="code-box" readonly rows="5">${esc(modal.code)}</textarea>${button('再复制一次', 'copy-again')}`;
  if (modal.type === 'code-paste')
    content = `<div class="eyebrow">PROGRESS CODE</div><h2>粘贴进度码</h2><p>把另一台电脑上复制的进度码粘贴到这里。</p><textarea id="code-input" class="code-box" rows="5" placeholder="LK1.…"></textarea>${button('读取进度码', 'read-code')}`;
  if (modal.type === 'restore')
    content = `<h2>带回这份成长记录？</h2><p>这份存档有 ${modal.progress.diamonds} 钻石、${Object.keys(modal.progress.cards).length} 位小伙伴。</p><p>恢复会替换当前进度。当前存档会先自动备份在这台浏览器里。</p>${button('恢复这份存档', 'confirm-import')}${button('保留当前进度', 'close', '', 'secondary')}`;
  if (modal.type === 'pack') {
    const c = modal.card;
    content = `<div class="eyebrow">SOMETHING LOVELY IS INSIDE</div><h2>${packStage === 'reveal' ? '你好，新朋友！' : '拆开一份小惊喜。'}</h2><div class="opening-stage ${packStage}"><div class="opening-wrapper"><div class="foil-pack tier-${c.tier}"><div class="tear-strip"></div><small>LUNA & KEYS</small><span class="pack-symbol">☾</span><b>${POOLS[c.tier - 1].title}</b><span class="pack-caption">A LITTLE FRIEND INSIDE</span></div></div><div class="revealed-card tier-${c.tier}">${art(c)}<small>新朋友 · No. ${c.number}</small><h3>${esc(c.zh)}</h3><p class="card-story">${esc(c.story)}</p></div></div>${packStage === 'reveal' ? `<p>已经放进收藏册了。打开卡片，可以请它陪你练习。</p><div class="modal-actions">${button(s && !s.finished ? '继续刚才的练习 →' : '继续练习 →', 'continue')}${button('看看我的收藏 ↗', 'nav', 'data-view="collection"', 'secondary')}</div>` : button('跳过动画', 'skip-pack', '', 'text-button')}`;
  }
  return `<div class="overlay"><section role="dialog" aria-modal="true" aria-label="${modal.type === 'pack' ? '打开卡包' : 'Luna & Keys'}" class="modal ${modal.type === 'pack' ? 'pack-modal' : ''}">${(modal.type !== 'pack' || packStage === 'reveal') && modal.type !== 'onboard' ? '<button class="modal-close" data-action="close" aria-label="关闭">×</button>' : ''}${content}</section></div>`;
}
function render() {
  document.body.classList.toggle('is-practising', view === 'session' && !result);
  const body =
    view === 'home'
      ? home()
      : view === 'keys'
        ? keysPage()
        : view === 'english'
          ? englishPage()
          : view === 'chinese'
            ? chinesePage()
            : view === 'packs'
              ? packsPage()
              : view === 'collection'
                ? collectionPage()
                : view === 'journey'
                  ? journeyPage()
                  : result
                    ? resultPage()
                    : sessionPage();
  $('#app').innerHTML = shell(body) + overlays();
  updateVoiceStatus();
  if ($('.overlay')) {
    $('.sidebar').inert = true;
    $('.main').inert = true;
  }
  if (view === 'session' && !result) {
    updateSession();
    if (!s.paused && !modal) {
      const input = $('#ime-input') || $('#edit-input');
      input?.focus({ preventScroll: true });
      if (input && lesson().kind === 'edit') input.setSelectionRange(input.value.length, input.value.length);
    }
  }
  if (modal || (s?.paused && view === 'session')) $('.modal button')?.focus({ preventScroll: true });
}
async function exportSave() {
  const blob = new Blob(
    [
      JSON.stringify(
        { format: 'luna-and-keys-backup', version: 1, exportedAt: new Date().toISOString(), progress: p },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `luna-and-keys-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('成长记录已经装进口袋。');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  e.preventDefault();
  const a = b.dataset.action;
  if (a === 'nav') {
    document.body.classList.remove('menu-open');
    navigate(b.dataset.view);
    return;
  }
  if (a === 'menu') {
    document.body.classList.toggle('menu-open');
    return;
  }
  document.body.classList.remove('menu-open');
  if (a === 'start') start(b.dataset.id);
  if (a === 'confirm-start') startNow(b.dataset.id, modal?.storyIndex ?? null);
  if (a === 'start-story') chooseStart(b.dataset.id, Number(b.dataset.index));
  if (a === 'restart') {
    if (lesson().mode === 'story') start(s.lessonId);
    else startNow(s.lessonId);
  }
  if (a === 'resume') resume();
  if (a === 'pause') pause();
  if (a === 'exit')
    navigate(lesson().kind === 'english' ? 'english' : lesson().kind === 'chinese' ? 'chinese' : 'keys');
  if (a === 'sound') {
    save({ ...p, settings: { ...p.settings, sound: !p.settings.sound } });
    stopVoice();
    render();
    if (p.settings.sound && view === 'session') sayCurrent();
  }
  if (a === 'hints') {
    s.hints = !s.hints;
    stopVoice();
    render();
    draft();
    if (s.hints) sayCurrent();
  }
  if (a === 'translation') {
    s.showTranslation = !s.showTranslation;
    refreshTask();
    draft();
  }
  if (a === 'pinyin') {
    s.showPinyin = !s.showPinyin;
    refreshTask();
    draft();
  }
  if (a === 'speak') sayCurrent(true);
  if (a === 'english-mode') {
    englishMode = b.dataset.mode;
    render();
  }
  if (a === 'chinese-mode') {
    chineseMode = b.dataset.mode;
    render();
  }
  if (a === 'voice-settings') {
    if (view === 'session') pause();
    modal = { type: 'voice' };
    render();
    voice.available().then(() => {
      if (modal?.type === 'voice') render();
    });
  }
  if (a === 'voice-preview') {
    save({ ...p, settings: { ...p.settings, sound: true } });
    speak('Hello, I am Luna. Take your time. Let us try F, and J, together.');
  }
  if (a === 'settings') {
    modal = { type: 'settings' };
    render();
  }
  if (a === 'welcome') {
    save({
      ...p,
      onboarded: true,
      settings: {
        ...p.settings,
        hints: $('#default-hints').checked,
        confident: !!$('#confident')?.checked,
        sfx: !!$('#sfx')?.checked,
      },
    });
    modal = null;
    render();
  }
  if (a === 'help') {
    pause();
    modal = { type: 'help' };
    render();
  }
  if (a === 'close') {
    modal = null;
    render();
  }
  if (a === 'draw') {
    try {
      const drawn = draw(
        p,
        Number(b.dataset.tier),
        crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      );
      if (!save(drawn.progress)) return;
      modal = { type: 'pack', card: drawn.card };
      packStage = 'closed';
      render();
      clearTimeout(packTimer);
      packTimer = setTimeout(() => {
        if (modal?.type === 'pack') {
          packStage = 'tearing';
          render();
          packTimer = setTimeout(() => {
            if (modal?.type === 'pack') {
              packStage = 'reveal';
              render();
            }
          }, 1900);
        }
      }, 650);
    } catch (err) {
      toast(err.message);
    }
  }
  if (a === 'continue') {
    modal = null;
    if (s && !s.finished) resume();
    else start(recommendation(p).id);
  }
  if (a === 'gate-skip') {
    save({ ...p, settings: { ...p.settings, confident: true } });
    modal = null;
    toast('好的，之后不再提醒。可以在「成长足迹 → 练习设置」里改回来。');
    start(b.dataset.id);
  }
  if (a === 'skip-pack') {
    clearTimeout(packTimer);
    packStage = 'reveal';
    render();
  }
  if (a === 'pool-preview') {
    collectionTier = Number(b.dataset.tier);
    favorites = false;
    navigate('collection');
  }
  if (a === 'collection-tier') {
    collectionTier = Number(b.dataset.tier);
    render();
  }
  if (a === 'favorites') {
    favorites = !favorites;
    render();
  }
  if (a === 'card') {
    modal = { type: 'card', id: b.dataset.id };
    render();
  }
  if (a === 'companion') {
    save({ ...p, settings: { ...p.settings, companion: b.dataset.id || null } });
    toast(b.dataset.id ? '好的，下次练习它会陪着你。' : '换回 Luna 陪你练习。');
    render();
  }
  if (a === 'favorite') {
    const next = structuredClone(p);
    next.cards[b.dataset.id].favorite = !next.cards[b.dataset.id].favorite;
    save(next);
    render();
  }
  if (a === 'quiz') {
    const i = Number(b.dataset.index);
    if (i === result.quiz.answer) {
      result.quizDone = true;
      render();
    } else {
      $('#quiz-feedback').textContent = '再想一想文章里的线索，可以慢慢选。';
      b.classList.add('wrong-answer');
    }
  }
  if (a === 'undo-import') {
    try {
      const raw = localStorage.getItem(STORAGE + ':before-restore');
      if (!raw) {
        toast('这里还没有恢复前的记录。');
        return;
      }
      modal = { type: 'restore', progress: parseProgress(raw) };
      render();
    } catch {
      toast('暂时无法读取这份记录。');
    }
  }
  if (a === 'print') window.print();
  if (a === 'copy-code')
    encodeProgress(p).then(code => {
      navigator.clipboard?.writeText(code).catch(() => {});
      modal = { type: 'code-copy', code };
      render();
      $('#code-text')?.select();
    });
  if (a === 'copy-again') {
    $('#code-text').select();
    navigator.clipboard?.writeText(modal.code).then(
      () => toast('进度码已复制。'),
      () => toast('请手动选中并复制。'),
    );
  }
  if (a === 'paste-code') {
    modal = { type: 'code-paste' };
    render();
    $('#code-input')?.focus();
  }
  if (a === 'read-code')
    decodeProgress($('#code-input').value).then(
      progress => {
        modal = { type: 'restore', progress };
        render();
      },
      err => toast(err.message),
    );
  if (a === 'retry-save') retrySave();
  if (a === 'export') exportSave();
  if (a === 'import') $('#import-file').click();
  if (a === 'confirm-import') {
    try {
      localStorage.setItem(STORAGE + ':before-restore', JSON.stringify(p));
      if (save(modal.progress)) {
        s = null;
        clearDraft();
        modal = null;
        render();
        toast('你的成长记录回来了。');
      }
    } catch {
      toast('没有保存成功，当前进度保持不变。');
    }
  }
});
document.addEventListener('change', async e => {
  if (e.target.id === 'voice-select') {
    save({ ...p, settings: { ...p.settings, voice: e.target.value } });
    stopVoice();
    return;
  }
  if (e.target.id !== 'import-file') return;
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 2000000) throw Error('请选择游戏导出的存档文件。');
    const data = JSON.parse(await f.text());
    if (data.format !== 'luna-and-keys-backup' || data.version !== 1)
      throw Error('这不是 Luna & Keys 的存档。');
    modal = { type: 'restore', progress: parseProgress(data.progress) };
    render();
  } catch (err) {
    toast(err.message);
  }
});
for (const type of ['paste', 'drop'])
  document.addEventListener(type, e => {
    if (view === 'session' && !result && !modal) {
      e.preventDefault();
      toast('用自己的双手，一点点输入就好。');
    }
  });
document.addEventListener('compositionstart', e => {
  if (e.target.id === 'ime-input') composing = true;
});
function commitIme(input) {
  const text = input.value;
  input.value = '';
  if (!text) return;
  if (!/[\u3400-\u9fff，。！？、；：“”]/u.test(text) && !/^[ -~]$/.test(current()?.text[s.offset] || '')) {
    toast('请用中文输入法选中汉字，再确认输入。');
    return;
  }
  handleInput(text);
}
document.addEventListener('compositionend', e => {
  if (e.target.id === 'ime-input') {
    composing = false;
    commitIme(e.target);
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'ime-input' && !composing && !e.isComposing) commitIme(e.target);
  if (e.target.id === 'edit-input' && s) {
    markStart();
    s.editText = e.target.value;
    draft();
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && (modal || (s?.paused && view === 'session'))) {
    const nodes = [
      ...document.querySelectorAll(
        '.modal button:not([disabled]),.modal input,.modal select,.modal textarea',
      ),
    ];
    if (nodes.length) {
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (e.key === 'Escape') {
    if (modal && (modal.type !== 'pack' || packStage === 'reveal') && modal.type !== 'onboard') {
      modal = null;
      render();
    } else if (view === 'session' && !result) {
      if (s.paused) resume();
      else pause();
    }
    return;
  }
  if (
    view !== 'session' ||
    !s ||
    s.paused ||
    s.finished ||
    modal ||
    result ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    e.repeat
  )
    return;
  const l = lesson();
  if (l.kind === 'edit') {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = $('#edit-input').value;
      if (value === current().text) {
        s.correct += value.length;
        s.task++;
        s.editText = '';
        if (s.task >= s.tasks.length) finish();
        else {
          sfx('task');
          refreshTask();
          draft();
        }
      } else {
        const mismatch =
          [...value].filter((c, i) => c !== current().text[i]).length +
          Math.max(0, current().text.length - value.length);
        s.mistakes += Math.max(1, mismatch);
        s.feedback = 'wrong';
        sfx('wrong');
        $('#instruction').textContent = '再看看大小写、空格和标点。用退格改一改。';
      }
    }
    return;
  }
  if (l.ime || e.isComposing || e.key === 'Process') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  s.caps = !!e.getModifierState?.('CapsLock') && /^[a-z]$/i.test(e.key);
  if (e.key.length === 1) {
    e.preventDefault();
    if (!/^[ -~]$/.test(e.key)) {
      toast('这一课请切换到英文输入状态。');
      return;
    }
    handleInput(e.key);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    toast('这节练习按对才前进，直接输入亮起的字符就好。');
  }
});
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('pagehide', () => {
  pause();
  draft();
  stopVoice();
});
window.addEventListener('storage', e => {
  if (e.key === STORAGE) {
    try {
      const next = parseProgress(e.newValue);
      pause();
      p = next;
      render();
      toast('已同步另一个页面的成长记录。');
    } catch {}
  }
});
setInterval(updateTimer, 200);
if (!p.onboarded) modal = { type: 'onboard' };
render();
