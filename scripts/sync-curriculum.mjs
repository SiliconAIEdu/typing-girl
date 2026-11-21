import fs from 'node:fs';
const english = JSON.parse(
  fs.readFileSync(new URL('../src/english-curriculum.json', import.meta.url), 'utf8'),
);
const chinese = JSON.parse(
  fs.readFileSync(new URL('../src/chinese-curriculum.json', import.meta.url), 'utf8'),
);
fs.writeFileSync(
  new URL('../src/curriculum-data.js', import.meta.url),
  '// Generated from the two original curriculum JSON assets. Run npm run content after editing them.\nexport const ENGLISH_COURSE=' +
    JSON.stringify(english, null, 2) +
    ';\nexport const CHINESE_COURSE=' +
    JSON.stringify(chinese, null, 2) +
    ';\n',
);
console.log(`Curriculum ready: ${english.length} English and ${chinese.length} Chinese themes.`);
