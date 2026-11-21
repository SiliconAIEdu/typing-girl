// Finger IDs run from the left little finger to the right little finger;
// 8 and 9 are the left and right thumbs. One mapping drives all three hints.
export const fingerNames = [
  '左手小指',
  '左手无名指',
  '左手中指',
  '左手食指',
  '右手食指',
  '右手中指',
  '右手无名指',
  '右手小指',
  '左手拇指',
  '右手拇指',
];
const groups = ['qaz1`', 'wsx2', 'edc3', 'rfvtgb45', 'yuhjnm67', 'ik,8', 'ol.9', "p;/0-=[]\\'"];
const shifted = {
  '~': '`',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  _: '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
};
export function keyInfo(target = '') {
  const base = shifted[target] || target.toLowerCase();
  const index = groups.findIndex(g => g.includes(base));
  const shift = !!shifted[target] || /^[A-Z]$/.test(target);
  const shiftFinger = shift ? (index < 4 ? 7 : 0) : null;
  const fingers = target === ' ' ? [8, 9] : index < 0 ? [] : [index, ...(shift ? [shiftFinger] : [])];
  const name =
    target === ' '
      ? '用任一拇指轻按空格'
      : index < 0
        ? '找到对应的键'
        : `${fingerNames[index]} → ${base.toUpperCase()} 键${shift ? ' · ' + fingerNames[shiftFinger] + '按 Shift' : ''}`;
  return { base, index, shift, shiftFinger, fingers, name };
}
// One colour per finger pair. The same colour marks the finger, its keys and the lit key,
// so children can match "this finger" to "that key" at a glance.
export const fingerColors = [
  '#a77bd6',
  '#5b93dd',
  '#3fa77a',
  '#ec8a3c',
  '#ec8a3c',
  '#3fa77a',
  '#5b93dd',
  '#a77bd6',
  '#e5739f',
  '#e5739f',
];
export const fingerForKey = key => (key === ' ' ? 8 : groups.findIndex(g => g.includes(key)));

// Cat paws seen from the pad side: four toe beans (little -> index) and a small side bean for the thumb.
// Each bean is [id, x, y, rx, ry, rotation] for the left paw; the right paw mirrors x and rotation.
const LEFT_BEANS = [
  [0, 68, 124, 21, 26, -24],
  [1, 112, 80, 23, 29, -9],
  [2, 164, 66, 24, 30, 3],
  [3, 214, 86, 23, 29, 16],
  [8, 254, 180, 15, 19, 38],
];
const RIGHT_IDS = [7, 6, 5, 4, 9];
const WIDTH = 300;
const PAD =
  'M152 152 C188 152 212 178 208 206 C206 223 198 232 187 230 C179 240 166 242 159 235 C155 241 149 241 145 235 C138 242 125 240 117 230 C106 232 98 223 96 206 C92 178 116 152 152 152Z';
const mirrorPath = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${WIDTH - x} ${y}`);
function pawSvg(right) {
  const labels = right ? [';', 'L', 'K', 'J', '␣'] : ['A', 'S', 'D', 'F', '␣'];
  const beans = LEFT_BEANS.map(([id, bx, y, rx, ry, rot], i) => [
    right ? RIGHT_IDS[i] : id,
    right ? WIDTH - bx : bx,
    y,
    rx,
    ry,
    right ? -rot : rot,
    labels[i],
  ]);
  // The fur outline is the same shapes drawn twice: a thick stroke underneath, a clean fill on top.
  const fur = `${beans.map(([, x, y, rx, ry]) => `<circle cx="${x}" cy="${y}" r="${Math.max(rx, ry) + 15}"/>`).join('')}<ellipse cx="${right ? WIDTH - 152 : 152}" cy="188" rx="108" ry="90"/><rect x="${right ? WIDTH - 214 : 90}" y="216" width="124" height="70" rx="30"/>`;
  const toes = beans
    .map(
      ([id, x, y, rx, ry, rot, label]) =>
        `<g class="finger" data-finger="${id}" style="--finger:${fingerColors[id]}"><g transform="rotate(${rot} ${x} ${y})"><ellipse class="bean" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse class="bean-shine" cx="${x - rx * 0.28}" cy="${y - ry * 0.4}" rx="${rx * 0.28}" ry="${ry * 0.18}"/></g><text class="finger-letter" data-finger-label="${id}" data-default-label="${label}" x="${x}" y="${y}" dy=".36em">${label}</text></g>`,
    )
    .join('');
  return `<svg class="hand-svg paw-svg" viewBox="0 20 ${WIDTH} 290" role="img" aria-label="${right ? '右' : '左'}爪五个肉垫与基准键"><g class="hand-art"><g class="fur-line">${fur}</g><g class="fur">${fur}</g><path class="paw-pad" d="${right ? mirrorPath(PAD) : PAD}"/><ellipse class="bean-shine" cx="${right ? WIDTH - 134 : 134}" cy="174" rx="15" ry="8"/></g>${toes}<text class="hand-name" x="${WIDTH / 2}" y="304">${right ? '右爪' : '左爪'}</text></svg>`;
}
export function handsMarkup() {
  return `<section class="hands-guide" aria-label="双手指法示意"><div class="hands-pair"><div class="hand-figure">${pawSvg(false)}</div><div class="hand-coach"><span class="hand-coach-label">FOLLOW YOUR FINGERS</span><strong id="finger-caption">双手轻轻放好</strong><span id="finger-detail">F 和 J 的小凸点，是食指的起点。</span><span class="home-position">左手 A S D F · 右手 J K L ;</span></div><div class="hand-figure">${pawSvg(true)}</div></div></section>`;
}
