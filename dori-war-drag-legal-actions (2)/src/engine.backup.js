export const SIZE=12;
export const TYPES={MINI:'mini',MISSILE:'missile',CANNON:'cannon',LANCER:'lancer',KNIGHT:'knight',MEDIC:'medic',ARCHER:'archer',GUARDIAN:'guardian',DORI:'dori',KING:'king',BONE:'bone'};
export const SPECS={
 mini:{hp:3,score:1,count:6},missile:{hp:10,score:4,count:1},cannon:{hp:5,score:5,count:2},lancer:{hp:4,score:3,count:4},knight:{hp:5,score:3,count:2},medic:{hp:4,score:7,count:1},archer:{hp:4,score:4,count:4},guardian:{hp:30,score:6,count:1},dori:{hp:15,score:10,count:1},king:{hp:25,score:0,count:1}};
const inside=(r,c)=>r>=0&&r<SIZE&&c>=0&&c<SIZE; const key=(r,c)=>`${r},${c}`;
const dirs8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]; const knightDirs=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
export function makePiece(id,team,type,r,c){const s=SPECS[type];return {id,team,type,r,c,hp:s.hp,maxHp:s.hp,score:s.score,face:team==='white'?-1:1,bone:false,drone:0,buffs:{},debuffs:{},cooldowns:{},alive:true};}
export function createGame(){const pieces=[];let id=1;for(const team of ['white','black']){const home=team==='white'?10:1; const back=team==='white'?11:0; for(let i=0;i<6;i++)pieces.push(makePiece(`p${id++}`,team,'mini',home,2+i)); for(let i=0;i<4;i++)pieces.push(makePiece(`p${id++}`,team,'lancer',home- (team==='white'?1:-1),i)); for(let i=0;i<4;i++)pieces.push(makePiece(`p${id++}`,team,'archer',home- (team==='white'?1:-1),8+i)); pieces.push(makePiece(`p${id++}`,team,'missile',back,1)); pieces.push(makePiece(`p${id++}`,team,'cannon',back,3)); pieces.push(makePiece(`p${id++}`,team,'cannon',back,4)); pieces.push(makePiece(`p${id++}`,team,'knight',back,6)); pieces.push(makePiece(`p${id++}`,team,'knight',back,7)); pieces.push(makePiece(`p${id++}`,team,'medic',back,9)); pieces.push(makePiece(`p${id++}`,team,'guardian',back,10)); pieces.push(makePiece(`p${id++}`,team,'dori',back,5)); pieces.push(makePiece(`p${id++}`,team,'king',back,11));}return {size:SIZE,turn:'white',turnNo:1,pieces,history:[],redo:[],missiles:[],bones:[],winner:null,log:[]};}
export function pieceAt(g,r,c){return g.pieces.find(p=>p.alive&&p.r===r&&p.c===c)||null;}
const empty=(g,r,c)=>inside(r,c)&&!pieceAt(g,r,c);
function line(g,p,dr,dc,max=SIZE){const a=[];for(let i=1;i<=max;i++){const r=p.r+dr*i,c=p.c+dc*i;if(!inside(r,c))break;const q=pieceAt(g,r,c);if(q){if(q.team!==p.team)a.push({r,c,capture:q.id});break;}a.push({r,c});}return a;}
function doriMove(g,p){const out=[];const add=(r,c,tele=false)=>{if(inside(r,c)&&empty(g,r,c))out.push({r,c,teleport:tele});}; if(p.drone===7||p.drone>=8){for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)add(r,c,true);} for(const [dr,dc] of knightDirs)add(p.r+dr,p.c+dc); if(p.drone>=1&&p.drone<=3||p.drone>=8)for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]])out.push(...line(g,p,dr,dc)); if(p.drone>=4&&p.drone<=6||p.drone===10)for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1],...[[1,1],[1,-1],[-1,1],[-1,-1]]])out.push(...line(g,p,dr,dc)); return out;}
export function legalMoves(g,id){const p=g.pieces.find(x=>x.id===id&&x.alive);if(!p||p.team!==g.turn)return[];const out=[];const add=(r,c,extra={})=>{if(!inside(r,c))return;const q=pieceAt(g,r,c);if(!q)out.push({r,c,...extra});else if(q.team!==p.team)out.push({r,c,capture:q.id,...extra});};
if(p.type==='mini'){add(p.r+p.face,p.c);add(p.r-p.face,p.c);for(const dc of [-1,1]){const q=pieceAt(g,p.r+p.face,p.c+dc);if(q&&q.team!==p.team)out.push({r:p.r+p.face,c:p.c+dc,capture:q.id,attack:true});}if([-1,1].some(dc=>pieceAt(g,p.r,p.c+dc)?.team===p.team)){const mid=p.r+p.face;add(mid,p.c);add(p.r+2*p.face,p.c,{push:1});}}
else if(p.type==='missile'||p.type==='king'||p.type==='medic'||p.type==='guardian'){for(const [dr,dc] of dirs8){add(p.r+dr,p.c+dc);if((p.type==='guardian')&&dc!==0)add(p.r+dr,p.c+2*dc);} }
else if(p.type==='cannon'){for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){add(p.r+dr,p.c+dc);add(p.r+2*dr,p.c+2*dc);}}
else if(p.type==='lancer'){add(p.r+p.face,p.c,{face:p.face});add(p.r-p.face,p.c,{face:-p.face});}
else if(p.type==='knight'){for(const [dr,dc] of [...knightDirs,[2,0],[-2,0],[0,2],[0,-2]])add(p.r+dr,p.c+dc);}
else if(p.type==='archer'){for(const dc of [-1,1])out.push(...line(g,p,0,dc));for(const dr of [-1,1])add(p.r+dr,p.c);}
else if(p.type==='dori')out.push(...doriMove(g,p));
if(p.type==='bone'){}
return dedupe(out);}
function dedupe(a){const seen=new Set();return a.filter(x=>{const k=`${x.r},${x.c}`;if(seen.has(k))return false;seen.add(k);return true;});}
export function legalAttacks(g,id){const p=g.pieces.find(x=>x.id===id&&x.alive);if(!p||p.team!==g.turn)return[];const out=[];const hit=(r,c,dmg,extra={})=>{const q=pieceAt(g,r,c);if(q&&q.team!==p.team)out.push({target:q.id,r,c,damage:dmg,...extra});};const dmg=(base)=>base+(p.bone?1:0);
function pathClear(g,p,q){const dr=Math.sign(q.r-p.r),dc=Math.sign(q.c-p.c);let r=p.r+dr,c=p.c+dc;while(r!==q.r||c!==q.c){if(pieceAt(g,r,c))return false;r+=dr;c+=dc;}return true;}
if(p.type==='mini'){for(const dc of [-1,1])hit(p.r+p.face,p.c+dc,dmg(1));}
if(p.type==='cannon'){const [dr,dc]=p.face===-1?[-1,0]:[1,0];for(let i=1;i<=4;i++){const q=pieceAt(g,p.r+dr*i,p.c+dc*i);if(q){if(q.team!==p.team)out.push({target:q.id,r:q.r,c:q.c,damage:dmg(3),splash:{r:q.r,c:q.c,range:1,damage:dmg(1)}});break;}}}
if(p.type==='lancer'){for(const [dr,dc] of [[p.face,0]]){for(let i=1;i<=4;i++){const q=pieceAt(g,p.r+dr*i,p.c+dc*i);if(q&&q.team!==p.team)out.push({target:q.id,r:q.r,c:q.c,damage:dmg(1+i),charge:true});else if(q)break;}}for(const [dr,dc] of dirs8)hit(p.r+dr,p.c+dc,dmg(1));}
if(p.type==='knight')for(const [dr,dc] of [...knightDirs,[2,0],[-2,0],[0,2],[0,-2]])hit(p.r+dr,p.c+dc,dmg(2));
if(p.type==='archer'){for(const q of g.pieces.filter(x=>x.alive&&x.team!==p.team)){const dist=Math.max(Math.abs(q.r-p.r),Math.abs(q.c-p.c));const clear=(q.r===p.r||q.c===p.c)?pathClear(g,p,q):true;if(clear)out.push({target:q.id,r:q.r,c:q.c,damage:dmg(dist<=1?3:dist<=2?3:dist<=4?2:1),push:dist<=1?3:dist<=2?2:dist<=4?1:0});}}
if(p.type==='medic')for(const q of g.pieces.filter(x=>x.alive&&x.team===p.team))out.push({target:q.id,r:q.r,c:q.c,heal:q.id===p.id?3:(Math.max(Math.abs(q.r-p.r),Math.abs(q.c-p.c))<=1?2:1)});
if(p.type==='guardian')for(const q of g.pieces.filter(x=>x.alive&&x.team===p.team&&q.id!==p.id))out.push({target:q.id,r:q.r,c:q.c,protect:true});
if(p.type==='dori'){const base=p.drone===10?5:p.drone>=7?4:p.drone>=4?3:p.drone>=1?2:1;const range=p.drone===10?'queen':p.drone>=1?'rook':'knight';for(const q of g.pieces.filter(x=>x.alive&&x.team!==p.team)){let ok=range==='knight'?knightDirs.some(([dr,dc])=>q.r===p.r+dr&&q.c===p.c+dc):range==='rook'?(q.r===p.r||q.c===p.c):(q.r===p.r||q.c===p.c||Math.abs(q.r-p.r)===Math.abs(q.c-p.c));if(ok)out.push({target:q.id,r:q.r,c:q.c,damage:dmg(base),dori:true});}}
if(p.type==='king')for(const [dr,dc] of dirs8)hit(p.r+dr,p.c+dc,dmg(1));return out;}
export function applyAction(g,action){const p=g.pieces.find(x=>x.id===action.id&&x.alive);if(!p||p.team!==g.turn)throw Error('invalid turn');const before=structuredClone(g);if(action.kind==='move'){const m=legalMoves(g,p.id).find(x=>x.r===action.r&&x.c===action.c);if(!m)throw Error('illegal move');p.r=action.r;p.c=action.c;if(m.face)p.face=m.face;if(m.push){const q=pieceAt(g,p.r,p.c);if(q)push(g,q,p.face,1);}}
else if(action.kind==='attack'){const a=legalAttacks(g,p.id).find(x=>x.target===action.target);if(!a)throw Error('illegal attack');resolveAttack(g,p,a);}
else if(action.kind==='ability'){useAbility(g,p,action);}
endTurn(g);g.history.push({before,action:structuredClone(action),after:structuredClone(g)});g.redo=[];return g;}
function push(g,q,dr,dist){for(let i=0;i<dist;i++){const r=q.r+dr,c=q.c;if(!inside(r,c)||pieceAt(g,r,c))break;q.r=r;q.c=c;}}
function resolveAttack(g,p,a){if(a.heal){const q=g.pieces.find(x=>x.id===a.target);q.hp=Math.min(q.maxHp,q.hp+a.heal);return}const q=g.pieces.find(x=>x.id===a.target);if(!q)return;let damage=a.damage;if(q.buffs.invulnerable){delete q.buffs.invulnerable;damage=0;}if(q.buffs.guard){damage=Math.floor(damage*.75);}q.hp-=damage;if(a.push&&q.hp>0)push(g,q,q.team===p.team?1:-1,a.push);if(q.hp<=0){q.alive=false;if(p.type==='dori'&&a.dori&&a.target===q.id)p.drone=Math.min(10,p.drone+1);if(q.type==='king')g.winner=p.team;}}
function useAbility(g,p,a){if(p.type==='missile'){if(g.missiles.some(x=>x.owner===p.id))throw Error('missile already reserved');g.missiles.push({owner:p.id,team:p.team,r:a.r,c:a.c,dropTurn:g.turnNo+4,revealedAt:g.turnNo+3,cooldown:6});}else if(p.type==='guardian'){const q=g.pieces.find(x=>x.id===a.target);if(q&&q.team===p.team){if(a.mode==='reduce')q.buffs.guard=3;if(a.mode==='immune')q.buffs.invulnerable=true;if(a.mode==='redirect')q.buffs.redirect={owner:p.id,until:g.turnNo+4};}}else if(p.type==='medic'){for(const q of g.pieces.filter(x=>x.alive&&x.team===p.team)){const d=Math.max(Math.abs(q.r-p.r),Math.abs(q.c-p.c));q.hp=Math.min(q.maxHp,q.hp+(q.id===p.id?3:d<=1?2:d<=2?1:0));}}}
function endTurn(g){for(const p of g.pieces)for(const k of Object.keys(p.buffs)){p.buffs[k]--;if(p.buffs[k]<=0)delete p.buffs[k];}for(const m of g.missiles.filter(x=>x.dropTurn===g.turnNo+1)){for(const q of g.pieces.filter(x=>x.alive&&x.team!==m.team&&Math.abs(q.r-m.r)<=1&&Math.abs(q.c-m.c)<=1))q.hp-=5;}g.turn=g.turn==='white'?'black':'white';g.turnNo++;}
export function undo(g){const h=g.history.pop();if(!h)return g;Object.assign(g,structuredClone(h.before));g.redo.push(h);return g;} export function redo(g){const h=g.redo.pop();if(!h)return g;Object.assign(g,structuredClone(h.after));g.history.push(h);return g;}

