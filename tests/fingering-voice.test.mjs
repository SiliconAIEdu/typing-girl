import test from 'node:test';
import assert from 'node:assert/strict';
import {keyInfo,handsMarkup} from '../src/fingering.js';
import {rankVoices,letterToSpeech,createVoice} from '../src/voice.js';

test('all home-row keys point to the correct hand and finger',()=>{
 for(const [key,id] of Object.entries({a:0,s:1,d:2,f:3,j:4,k:5,l:6,';':7}))assert.deepEqual(keyInfo(key).fingers,[id]);
 assert.deepEqual(keyInfo(' ').fingers,[8,9]);
 assert.equal(keyInfo('b').index,3);assert.equal(keyInfo('n').index,4);
 assert.equal(keyInfo(',').index,5);assert.equal(keyInfo('.').index,6);assert.equal(keyInfo('/').index,7);
});
test('capital letters and shifted punctuation use the opposite little finger',()=>{
 assert.deepEqual(keyInfo('F').fingers,[3,7]);assert.equal(keyInfo('F').shiftFinger,7);
 assert.deepEqual(keyInfo('J').fingers,[4,0]);assert.equal(keyInfo('J').shiftFinger,0);
 assert.deepEqual(keyInfo('?').fingers,[7,0]);assert.equal(keyInfo('?').base,'/');
 assert.deepEqual(keyInfo('!').fingers,[0,7]);assert.equal(keyInfo('!').base,'1');
 for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|:"<>?')assert.ok(keyInfo(c).index>=0,c);
});
test('both hands expose exactly ten independently highlightable fingers',()=>{
 const markup=handsMarkup();const ids=[...markup.matchAll(/data-finger="(\d+)"/g)].map(m=>+m[1]).sort((a,b)=>a-b);
 assert.deepEqual(ids,[0,1,2,3,4,5,6,7,8,9]);assert.equal((markup.match(/class="hand-art"/g)||[]).length,2);
});
test('voice selection favours natural voices and respects an explicit choice',()=>{
 const voices=[{name:'Albert',lang:'en-US',voiceURI:'a',default:true},{name:'Daniel',lang:'en-GB',voiceURI:'d'},{name:'Samantha',lang:'en-US',voiceURI:'s',localService:true},{name:'Tingting',lang:'zh-CN',voiceURI:'t'}];
 assert.equal(rankVoices(voices,'en-US')[0].name,'Samantha');
 assert.equal(rankVoices(voices,'en-US','d')[0].name,'Daniel');
 assert.equal(rankVoices(voices,'zh-CN')[0].name,'Tingting');
 assert.equal(rankVoices(voices,'en-US').some(v=>v.name==='Albert'),false);
 assert.equal(letterToSpeech('f'),'F');assert.equal(letterToSpeech(' '),'space');assert.equal(letterToSpeech('?'),'question mark');
});
test('letter speech waits for voices, applies gentle settings, reports playback and mute',async()=>{
 const oldSynth=globalThis.speechSynthesis,oldUtter=globalThis.SpeechSynthesisUtterance;
 let available=[],callback,spoken=[],states=[],settings={sound:true};
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 globalThis.speechSynthesis={getVoices:()=>available,cancel(){},resume(){},addEventListener(_,fn){callback=fn;},removeEventListener(){},speak(utter){spoken.push(utter);utter.onstart();utter.onend();}};
 try{
  const controller=createVoice({recordings:{},settings:()=>settings,onStatus:state=>states.push(state)});
  const pending=controller.speak('F');assert.equal(spoken.length,0);
  available=[{name:'Samantha',lang:'en-US',voiceURI:'s'}];callback();await pending;
  assert.equal(spoken.length,1);assert.equal(spoken[0].text,'F');assert.equal(spoken[0].voice.name,'Samantha');assert.equal(spoken[0].rate,.86);
  assert.deepEqual(states,['loading','speaking','ready']);
  settings.sound=false;await controller.speak('J');assert.equal(spoken.length,1);controller.stop();
 }finally{globalThis.speechSynthesis=oldSynth;globalThis.SpeechSynthesisUtterance=oldUtter;}
});
test('cancelling a pending letter prevents stale speech after the next key or navigation',async()=>{
 const oldSynth=globalThis.speechSynthesis,oldUtter=globalThis.SpeechSynthesisUtterance;
 let available=[],callback,spoken=0;
 globalThis.SpeechSynthesisUtterance=class{};
 globalThis.speechSynthesis={getVoices:()=>available,cancel(){},resume(){},addEventListener(_,fn){callback=fn;},removeEventListener(){},speak(){spoken++;}};
 try{const voice=createVoice({recordings:{},settings:()=>({sound:true}),onStatus(){}});const pending=voice.speak('F');voice.stop();available=[{name:'Samantha',lang:'en-US'}];callback();await pending;assert.equal(spoken,0);}finally{globalThis.speechSynthesis=oldSynth;globalThis.SpeechSynthesisUtterance=oldUtter;}
});
