import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGLISH_UNITS,CHINESE_UNITS,ENGLISH_LESSONS,CHINESE_LESSONS,LESSONS} from '../src/content.js';
import {makeTasks,fresh,parseProgress} from '../src/engine.js';

test('theme libraries contain complete vocabulary, collocations, sentences and substantial articles',()=>{
 assert.equal(ENGLISH_UNITS.length,16);assert.equal(CHINESE_UNITS.length,12);assert.equal(LESSONS.length,104);
 for(const [index,u] of ENGLISH_UNITS.entries()){
  assert.equal(u.words.length,12,u.id);assert.equal(new Set(u.words.map(w=>w[0])).size,12,u.id);
  assert.equal(u.sentences.length,12,u.id);assert.equal(u.stories.length,2,u.id);
  for(const story of u.stories){const count=story.text.join(' ').split(/\s+/).length;assert.ok(count>=(index<3?80:100)&&count<=160,story.title+': '+count);assert.equal(story.text.length,story.translation.length);assert.ok(story.translation.every(Boolean));assert.equal(story.options.length,3);assert.ok(story.answer>=0&&story.answer<3);}
 }
 for(const [index,u] of CHINESE_UNITS.entries()){
  assert.equal(u.words.length,12,u.id);assert.equal(new Set(u.words).size,12,u.id);assert.equal(u.sentences.length,10,u.id);assert.equal(u.stories.length,2,u.id);
  for(const story of u.stories){const count=story.text.join('').replace(/[^\u3400-\u9fff]/g,'').length;assert.ok(count>=(index<2?180:200)&&count<=330,story.title+': '+count);assert.equal(story.options.length,3);assert.ok(story.answer>=0&&story.answer<3);}
 }
});
test('a round covers the complete theme; collocations stay before full sentences',()=>{
 for(const l of [...ENGLISH_LESSONS,...CHINESE_LESSONS].filter(l=>l.unit&&l.mode!=='story')){
  const english=l.kind==='english',u=(english?ENGLISH_UNITS:CHINESE_UNITS).find(u=>u.id===l.unit),tasks=makeTasks(l,fresh(),56);
  assert.equal(tasks.length,l.mode==='words'?12:english?12:10,l.id);
  if(l.mode==='sentences'){const split=english?4:3;assert.ok(tasks.slice(0,split).every(t=>t.note==='短语搭配'));assert.ok(tasks.slice(split).every(t=>t.note==='完整句子'));}
 }
});
test('children can choose either article without shuffling its sentence order',()=>{
 for(const l of [...ENGLISH_LESSONS,...CHINESE_LESSONS].filter(l=>l.mode==='story')){
  const u=(l.kind==='english'?ENGLISH_UNITS:CHINESE_UNITS).find(u=>u.id===l.unit);
  for(let index=0;index<2;index++){const tasks=makeTasks(l,fresh(),100,index);assert.deepEqual(tasks.map(t=>t.text),u.stories[index].text);assert.equal(tasks.at(-1).question.title,u.stories[index].title);}
 }
});
test('previous language lesson IDs stay valid for existing saves',()=>{
 const ids=['zh-pinyin','zh-words','zh-sentence','zh-story',...['room','picnic','rain','seed','library','team','shadow','city','invention'].flatMap(id=>['words','sentences','story'].map(mode=>`en-${id}-${mode}`))];
 const p=fresh();for(const id of ids){assert.ok(LESSONS.some(l=>l.id===id));p.skills[id]={stable:1,best:98,visits:1};p.first.push(id);}assert.doesNotThrow(()=>parseProgress(p));
});
