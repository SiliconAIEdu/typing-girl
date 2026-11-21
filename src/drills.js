// Keyboard lesson generator.
// A lesson moves from isolated new keys -> mixed groups with review keys -> real words
// that only use letters the child has already met. Target: roughly 120–200 keystrokes.

// Common, child-friendly words. Lessons filter this list to the letters learned so far.
const WORDS = `a as ask asks all add adds ad ads dad dads sad lad lads fad fall falls flask salad salads alas lass
far jar jars fur furs us full dull dark lark lard fuss flu skull sulk ruff drakes
red see seed feed deed need fee file fire fired ride rides side sides slide skies like likes lid lids kid kids
desk desks diss dies die fried fries free fresh deer dear ear ears sea seas read reads leaf leak lake lakes
safe sale sure use used rule rules ruler lie lies kiss idea ideas
wow owl owls low slow slowly snow show we wide wise word words world work works wood wool row rows sow
door doors floor food foods look looks so sold old fold folds wolf wore swore fork forks frog frogs
quiet quick quiz quill pie pies pea peas pear pears pile pool pools pup pups paw paws park parks paper
pop open opera soap soup sip ship shop drop drops top tops toy toys try tries yes yet you your day days
toad today tree trees tea teas eat eats sit sits set sets pet pets story stories they the that this there
two tall tail tails tidy type yard year years sky stay stays play plays party
very view move moved mom map maps milk most must music meet meets time times vase vest voice visit
cat cats can cake cakes cup cups clean class come comes cool color nice nest net nine new news nose note
ant ants and in into on once one sun run runs fun moon noon not now no snack under until
box boxes fox six sixty mix wax next exit bag bags bed beds big bike book books bus but bear bird birds
best bell back brave brown bubble
zoo zip zero lazy maze size zebra go good get gift game games glad green garden grow hand hands hat hats
hello help home hope hug hugs high hill horse house happy hungry`.split(/\s+/).filter(Boolean);

// Names for the capitals lesson: one per letter of the alphabet.
const CAPITAL_WORDS = ['Amy','Ben','Cat','Dan','Eva','Fox','Gus','Hal','Ivy','Jay','Kim','Leo','Max','Ned','Owl','Pam','Quinn','Ray','Sam','Tom','Uma','Van','Wes','Xu','Yan','Zoe'];
const CAPITAL_SENTENCES = ['I see Max.','We like Leo.','Hi, Zoe.','Is it Ivy?','Run, Ben.','Tom can run.'];
const PUNCTUATION_PHRASES = ['yes, please.','no, thanks.','red, blue.','cat, dog.','hi, mom.','sit, read.','one, two.','look, a bug.','yes, it is.','is it red?','can you see?','is it fun?','are you ok?','who is it?','where is it?','what is it?'];

const pick = (items, rng) => items[Math.floor(rng() * items.length)];
function shuffled(items, rng){ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

/** Join words into tasks of about `width` characters. */
function chunk(words, width=12){
 const out=[]; let line='';
 for(const w of words){
  if(line && (line+' '+w).length>width){out.push(line); line=w;} else line=line?line+' '+w:w;
 }
 if(line) out.push(line);
 return out;
}

export function wordsFor(letters){
 const set=new Set(letters);
 return WORDS.filter(w=>[...w].every(c=>set.has(c)));
}

function letterLesson(lesson, weak, rng){
 const learned=[...new Set(lesson.keys.replaceAll(' ',''))];
 const fresh=[...lesson.newKeys];
 const tasks=[];
 // 1. Meet each new key, then move between new keys.
 for(const k of fresh) tasks.push({text:`${k}${k}${k} ${k}${k}${k}`,note:'认识新键'});
 if(fresh.length>1){
  const pairs=[]; for(let i=0;i<3;i++) pairs.push(shuffled(fresh,rng).join(''));
  tasks.push({text:pairs.join(' '),note:'认识新键'});
 }
 // 2. Mixed groups: every group contains a new key; review and weak keys fill the rest.
 const pool=[...fresh,...fresh,...learned,...weak,...weak];
 const words=wordsFor(learned);
 const withNew=words.filter(w=>fresh.some(k=>w.includes(k)));
 const mixCount=words.length>=4?5:9;
 for(let i=0;i<mixCount;i++){
  const groups=[];
  for(let g=0;g<3;g++){
   const size=lesson.index===0||words.length<4?3:2+Math.floor(rng()*2);
   let group=pick(fresh,rng);
   while(group.length<size) group+=pick(pool,rng);
   groups.push(shuffled([...group],rng).join(''));
  }
  tasks.push({text:groups.join(' '),note:'新键和老朋友一起'});
 }
 // 3. Real words, favouring ones that use today's keys.
 if(words.length>=4){
  const source=withNew.length>=3?withNew:words;
  const chosen=[]; let n=0;
  while(chosen.join(' ').length<70 && n++<60) chosen.push(pick(source,rng));
  if(withNew.length>=3) chosen.push(...shuffled(words,rng).slice(0,3));
  tasks.push(...chunk(chosen,12).slice(0,7).map(text=>({text,note:'打出真正的单词'})));
 }
 return tasks;
}

function numberLesson(lesson, rng){
 const digits='0123456789';
 const tasks=[];
 for(let i=0;i<10;i+=2) tasks.push({text:`${digits[i].repeat(2)} ${digits[i+1].repeat(2)} ${digits[i]}${digits[i+1]}`,note:'认识数字键'});
 for(let i=0;i<4;i++){
  const groups=[]; for(let g=0;g<3;g++){let n='';const len=2+Math.floor(rng()*2);for(let d=0;d<len;d++)n+=pick(digits,rng);groups.push(n);}
  tasks.push({text:groups.join(' '),note:'数字连起来'});
 }
 const nouns=['cats','dogs','books','pens','cups','hats','birds','trees','apples','kids'].filter(w=>[...w].every(c=>lesson.keys.includes(c)));
 for(let i=0;i<4;i++) tasks.push({text:`${2+Math.floor(rng()*8)} ${pick(nouns,rng)}`,note:'数字和单词'});
 return tasks;
}

function punctuationLesson(rng){
 const tasks=[{text:',,, ... ???',note:'认识标点键'},{text:'a, b. c?',note:'认识标点键'}];
 tasks.push(...shuffled(PUNCTUATION_PHRASES,rng).slice(0,11).map(text=>({text,note:text.endsWith('?')?'问号提出问题':'逗号停一停，句号说完'})));
 return tasks;
}

function capitalLesson(rng){
 const names=shuffled(CAPITAL_WORDS,rng);
 const tasks=[];
 for(let i=0;i<names.length;i+=2) tasks.push({text:names.slice(i,i+2).join(' '),note:'对侧小指按住 Shift'});
 tasks.push(...shuffled(CAPITAL_SENTENCES,rng).slice(0,3).map(text=>({text,note:'句子开头用大写'})));
 return tasks;
}

export function keyLessonTasks(lesson, weakKeys, rng){
 if(lesson.id==='key-capitals') return capitalLesson(rng);
 if(lesson.id==='key-numbers') return numberLesson(lesson,rng);
 if(lesson.id==='key-punctuation') return punctuationLesson(rng);
 return letterLesson(lesson,weakKeys,rng);
}
