import { ENGLISH_COURSE, CHINESE_COURSE } from './curriculum-data.js';
export const BRAND = 'Luna & Keys';
const keyboardGroups = [
  ['home', 'A place to begin', 'F、J 与空格', 'fj', false],
  ['home-dk', 'A little duet', '加入 D 和 K', 'dk', false],
  ['home-sl', 'Finding a rhythm', '加入 S 和 L', 'sl', false],
  ['home-a', 'Meet the neighbours', '加入 A 和分号', 'a;', false],
  ['reach-ru', 'A small stretch', '食指向上：R、U', 'ru', false],
  ['reach-ei', 'A little higher', '中指向上：E、I', 'ei', false],
  ['reach-wo', 'Window seats', '无名指向上：W、O', 'wo', false],
  ['reach-qp', 'The outer edges', '小指向上：Q、P', 'qp', false],
  ['reach-ty', 'Across the middle', '食指中央：T、Y', 'ty', false],
  ['lower-vm', 'Soft steps', '向下寻找：V、M', 'vm', false],
  ['lower-cn', 'New paths', '加入 C、N', 'cn', false],
  ['lower-xb', 'Little bridges', '加入 X、B', 'xb', false],
  ['lower-zg', 'Almost home', '加入 Z、G、H', 'zgh', false],
  ['numbers', 'Count the moments', '数字 0–9', '0123456789', false],
  ['punctuation', 'Pause & finish', '句号、逗号与问号', ',.?', false],
  ['capitals', 'A capital idea', 'Shift 与大写字母', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', true],
];
let keys = '';
export const KEY_LESSONS = keyboardGroups.map(([id, title, subtitle, newKeys, caseSensitive], i) => {
  keys += newKeys;
  return {
    id: 'key-' + id,
    title,
    subtitle,
    kind: 'keys',
    index: i,
    keys: keys + ' ',
    newKeys,
    caseSensitive,
    stage: i < 4 ? '起步' : i < 9 ? '向上探索' : i < 13 ? '向下探索' : '自由表达',
    goal: i === 0 ? '用左右食指找到 F 和 J，拇指轻按空格。' : '只学一点新内容，也复习熟悉的键。',
  };
});
// Original theme-based language courses. The learning path is words -> sentences -> articles.
export const ENGLISH_UNITS = ENGLISH_COURSE;
export const CHINESE_UNITS = CHINESE_COURSE;
const modeTitles = { words: '词汇积累', sentences: '短语与句子', story: '文章阅读' };
const modeGoals = {
  words: '认识词语的意思，留意拼写，再把它打出来。',
  sentences: '从实用搭配到完整句子，练习准确表达。',
  story: '读一篇完整文章，观察细节，再想想为什么。',
};
export const ENGLISH_LESSONS = ENGLISH_UNITS.flatMap((u, i) =>
  ['words', 'sentences', 'story'].map(mode => ({
    id: `en-${u.id}-${mode}`,
    kind: 'english',
    mode,
    unit: u.id,
    chapter: i + 1,
    title: u.title,
    subtitle: u.subtitle,
    goal: modeGoals[mode],
    caseSensitive: mode !== 'words',
  })),
);
const pinyinLesson = {
  id: 'zh-pinyin',
  title: 'Little sounds',
  subtitle: '拼音与键盘',
  kind: 'chinese',
  ime: false,
  goal: '先练熟拼音字母，再使用中文输入法。',
  texts: ['mao', 'shu', 'hua', 'yun', 'xiao', 'peng you', 'xue xi', 'kuai le'],
};
function chineseId(id, mode) {
  if (id === 'room' && mode === 'words') return 'zh-words';
  if (id === 'room' && mode === 'sentences') return 'zh-sentence';
  if (id === 'seeds' && mode === 'story') return 'zh-story';
  return `zh-${id}-${mode}`;
}
export const CHINESE_LESSONS = [
  pinyinLesson,
  ...CHINESE_UNITS.flatMap((u, i) =>
    ['words', 'sentences', 'story'].map(mode => ({
      id: chineseId(u.id, mode),
      kind: 'chinese',
      mode,
      unit: u.id,
      chapter: i + 1,
      title: u.title,
      subtitle: u.subtitle,
      goal: modeGoals[mode],
      ime: true,
      story: mode === 'story',
    })),
  ),
];
export const TEST_LESSONS = [
  {
    id: 'test-30',
    kind: 'test',
    title: 'A gentle check-in',
    subtitle: '30 秒 · 基准键',
    seconds: 30,
    keys: 'asdfjkl ',
    goal: '只和自己的同类练习比较，先打准，再打快。',
  },
  {
    id: 'test-60',
    kind: 'test',
    title: 'Finding your flow',
    subtitle: '60 秒 · 常见词',
    seconds: 60,
    goal: '真实键盘输入，不显示下一个键的位置。',
  },
  {
    id: 'test-edit',
    kind: 'edit',
    title: 'Make it right',
    subtitle: '检查与修改',
    goal: '这次错误会保留在文字里。用退格修正，再按 Enter 提交。',
  },
];
export const LESSONS = [...KEY_LESSONS, ...ENGLISH_LESSONS, ...CHINESE_LESSONS, ...TEST_LESSONS];
export const POOLS = [
  {
    tier: 1,
    title: 'Everyday Wonders',
    subtitle: '软萌日常',
    cost: 30,
    color: 'rose',
    names: [
      'Window watcher',
      'A sleepy hello',
      'Little bookworm',
      'Tea-time friend',
      'Pink cloud',
      'Ribbon day',
      'Cosy blanket',
      'Small explorer',
      'Paper dreams',
      'Sunny paws',
      'Quiet company',
      'Home sweet home',
    ],
  },
  {
    tier: 2,
    title: 'Secret Garden',
    subtitle: '梦幻花园',
    cost: 90,
    color: 'sage',
    names: [
      'Daisy morning',
      'Garden gate',
      'Lavender walk',
      'Butterfly friend',
      'Rosewater',
      'Clover wish',
      'Petal dance',
      'Spring letter',
      'Lilac breeze',
      'Little gardener',
      'Bloom together',
      'Moonflower',
    ],
  },
  {
    tier: 3,
    title: 'Moonlight Letters',
    subtitle: '月光宝石',
    cost: 180,
    color: 'lilac',
    names: [
      'First moon',
      'Opal whisper',
      'Silver lullaby',
      'Crystal lake',
      'Stardust letter',
      'Aurora dream',
      'Pearl wish',
      'Quiet comet',
      'Moonbeam',
      'Velvet night',
      'Little constellation',
      'Luna forever',
    ],
  },
];
// Chinese names and a one-line story for every card, in the same order as POOLS[].names.
const CARD_STORIES = [
  ['窗边守望者', '它能叫出窗外每一只鸟的名字。'],
  ['困困的早安', '眼睛还没睁开，尾巴已经在说早安。'],
  ['小书虫', '每读完一页，它就轻轻拍一下书角。'],
  ['下午茶朋友', '茶还没凉，它已经把点心分成两份。'],
  ['粉色云朵', '它相信每朵云都有自己的形状。'],
  ['丝带日', '今天的丝带，是它自己系的蝴蝶结。'],
  ['暖暖毯子', '冷的时候，它会把毯子分你一半。'],
  ['小小探险家', '沙发后面，也是一片新大陆。'],
  ['纸上的梦', '它把梦画在纸上，第二天接着画。'],
  ['晒太阳的小爪', '阳光走到哪里，它就跟到哪里。'],
  ['安静的陪伴', '不说话的时候，它也一直在。'],
  ['最爱的家', '走得再远，它也记得回家的路。'],
  ['雏菊早晨', '第一朵雏菊开了，它最先发现。'],
  ['花园小门', '它知道小门后面藏着什么。'],
  ['薰衣草小路', '每走一步，都有一点点香。'],
  ['蝴蝶朋友', '它和蝴蝶约好，明天还在这里见。'],
  ['玫瑰露', '清晨的露珠，被它小心地接住了。'],
  ['四叶草愿望', '找到第四片叶子要很有耐心。'],
  ['花瓣舞', '风一吹，它就跟着花瓣转圈。'],
  ['春天的信', '它在信里写：花都开了，快来看。'],
  ['丁香微风', '微风经过时，它会轻轻眯起眼。'],
  ['小园丁', '每天浇一点水，种子就会长大。'],
  ['一起开花', '大家一起努力，花园才会热闹。'],
  ['月光花', '只在晚上开的花，它也守着看。'],
  ['第一轮月亮', '它记得第一次看见满月的晚上。'],
  ['蛋白石悄悄话', '石头里藏着彩虹，只说给它听。'],
  ['银色摇篮曲', '它会哼一首很轻很轻的歌。'],
  ['水晶湖', '湖水像镜子，照出一整片星空。'],
  ['星尘来信', '星星寄来的信，要慢慢读。'],
  ['极光之梦', '它梦见天空跳起彩色的舞。'],
  ['珍珠愿望', '每颗珍珠，都是一点点攒出来的。'],
  ['安静的彗星', '彗星飞得很远，但从不着急。'],
  ['月光', '它把月光收进罐子，留给明天。'],
  ['丝绒夜', '夜晚软软的，像一块丝绒。'],
  ['小星座', '把星星连起来，就是它的名字。'],
  ['永远的 Luna', '收集齐所有伙伴，Luna 一直都在。'],
];
export const CARDS = POOLS.flatMap(p =>
  p.names.map((name, i) => ({
    id: `cat-${p.tier}-${i}`,
    tier: p.tier,
    index: i,
    name,
    zh: CARD_STORIES[(p.tier - 1) * 12 + i][0],
    story: CARD_STORIES[(p.tier - 1) * 12 + i][1],
    number: String((p.tier - 1) * 12 + i + 1).padStart(2, '0'),
  })),
);
