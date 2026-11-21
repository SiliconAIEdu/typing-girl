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

// Left hand, palm down, fingers pointing at the keyboard: [id, base x, base y, length, width, angle].
const LEFT_FINGERS = [
  [0, 64, 150, 94, 33, -14],
  [1, 109, 128, 120, 36, -5],
  [2, 156, 120, 132, 37, 1],
  [3, 203, 128, 118, 36, 8],
  [8, 232, 200, 88, 39, 58],
];
const WIDTH = 300;
const rad = deg => (deg * Math.PI) / 180;
function fingerShape([id, bx, by, len, w, angle], right, label) {
  const x = right ? WIDTH - bx : bx,
    a = right ? -angle : angle;
  // Label sits near the fingertip and stays upright.
  const lx = x + Math.sin(rad(a)) * (len - w * 0.62),
    ly = by - Math.cos(rad(a)) * (len - w * 0.62);
  return `<g class="finger" data-finger="${id}" style="--finger:${fingerColors[id]}"><g transform="translate(${x} ${by}) rotate(${a})"><rect class="finger-body" x="${-w / 2}" y="${-len}" width="${w}" height="${len + 34}" rx="${w / 2}"/><rect class="finger-nail" x="${-w * 0.28}" y="${-len + 5}" width="${w * 0.56}" height="${w * 0.5}" rx="${w * 0.22}"/></g><circle class="finger-badge" cx="${lx}" cy="${ly}" r="15"/><text class="finger-letter" data-finger-label="${id}" data-default-label="${label}" x="${lx}" y="${ly}" dy=".36em">${label}</text></g>`;
}
function handSvg(right) {
  const labels = right ? [';', 'L', 'K', 'J', '␣'] : ['A', 'S', 'D', 'F', '␣'];
  const fingers = LEFT_FINGERS.map((f, i) =>
    fingerShape(right ? [[7, 6, 5, 4, 9][i], ...f.slice(1)] : f, right, labels[i]),
  );
  const flip = right ? `transform="translate(${WIDTH} 0) scale(-1 1)"` : '';
  // Fingers are drawn first so the palm covers their roots; the palm and cuff are one shape.
  return `<svg class="hand-svg" viewBox="0 -20 ${WIDTH} 318" role="img" aria-label="${right ? '右' : '左'}手五指与基准键">${fingers.join('')}<g class="hand-art" ${flip}><path class="palm" d="M48 150 Q46 122 76 118 L228 118 Q254 122 252 154 L249 214 Q245 252 200 256 L104 256 Q59 252 55 214 Z"/><rect class="cuff" x="94" y="248" width="116" height="26" rx="10"/></g><text class="hand-name" x="${WIDTH / 2}" y="294">${right ? '右手' : '左手'}</text></svg>`;
}
export function handsMarkup() {
  return `<section class="hands-guide" aria-label="双手指法示意"><div class="hands-pair"><div class="hand-figure">${handSvg(false)}</div><div class="hand-coach"><span class="hand-coach-label">FOLLOW YOUR FINGERS</span><strong id="finger-caption">双手轻轻放好</strong><span id="finger-detail">F 和 J 的小凸点，是食指的起点。</span><span class="home-position">左手 A S D F · 右手 J K L ;</span></div><div class="hand-figure">${handSvg(true)}</div></div></section>`;
}