// Advanced rule helpers (v2): missile reveal/drop, cooldowns, medic potion,
// guardian redirect, and Dori timed debuffs.
export function advanceEffects(g){
  for(const p of g.pieces){
    for(const bucket of ['buffs','debuffs']) for(const k of Object.keys(p[bucket])){
      const v=p[bucket][k]; if(v&&typeof v==='object'&&'until' in v){if(g.turnNo>=v.until)delete p[bucket][k];}
      else if(typeof v==='number'){p[bucket][k]=v-1;if(p[bucket][k]<=0)delete p[bucket][k];}
    }
    for(const k of Object.keys(p.cooldowns)){p.cooldowns[k]--;if(p.cooldowns[k]<=0)delete p.cooldowns[k];}
  }
  for(const m of g.missiles){m.revealed=g.turnNo>=m.revealedAt;}
  const dropping=g.missiles.filter(m=>m.dropTurn===g.turnNo);
  for(const m of dropping){
    for(const q of g.pieces.filter(x=>x.alive&&x.team!==m.team&&Math.abs(x.r-m.r)<=1&&Math.abs(x.c-m.c)<=1)) damagePiece(g,q,5,null);
    m.done=true;
  }
  g.missiles=g.missiles.filter(m=>!m.done);
}
function damagePiece(g,q,amount,source){
  let d=amount;
  if(q.buffs.guard) d=Math.floor(d*.75);
  if(q.buffs.invulnerable){delete q.buffs.invulnerable;d=0;}
  if(q.buffs.redirect&&source){const owner=g.pieces.find(x=>x.id===q.buffs.redirect.owner&&x.alive);if(owner){damagePiece(g,owner,d,source);return;}}
  q.hp-=d;if(q.hp<=0){q.hp=0;q.alive=false;if(q.type==='king')g.winner=source?.team||null;}
}
