import {ENGLISH_UNITS,CHINESE_LESSONS} from '../src/content.js';
import {letterToSpeech} from '../src/voice.js';
export const preview='Hello, I am Luna. Take your time. Let us try F, and J, together.';
export function heartTexts(){
 const texts=new Set([preview]);
 for(const key of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ;,.?:!\'"-/\\=[]')texts.add(letterToSpeech(key));
 for(const u of ENGLISH_UNITS){for(const [s]of [...u.words,...u.sentences])texts.add(s);for(const story of u.stories)for(const s of story.text)texts.add(s);}
 for(const t of CHINESE_LESSONS.find(l=>l.id==='zh-pinyin').texts)texts.add([...t].map(letterToSpeech).join(', '));
 for(const s of ['The cat is on the bed.','I have a blue bag.','We can read together.'])texts.add(s);
 return [...texts];
}
