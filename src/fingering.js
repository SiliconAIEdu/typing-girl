// Finger IDs run from the left little finger to the right little finger;
// 8 and 9 are the left and right thumbs. One mapping drives all three hints.
export const fingerNames=['左手小指','左手无名指','左手中指','左手食指','右手食指','右手中指','右手无名指','右手小指','左手拇指','右手拇指'];
const groups=['qaz1`','wsx2','edc3','rfvtgb45','yuhjnm67','ik,8','ol.9',"p;/0-=[]\\'"];
const shifted={'~':'`','!':'1','@':'2','#':'3','$':'4','%':'5','^':'6','&':'7','*':'8','(':'9',')':'0','_':'-','+':'=','{':'[','}':']','|':'\\',':':';','"':"'",'<':',','>':'.','?':'/'};
export function keyInfo(target=''){
 const base=shifted[target]||target.toLowerCase();
 const index=groups.findIndex(g=>g.includes(base));
 const shift=!!shifted[target]||/^[A-Z]$/.test(target);
 const shiftFinger=shift?(index<4?7:0):null;
 const fingers=target===' '?[8,9]:index<0?[]:[index,...(shift?[shiftFinger]:[])];
 const name=target===' '?'用任一拇指轻按空格':index<0?'找到对应的键':`${fingerNames[index]} → ${base.toUpperCase()} 键${shift?' · '+fingerNames[shiftFinger]+'按 Shift':''}`;
 return{base,index,shift,shiftFinger,fingers,name};
}
export function handsMarkup(){
 // Nail centres and label anchors are measured against the original 1147 × 1372 artwork.
 // Mirror the artwork and coordinates together; keep text upright and finger IDs anatomical.
 const points=[[262,320,220,210],[435,145,395,15],[558,59,570,-65],[715,149,760,15],[955,560,1045,445]];
 const hand=(right)=>{
  const ids=right?[7,6,5,4,9]:[0,1,2,3,8];
  const letters=right?[';','L','K','J','␣']:['A','S','D','F','␣'];
  const x=(value)=>right?1147-value:value;
  return `<div class="hand-figure"><svg class="typing-hand" viewBox="0 -130 1147 1610" role="img" aria-label="${right?'右':'左'}手五指与基准键"><image class="hand-art" href="./public/art/typing-hand-left.png" width="1147" height="1372" ${right?'transform="translate(1147 0) scale(-1 1)"':''}/>${points.map(([nx,ny,lx,ly],i)=>`<g class="finger-marker" data-finger="${ids[i]}"><line class="finger-leader" x1="${x(nx)}" y1="${ny}" x2="${x(lx)}" y2="${ly}"/><circle class="finger-tip-ring" cx="${x(nx)}" cy="${ny}" r="57"/><circle class="finger-badge" cx="${x(lx)}" cy="${ly}" r="58"/><text class="finger-letter" data-finger-label="${ids[i]}" x="${x(lx)}" y="${ly}" dy=".35em">${letters[i]}</text></g>`).join('')}<text class="hand-name" x="573.5" y="1465">${right?'右手':'左手'}</text></svg></div>`;
 };
 return `<section class="hands-guide" aria-label="双手指法示意"><div class="hands-pair">${hand(false)}<div class="hand-coach"><span class="hand-coach-label">FOLLOW YOUR FINGERS</span><strong id="finger-caption">双手轻轻放好</strong><span id="finger-detail">F 和 J 的小凸点，是食指的起点。</span><span class="home-position">左手 A S D F · 右手 J K L ;</span></div>${hand(true)}</div></section>`;
}
