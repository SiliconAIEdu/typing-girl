import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createVoice} from '../src/voice.js';
import {HEART_AUDIO} from '../src/heart-manifest.js';
import {heartTexts} from '../scripts/heart-catalog.mjs';
function harness(options={}){
 const clips=[],states=[];let settings={sound:true,voice:'heart'};
 const voice=createVoice({settings:()=>settings,onStatus:(...s)=>states.push(s),recordings:{F:'f.mp3',J:'j.mp3',sentence:'sentence.mp3'},audioFactory:url=>{const a={url,paused:false,play(){this.onplaying?.();return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}};clips.push(a);return a;},...options});
 return{voice,clips,states,setSettings:s=>{settings=s;}};
}
test('Heart plays bundled recordings without device speech and resolves relative URLs',async()=>{
 const h=harness();await h.voice.speak('F');assert.equal(h.clips.length,1);assert.match(h.clips[0].url,/\/public\/audio\/heart\/f.mp3$/);assert.equal(h.states.at(-1)[0],'speaking');h.clips[0].onended();assert.equal(h.states.at(-1)[0],'ready');h.voice.stop();
});
test('next letter cancels earlier audio; navigation and mute leave no playing clip',async()=>{
 const h=harness();await h.voice.speak('F');await h.voice.speak('J');assert.equal(h.clips[0].paused,true);assert.equal(h.clips[0].onplaying,null);h.voice.stop();assert.equal(h.clips[1].paused,true);h.setSettings({sound:false});await h.voice.speak('F');assert.equal(h.clips.length,2);
});
test('blocked audio playback reports a useful action and does not silently switch voices',async()=>{
 const h=harness({audioFactory:()=>({play:()=>Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'})),pause(){},removeAttribute(){},load(){}})});await h.voice.speak('F');assert.equal(h.states.at(-1)[0],'error');assert.match(h.states.at(-1)[1],/听一听/);h.voice.stop();
});
test('every shipped English lesson and letter prompt has a nonempty Heart recording',()=>{
 const texts=heartTexts();assert.ok(texts.length>500);
 for(const text of texts){assert.ok(HEART_AUDIO[text],text);const file=new URL('../public/audio/heart/'+HEART_AUDIO[text],import.meta.url);assert.ok(fs.statSync(file).size>1000,text);}
});
