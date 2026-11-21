// Publish the built site in an isolated checkout, preserving gh-pages history.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const git = (args, cwd = process.cwd()) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const dist = path.resolve('dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw Error('Run npm run build first.');
const origin = git(['remote', 'get-url', 'origin']);
const author = git(['config', 'user.name']),
  email = git(['config', 'user.email']);
const checkout = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-pages-'));
try {
  git(['init', '-b', 'gh-pages'], checkout);
  git(['config', 'user.name', author], checkout);
  git(['config', 'user.email', email], checkout);
  git(['remote', 'add', 'origin', origin], checkout);
  if (git(['ls-remote', '--heads', 'origin', 'gh-pages'], checkout)) {
    git(['fetch', '--depth=1', 'origin', 'gh-pages'], checkout);
    git(['checkout', '-B', 'gh-pages', 'FETCH_HEAD'], checkout);
  }
  for (const entry of fs.readdirSync(checkout))
    if (entry !== '.git') fs.rmSync(path.join(checkout, entry), { recursive: true, force: true });
  fs.cpSync(dist, checkout, { recursive: true });
  fs.writeFileSync(path.join(checkout, '.nojekyll'), '');
  git(['add', '.'], checkout);
  if (git(['status', '--porcelain'], checkout)) {
    git(['commit', '-m', 'Publish Luna & Keys ' + git(['rev-parse', '--short', 'HEAD'])], checkout);
    git(['push', 'origin', 'gh-pages'], checkout);
  }
  console.log('GitHub Pages source updated.');
} finally {
  fs.rmSync(checkout, { recursive: true, force: true });
}
