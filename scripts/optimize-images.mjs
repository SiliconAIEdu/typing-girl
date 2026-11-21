// Authoring step: convert the PNG originals in art-source/ to WebP at the sizes the game shows.
// Requires: npm install --prefix scripts/assets
import { fileURLToPath } from 'node:url';
import sharp from './assets/node_modules/sharp/lib/index.js';
const jobs = [
  ['hero.png', 'hero.webp', 900],
  ['typing-hand-left.png', 'typing-hand-left.webp', 640],
  ['tier-1.png', 'tier-1.webp', null],
  ['tier-2.png', 'tier-2.webp', null],
  ['tier-3.png', 'tier-3.webp', null],
];
for (const [from, to, width] of jobs) {
  const input = fileURLToPath(new URL('../art-source/' + from, import.meta.url));
  const output = fileURLToPath(new URL('../public/art/' + to, import.meta.url));
  let img = sharp(input);
  if (width) img = img.resize({ width });
  const info = await img.webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(output);
  console.log(`${to}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}
