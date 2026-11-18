import {ENGLISH_COURSE,CHINESE_COURSE} from './curriculum-data.js';
export const BRAND='Luna & Keys';
const keyboardGroups=[
['home','A place to begin','F、J 与空格','fj',false],['home-dk','A little duet','加入 D 和 K','dk',false],['home-sl','Finding a rhythm','加入 S 和 L','sl',false],['home-a','Meet the neighbours','加入 A 和分号','a;',false],
['reach-ru','A small stretch','食指向上：R、U','ru',false],['reach-ei','A little higher','中指向上：E、I','ei',false],['reach-wo','Window seats','无名指向上：W、O','wo',false],['reach-qp','The outer edges','小指向上：Q、P','qp',false],['reach-ty','Across the middle','食指中央：T、Y','ty',false],
['lower-vm','Soft steps','向下寻找：V、M','vm',false],['lower-cn','New paths','加入 C、N','cn',false],['lower-xb','Little bridges','加入 X、B','xb',false],['lower-zg','Almost home','加入 Z、G、H','zgh',false],['numbers','Count the moments','数字 0–9','0123456789',false],['punctuation','Pause & finish','句号、逗号与问号',',.?',false],['capitals','A capital idea','Shift 与大写字母','ABCDEFGHIJKLMNOPQRSTUVWXYZ',true]
];
let keys='';export const KEY_LESSONS=keyboardGroups.map(([id,title,subtitle,newKeys,caseSensitive],i)=>{keys+=newKeys;return{id:'key-'+id,title,subtitle,kind:'keys',index:i,keys:keys+' ',newKeys,caseSensitive,stage:i<4?'起步':i<9?'向上探索':i<13?'向下探索':'自由表达',goal:i===0?'用左右食指找到 F 和 J，拇指轻按空格。':'只学一点新内容，也复习熟悉的键。'};});
// Original theme-based language courses. The learning path is words -> sentences -> articles.
export const ENGLISH_UNITS=ENGLISH_COURSE;
export const CHINESE_UNITS=CHINESE_COURSE;
const modeTitles={words:'词汇积累',sentences:'短语与句子',story:'文章阅读'};
const modeGoals={words:'认识词语的意思，留意拼写，再把它打出来。',sentences:'从实用搭配到完整句子，练习准确表达。',story:'读一篇完整文章，观察细节，再想想为什么。'};
export const ENGLISH_LESSONS=ENGLISH_UNITS.flatMap((u,i)=>['words','sentences','story'].map(mode=>({id:`en-${u.id}-${mode}`,kind:'english',mode,unit:u.id,chapter:i+1,title:u.title,subtitle:u.subtitle,goal:modeGoals[mode],caseSensitive:mode!=='words'})));
const pinyinLesson={id:'zh-pinyin',title:'Little sounds',subtitle:'拼音与键盘',kind:'chinese',ime:false,goal:'先练熟拼音字母，再使用中文输入法。',texts:['mao','shu','hua','yun','xiao','peng you','xue xi','kuai le']};
function chineseId(id,mode){if(id==='room'&&mode==='words')return'zh-words';if(id==='room'&&mode==='sentences')return'zh-sentence';if(id==='seeds'&&mode==='story')return'zh-story';return`zh-${id}-${mode}`;}
export const CHINESE_LESSONS=[pinyinLesson,...CHINESE_UNITS.flatMap((u,i)=>['words','sentences','story'].map(mode=>({id:chineseId(u.id,mode),kind:'chinese',mode,unit:u.id,chapter:i+1,title:u.title,subtitle:u.subtitle,goal:modeGoals[mode],ime:true,story:mode==='story'})))];
export const TEST_LESSONS=[{id:'test-30',kind:'test',title:'A gentle check-in',subtitle:'30 秒 · 基准键',seconds:30,keys:'asdfjkl ',goal:'只和自己的同类练习比较，先打准，再打快。'},{id:'test-60',kind:'test',title:'Finding your flow',subtitle:'60 秒 · 常见词',seconds:60,goal:'真实键盘输入，不显示下一个键的位置。'},{id:'test-edit',kind:'edit',title:'Make it right',subtitle:'检查与修改',goal:'这次错误会保留在文字里。用退格修正，再按 Enter 提交。'}];
export const LESSONS=[...KEY_LESSONS,...ENGLISH_LESSONS,...CHINESE_LESSONS,...TEST_LESSONS];
export const POOLS=[{tier:1,title:'Everyday Wonders',subtitle:'软萌日常',cost:30,color:'rose',names:['Window watcher','A sleepy hello','Little bookworm','Tea-time friend','Pink cloud','Ribbon day','Cosy blanket','Small explorer','Paper dreams','Sunny paws','Quiet company','Home sweet home']},{tier:2,title:'Secret Garden',subtitle:'梦幻花园',cost:90,color:'sage',names:['Daisy morning','Garden gate','Lavender walk','Butterfly friend','Rosewater','Clover wish','Petal dance','Spring letter','Lilac breeze','Little gardener','Bloom together','Moonflower']},{tier:3,title:'Moonlight Letters',subtitle:'月光宝石',cost:180,color:'lilac',names:['First moon','Opal whisper','Silver lullaby','Crystal lake','Stardust letter','Aurora dream','Pearl wish','Quiet comet','Moonbeam','Velvet night','Little constellation','Luna forever']}];
export const CARDS=POOLS.flatMap(p=>p.names.map((name,i)=>({id:`cat-${p.tier}-${i}`,tier:p.tier,index:i,name,number:String((p.tier-1)*12+i+1).padStart(2,'0')})));
