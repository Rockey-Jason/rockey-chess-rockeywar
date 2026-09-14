/* DORI WAR — Rules Engine v2
 * Pure browser-safe ES module. No DOM, no external dependencies.
 * Board: 12x12. One action per turn. King Dori HP reaching 0 ends the game.
 */
export const SIZE = 12;
export const TEAMS = Object.freeze(['white','black']);
export const TYPES = Object.freeze({
  MINI:'mini', MISSILE:'missile', CANNON:'cannon', LANCER:'lancer', KNIGHT:'knight',
  MEDIC:'medic', ARCHER:'archer', GUARDIAN:'guardian', DORI:'dori', KING:'king'
});
export const SPECS = Object.freeze({
  mini:{hp:3,score:1,count:6}, missile:{hp:10,score:4,count:1}, cannon:{hp:5,score:5,count:2},
  lancer:{hp:4,score:3,count:4}, knight:{hp:5,score:3,count:2}, medic:{hp:4,score:7,count:1},
  archer:{hp:4,score:4,count:4}, guardian:{hp:30,score:6,count:1}, dori:{hp:15,score:10,count:1}, king:{hp:25,score:0,count:1}
});

const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const KING_DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const QUEEN_DIRS = [...ROOK_DIRS,[-1,-1],[-1,1],[1,-1],[1,1]];
const STRAIGHT_2 = [[-2,0],[2,0],[0,-2],[0,2]];
const CHEB = (a,b) => Math.max(Math.abs(a),Math.abs(b));
const inside = (r,c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const clone = x => typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));
// Performance layer: immutable-per-state indexes + legal-action cache.
// These live outside the serialized game state, so save files stay backwards-compatible.
const INDEX_CACHE = new WeakMap();
const LEGAL_CACHE = new WeakMap();
function indexFor(g){
  let x=INDEX_CACHE.get(g);
  if(x) return x;
  x={pieces:new Map(),board:new Array(SIZE*SIZE).fill(null)};
  for(const p of g.pieces){
    x.pieces.set(p.id,p);
    if(isAlive(p) && inside(p.r,p.c)) x.board[p.r*SIZE+p.c]=p;
  }
  INDEX_CACHE.set(g,x); return x;
}
function invalidate(g){ INDEX_CACHE.delete(g); LEGAL_CACHE.delete(g); }
function legalCacheFor(g){
  let x=LEGAL_CACHE.get(g);
  if(!x){x=new Map();LEGAL_CACHE.set(g,x);}
  return x;
}


function mkPiece(id, team, type, r, c) {
  const hp = SPECS[type].hp;
  const forward = team === 'white' ? -1 : 1;
  return {
    id, team, type, r, c, hp, maxHp:hp, alive:true,
    face:forward, faceDir:[forward,0], chargeDir:forward, lastMoveDir:forward,
    gauge:0, bone:false,
    buffs:{}, debuffs:{}, cooldowns:{},
    stats:{damageDealt:0, damageTaken:0, healingDone:0, kills:0}
  };
}

export function createGame() {
  const pieces=[]; let n=1;
  for (const team of TEAMS) {
    const home = team === 'white' ? 10 : 1;
    const back = team === 'white' ? 11 : 0;
    const f = team === 'white' ? -1 : 1;
    for (let i=0;i<6;i++) pieces.push(mkPiece(`p${n++}`,team,TYPES.MINI,home,2+i));
    for (let i=0;i<4;i++) pieces.push(mkPiece(`p${n++}`,team,TYPES.LANCER,home+f,i));
    for (let i=0;i<4;i++) pieces.push(mkPiece(`p${n++}`,team,TYPES.ARCHER,home+f,8+i));
    for (const [type,c] of [['missile',1],['cannon',3],['cannon',4],['knight',6],['knight',7],['medic',9],['guardian',10],['dori',5],['king',11]])
      pieces.push(mkPiece(`p${n++}`,team,type,back,c));
  }
  return {
    size:SIZE, turn:'white', turnNo:1, ply:1,
    pieces, missiles:[], bones:[], history:[], redo:[], winner:null,
    lastAction:null, log:[], scores:{white:0,black:0}, events:[]
  };
}

export const getPiece = (g,id) => indexFor(g).pieces.get(id) || null;
export const pieceAt = (g,r,c) => inside(r,c) ? (indexFor(g).board[r*SIZE+c] || null) : null;
const own = (g,p,r,c) => { const q=pieceAt(g,r,c); return q && q.team===p.team ? q : null; };
const foe = (g,p,r,c) => { const q=pieceAt(g,r,c); return q && q.team!==p.team ? q : null; };
const isAlive = p => !!p && p.alive && p.hp > 0;

function addMove(g,p,out,r,c,meta={}) {
  if (!inside(r,c) || pieceAt(g,r,c)) return;
  out.push({kind:'move',id:p.id,r,c,...meta});
}
function rayEmptyMoves(g,p,out,dirs,max=SIZE-1) {
  for (const [dr,dc] of dirs) for(let i=1;i<=max;i++) {
    const r=p.r+dr*i,c=p.c+dc*i;
    if(!inside(r,c) || pieceAt(g,r,c)) break;
    out.push({kind:'move',id:p.id,r,c});
  }
}
function rayTargets(g,p,out,dirs,max=SIZE-1,damage=1,meta={}) {
  for(const [dr,dc] of dirs) for(let i=1;i<=max;i++) {
    const r=p.r+dr*i,c=p.c+dc*i;
    if(!inside(r,c)) break;
    const q=pieceAt(g,r,c);
    if(q){ if(q.team!==p.team) out.push({kind:'attack',id:p.id,target:q.id,r,c,damage,...meta}); break; }
  }
}
function doriTier(gauge) {
  if(gauge<=0) return 0; if(gauge<=3) return 1; if(gauge<=6) return 2; if(gauge===7) return 3; if(gauge<=9) return 4; return 5;
}
function doriMoveMode(gauge){
  if(gauge===0) return {ray:[],teleport:false};
  if(gauge<=3) return {ray:ROOK_DIRS,teleport:false};
  if(gauge<=6) return {ray:QUEEN_DIRS,teleport:false};
  if(gauge===7) return {ray:[],teleport:true};
  if(gauge<=9) return {ray:ROOK_DIRS,teleport:true};
  return {ray:QUEEN_DIRS,teleport:true};
}
function doriDamage(gauge){ return gauge===10?5:gauge>=7?4:gauge>=4?3:gauge>=1?2:1; }
function doriAttackDirs(gauge){
  if(gauge===0) return KNIGHT;
  if(gauge<=3) return [...ROOK_DIRS,...KNIGHT];
  if(gauge<=6) return [...QUEEN_DIRS,...KNIGHT];
  if(gauge<=9) return [...ROOK_DIRS,...KNIGHT];
  return [...QUEEN_DIRS,...KNIGHT];
}

function computeLegalMoves(g,id){
  const p=getPiece(g,id); if(!isAlive(p)||p.team!==g.turn||g.winner) return [];
  const out=[];
  if(p.type==='mini') {
    addMove(g,p,out,p.r+p.face,p.c);
    addMove(g,p,out,p.r-p.face,p.c);
    if([p.c-1,p.c+1].some(c=>own(g,p,p.r,c))) addMove(g,p,out,p.r+2*p.face,p.c,{doubleStep:true});
  } else if(p.type==='missile') {
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr||dc) addMove(g,p,out,p.r+dr,p.c+dc);
  } else if(p.type==='cannon') {
    for(const [dr,dc] of ROOK_DIRS) for(let i=1;i<=2;i++){
      const r=p.r+dr*i,c=p.c+dc*i;
      if(!inside(r,c)||pieceAt(g,r,c))break;
      out.push({kind:'move',id:p.id,r,c,newFaceDir:[dr,dc]});
    }
  } else if(p.type==='lancer') {
    addMove(g,p,out,p.r+p.face,p.c,{newFace:p.face});
    addMove(g,p,out,p.r-p.face,p.c,{newFace:-p.face});
  } else if(p.type==='knight') {
    for(const [dr,dc] of [...KNIGHT,...STRAIGHT_2]) addMove(g,p,out,p.r+dr,p.c+dc);
  } else if(p.type==='medic'||p.type==='king') {
    for(const [dr,dc] of KING_DIRS) addMove(g,p,out,p.r+dr,p.c+dc);
  } else if(p.type==='guardian') {
    for(const [dr,dc] of KING_DIRS) addMove(g,p,out,p.r+dr,p.c+dc);
    addMove(g,p,out,p.r,p.c+2,{horizontal:true});
    addMove(g,p,out,p.r,p.c-2,{horizontal:true});
  } else if(p.type==='archer') {
    rayEmptyMoves(g,p,out,[[0,1],[0,-1]]);
    addMove(g,p,out,p.r+p.face,p.c,{newFace:p.face});
    addMove(g,p,out,p.r-p.face,p.c,{newFace:-p.face});
  } else if(p.type==='dori') {
    for(const [dr,dc] of KNIGHT) addMove(g,p,out,p.r+dr,p.c+dc);
    const mode=doriMoveMode(p.gauge);
    if(mode.ray.length) rayEmptyMoves(g,p,out,mode.ray);
    if(mode.teleport) for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) if(!pieceAt(g,r,c)) out.push({kind:'move',id:p.id,r,c,teleport:true});
  }
  return dedupe(out);
}

function dedupe(a){const m=new Map();for(const x of a)m.set(`${x.kind}:${x.r}:${x.c}:${x.target||''}:${x.ability||''}:${x.attackType||''}`,x);return [...m.values()];}

function computeLegalAttacks(g,id){
  const p=getPiece(g,id); if(!isAlive(p)||p.team!==g.turn||g.winner) return [];
  const out=[]; const bonus=p.bone?1:0;
  const add=(q,damage,meta={})=>{if(q&&q.team!==p.team)out.push({kind:'attack',id:p.id,target:q.id,r:q.r,c:q.c,damage:damage+bonus,...meta});};
  if(p.type==='mini') {
    for(const dc of [-1,1]) add(foe(g,p,p.r+p.face,p.c+dc),1,{attackType:'mini-diagonal'});
    const last=g.lastAction;
    if(last?.kind==='move' && last.pieceType==='mini' && last.team!==p.team && last.doubleStep && last.to.r===p.r && Math.abs(last.to.c-p.c)===1){
      const q=getPiece(g,last.id); if(isAlive(q)) out.push({kind:'attack',id:p.id,target:q.id,r:q.r,c:q.c,damage:1+bonus,attackType:'en-passant',enPassant:true});
    }
  } else if(p.type==='cannon') {
    const [dr,dc]=p.faceDir||[p.face,0];
    for(let i=1;i<=4;i++){ const q=pieceAt(g,p.r+dr*i,p.c+dc*i); if(q){ if(q.team!==p.team)add(q,3,{attackType:'cannon',dir:[dr,dc],distance:i}); break; } }
  } else if(p.type==='lancer') {
    const [dr,dc]=[p.chargeDir,0];
    let consecutive=0;
    for(let i=1;i<=4;i++){
      const r=p.r+dr*i,c=p.c;
      if(!inside(r,c)) break;
      const q=pieceAt(g,r,c);
      if(q?.team===p.team) break;
      if(q?.team!==p.team){ add(q,2+consecutive,{attackType:'lancer-charge',distance:i,consecutive}); consecutive++; }
    }
    for(const [dr2,dc2] of KING_DIRS) add(foe(g,p,p.r+dr2,p.c+dc2),1,{attackType:'lancer-adjacent'});
  } else if(p.type==='knight') {
    for(const [dr,dc] of [...KNIGHT,...STRAIGHT_2]) add(pieceAt(g,p.r+dr,p.c+dc),2,{attackType:'knight'});
  } else if(p.type==='archer') {
    for(const q of aliveEnemies(g,p.team)){
      const d=CHEB(q.r-p.r,q.c-p.c);
      if(d>=0 && d<=1) add(q,3,{attackType:'archer',push:3});
      else if(d<=2) add(q,3,{attackType:'archer',push:2});
      else if(d<=4) add(q,2,{attackType:'archer',push:1});
      else add(q,1,{attackType:'archer',push:0});
    }
  } else if(p.type==='dori') {
    const dmg=doriDamage(p.gauge);
    for(const [dr,dc] of doriAttackDirs(p.gauge)){
      for(let i=1;i<SIZE;i++){
        const r=p.r+dr*i,c=p.c+dc*i;if(!inside(r,c))break;
        const q=pieceAt(g,r,c); if(q){if(q.team!==p.team)add(q,dmg,{attackType:'dori',tier:doriTier(p.gauge),distance:i});break;}
      }
    }
  } else if(p.type==='king') {
    for(const [dr,dc] of KING_DIRS) add(foe(g,p,p.r+dr,p.c+dc),1,{attackType:'king'});
  }
  return dedupe(out);
}

function computeLegalAbilities(g,id){
  const p=getPiece(g,id); if(!isAlive(p)||p.team!==g.turn||g.winner)return[];
  const a=[];
  if(p.type==='missile' && !onCooldown(g,p,'missile')) a.push({kind:'ability',id,ability:'missile'});
  if(p.type==='medic'){
    a.push({kind:'ability',id,ability:'heal'});
    if(!onCooldown(g,p,'potion')) a.push({kind:'ability',id,ability:'potion'});
  }
  if(p.type==='dori' && p.gauge===10) a.push({kind:'ability',id,ability:'dori-teleport-attack'});
  if(p.type==='guardian'){
    if(!onCooldown(g,p,'reduce'))a.push({kind:'ability',id,ability:'guard-reduce'});
    if(!onCooldown(g,p,'immune'))a.push({kind:'ability',id,ability:'guard-immune'});
    if(!onCooldown(g,p,'redirect'))a.push({kind:'ability',id,ability:'guard-redirect'});
  }
  return a;
}

export function legalMoves(g,id){
  const key=`m:${id}:${g.turnNo}`;
  const c=legalCacheFor(g); if(c.has(key)) return c.get(key);
  const v=computeLegalMoves(g,id); c.set(key,v); return v;
}
export function legalAttacks(g,id){
  const key=`a:${id}:${g.turnNo}`;
  const c=legalCacheFor(g); if(c.has(key)) return c.get(key);
  const v=computeLegalAttacks(g,id); c.set(key,v); return v;
}
export function legalAbilities(g,id){
  const key=`b:${id}:${g.turnNo}`;
  const c=legalCacheFor(g); if(c.has(key)) return c.get(key);
  const v=computeLegalAbilities(g,id); c.set(key,v); return v;
}

function onCooldown(g,p,key){ return Number.isFinite(p.cooldowns[key]) && p.cooldowns[key] > g.turnNo; }
function setCooldown(p,key,turns,currentTurn){ p.cooldowns[key]=currentTurn+turns; }
function effectActive(p,bag,key,currentTurn){ const x=p[bag]?.[key]; return !!x && x.until>currentTurn; }
function setEffect(p,bag,key,duration,currentTurn,data={}){ p[bag][key]={...data,appliedTurn:currentTurn,until:currentTurn+duration}; }
function removeExpired(g){
  for(const p of g.pieces){
    for(const bagName of ['buffs','debuffs']){
      for(const [k,v] of Object.entries(p[bagName])) if(v.until<=g.turnNo) delete p[bagName][k];
    }
  }
}

function aliveEnemies(g,team){return g.pieces.filter(p=>isAlive(p)&&p.team!==team);}
function aliveAllies(g,team){return g.pieces.filter(p=>isAlive(p)&&p.team===team);}
function healPiece(g,target,amount,source,ctx={}){
  if(!isAlive(target)||amount<=0)return 0;
  const actual=Math.max(0,Math.min(amount,target.maxHp-target.hp));
  target.hp+=actual;
  if(source)source.stats.healingDone+=actual;
  return actual;
}
function boneDamageBonus(p){return p.bone?1:0;}

function resolveDamage(g,target,rawDamage,source,ctx={}){
  if(!isAlive(target)||rawDamage<=0)return {damage:0,killed:false,redirected:false,immune:false};
  let damage=Math.max(0,Math.floor(rawDamage));
  // Damage redirection is checked first. Redirected damage is then processed normally on Guardian.
  const red=effectActive(target,'buffs','redirect',g.turnNo);
  if(red && !ctx.redirected){
    const guardian=getPiece(g,target.buffs.redirect.owner);
    if(isAlive(guardian)) return resolveDamage(g,guardian,damage,source,{...ctx,redirected:true,originalTarget:target.id});
  }
  // One-hit immunity applies to the entire attack, including every direct/extra damage component.
  const immuneSeen=ctx.immuneSeen || new Set();
  if(effectActive(target,'buffs','immune',g.turnNo) || immuneSeen.has(target.id)){
    immuneSeen.add(target.id);
    if(effectActive(target,'buffs','immune',g.turnNo)) delete target.buffs.immune;
    return {damage:0,killed:false,redirected:!!ctx.redirected,immune:true};
  }
  if(effectActive(target,'buffs','reduce',g.turnNo)) damage=Math.floor(damage*0.75);
  // Permanent attack reduction is represented on the attacker, not by changing the attack itself here.
  target.hp-=damage;
  target.stats.damageTaken+=damage;
  if(source?.stats)source.stats.damageDealt+=damage;
  let killed=false;
  if(target.hp<=0){
    target.hp=0; target.alive=false; killed=true;
    if(source?.stats)source.stats.kills++; if(source?.team)g.scores[source.team]+=SPECS[target.type].score;
    if(target.type==='king') g.winner=source?.team || (ctx.team||null);
  }
  return {damage,killed,redirected:!!ctx.redirected,immune:false};
}

function effectiveAttackDamage(g,attacker,base){
  let d=base + boneDamageBonus(attacker);
  if(effectActive(attacker,'debuffs','attack-down',g.turnNo)) d=Math.max(0,d-attacker.debuffs['attack-down'].amount);
  if(effectActive(attacker,'debuffs','attack-down-permanent',g.turnNo)) d=Math.max(0,d-attacker.debuffs['attack-down-permanent'].amount);
  return Math.max(0,d);
}
function effectiveHealingAmount(g,healer,base){
  if(effectActive(healer,'debuffs','heal-down',g.turnNo)) return Math.max(0,base-healer.debuffs['heal-down'].amount);
  if(effectActive(healer,'debuffs','heal-down-permanent',g.turnNo)) return Math.max(0,base-healer.debuffs['heal-down-permanent'].amount);
  return base;
}

function pushAlong(g,target,dr,dc,distance){
  if(!isAlive(target)||distance<=0)return 0;
  let moved=0;
  for(let i=0;i<distance;i++){
    const nr=target.r+dr,nc=target.c+dc;
    if(!inside(nr,nc)||pieceAt(g,nr,nc))break;
    target.r=nr;target.c=nc;moved++;
  }
  return moved;
}
function pushBackward(g,target,distance){ return pushAlong(g,target,-target.face,0,distance); }
function pushAway(g,target,fromR,fromC,distance){
  const dr=Math.sign(target.r-fromR), dc=Math.sign(target.c-fromC);
  return pushAlong(g,target,dr,dc,distance);
}

function applyDirectHit(g,attacker,target,baseDamage,ctx={}){
  const damage=effectiveAttackDamage(g,attacker,baseDamage);
  const result=resolveDamage(g,target,damage,attacker,ctx);
  return result;
}
function areaDamage(g,center,team,damage,radius,source,ctx={}){
  const victims=aliveEnemies(g,team).filter(q=>CHEB(q.r-center.r,q.c-center.c)<=radius);
  const results=[];
  for(const q of victims) results.push({target:q,...resolveDamage(g,q,effectiveAttackDamage(g,source,damage),source,{...ctx,extra:true,area:true,immuneSeen:ctx.immuneSeen||new Set()})});
  return results;
}

function sameHpTargets(g,team,hp){return aliveEnemies(g,team).filter(q=>q.hp===hp);}

function resolveMissilesAtStart(g){
  for(const m of g.missiles){
    if(m.done)continue;
    if(!m.revealed && g.turnNo>=m.revealTurn)m.revealed=true;
    if(g.turnNo>=m.dropTurn){
      const center={r:m.r,c:m.c};
      const source={team:m.team,type:'missile',id:m.ownerId};
      for(const q of aliveEnemies(g,m.team).filter(x=>CHEB(x.r-center.r,x.c-center.c)<=1)) resolveDamage(g,q,5,source,{extra:true,missile:true,team:m.team});
      m.done=true; m.resolvedTurn=g.turnNo;
      g.events.push({type:'missile-explosion',turn:g.turnNo,team:m.team,r:m.r,c:m.c});
    }
  }
}

function beginTurn(g){
  removeExpired(g);
  resolveMissilesAtStart(g);
  invalidate(g);
}
function endTurn(g,action){
  g.lastAction=action;
  g.turn=g.turn==='white'?'black':'white';
  g.turnNo+=1; g.ply+=1;
  beginTurn(g);
}

function validateTarget(g,id,team,opts={}){
  const q=getPiece(g,id);
  if(!isAlive(q)||q.team!==team)return false;
  if(opts.notKing && q.type==='king')return false;
  if(opts.maxRange!=null && CHEB(q.r-opts.r,q.c-opts.c)>opts.maxRange)return false;
  return true;
}

function movePiece(g,p,m){
  const old={r:p.r,c:p.c}; p.r=m.r;p.c=m.c;
  if(m.newFace) { p.face=m.newFace; p.faceDir=[m.newFace,0]; }
  if(m.newFaceDir) p.faceDir=m.newFaceDir;
  if(p.type==='lancer' && m.newFace) p.chargeDir=m.newFace;
  p.lastMoveDir={r:Math.sign(m.r-old.r),c:Math.sign(m.c-old.c)};
  return old;
}

function executeMove(g,p,a){
  const m=legalMoves(g,p.id).find(x=>x.r===a.r&&x.c===a.c);
  if(!m)throw new Error('불법 이동입니다.');
  const old=movePiece(g,p,m);
  invalidate(g);
  const bone=g.bones.find(b=>b.alive!==false&&b.r===p.r&&b.c===p.c);
  if(bone){ p.bone=true; bone.alive=false; }
  const doubleStep=p.type==='mini' && Math.abs(m.r-old.r)===2;
  return {kind:'move',id:p.id,team:p.team,pieceType:p.type,from:old,to:{r:p.r,c:p.c},doubleStep};
}

function executeAttack(g,p,a){
  const spec=legalAttacks(g,p.id).find(x=>x.target===a.target);
  if(!spec)throw new Error('불법 공격입니다.');
  const target=getPiece(g,spec.target); if(!isAlive(target))throw new Error('대상이 없습니다.');
  const attack={kind:'attack',id:p.id,team:p.team,pieceType:p.type,attackType:spec.attackType,target:target.id,from:{r:p.r,c:p.c},damage:spec.damage};
  const attackCtx={attackId:`a-${g.ply}-${p.id}`,immuneSeen:new Set()};

  if(p.type==='lancer' && spec.attackType==='lancer-charge'){
    const dir=[p.chargeDir,0];
    const path=[]; let stop=4;
    for(let i=1;i<=4;i++){
      const r=p.r+dir[0]*i,c=p.c;
      if(!inside(r,c)){stop=i-1;break;}
      const q=pieceAt(g,r,c);
      if(q?.team===p.team){stop=i-1;break;}
      if(q?.team && q.team!==p.team) path.push({piece:q,distance:i});
    }
    const lastEnemyAtEnd=path.find(x=>x.distance===stop)?.piece;
    for(let i=0;i<path.length;i++){
      const item=path[i];
      if(!isAlive(item.piece))continue;
      applyDirectHit(g,p,item.piece,2+i,{attackType:'lancer-charge',piercing:true,component:i+1,immuneSeen:attackCtx.immuneSeen});
    }
    if(lastEnemyAtEnd && isAlive(lastEnemyAtEnd)) pushAlong(g,lastEnemyAtEnd,p.chargeDir,0,2);
    p.r += dir[0]*stop; p.c += dir[1]*stop;
    const edgeHit = !inside(p.r + p.chargeDir*1, p.c) && !path.some(x=>x.distance===stop && x.piece.team===p.team);
    if(edgeHit) p.chargeDir *= -1;
    attack.path=path.map((x,i)=>({id:x.piece.id,distance:x.distance,damage:2+i}));
    attack.stop={r:p.r,c:p.c}; attack.reversedNextCharge=edgeHit;
    return attack;
  }

  const targetHpBefore=target.hp;
  if(spec.enPassant){
    const result=resolveDamage(g,target,spec.damage,p,{enPassant:true});
    if(!result.killed){ target.hp=0;target.alive=false; }
  } else applyDirectHit(g,p,target,spec.damage,{attackType:spec.attackType,immuneSeen:attackCtx.immuneSeen});
  if(p.type==='mini' && spec.attackType==='mini-diagonal' && isAlive(target)) pushBackward(g,target,1);

  if(p.type==='cannon') areaDamage(g,target,p.team,1,1,p,{cannonSplash:true,immuneSeen:attackCtx.immuneSeen});
  if(p.type==='archer' && isAlive(target)) pushAway(g,target,p.r,p.c,spec.push||0);
  if(p.type==='dori') resolveDoriPostKill(g,p,target,targetHpBefore,spec,attackCtx);
  if(p.type==='dori' && !isAlive(target)){p.r=spec.r;p.c=spec.c;}
  attack.to={r:target.r,c:target.c};
  return attack;
}

function resolveDoriPostKill(g,p,target,killedHp,spec,attackCtx){
  if(isAlive(target))return;
  const tier=doriTier(p.gauge);
  // Gauge increases only when Dori's direct hit killed the target. The gauge used for the attack is the pre-kill gauge.
  p.gauge=Math.min(10,p.gauge+1);
  if(tier===3){
    areaDamage(g,target,p.team,1,1,p,{doriExtra:true});
    const dealt=spec.damage; healPiece(g,p,Math.floor(dealt*0.10),p);
  } else if(tier===4){
    const hits=areaDamage(g,target,p.team,2,2,p,{doriExtra:true,immuneSeen:attackCtx.immuneSeen});
    const hpTargets=sameHpTargets(g,p.team,killedHp);
    for(const q of hpTargets)resolveDamage(g,q,effectiveAttackDamage(g,p,1),p,{extra:true,sameHp:true,immuneSeen:attackCtx.immuneSeen});
    for(const h of hits){
      if(h.damage>0 && isAlive(h.target)){
        setEffect(h.target,'debuffs','attack-down',4,g.turnNo,{amount:3});
        setEffect(h.target,'debuffs','heal-down',5,g.turnNo,{amount:1});
      }
    }
    healPiece(g,p,Math.floor(spec.damage*0.50),p);
  } else if(tier===5){
    const hits=areaDamage(g,target,p.team,4,4,p,{doriExtra:true,immuneSeen:attackCtx.immuneSeen});
    const hpTargets=sameHpTargets(g,p.team,killedHp);
    for(const q of hpTargets)resolveDamage(g,q,effectiveAttackDamage(g,p,3),p,{extra:true,sameHp:true,immuneSeen:attackCtx.immuneSeen});
    for(const h of hits){
      if(h.damage>0 && isAlive(h.target)){
        setEffect(h.target,'debuffs','attack-down-permanent',Infinity,g.turnNo,{amount:4});
        setEffect(h.target,'debuffs','heal-down-permanent',Infinity,g.turnNo,{amount:2});
      }
    }
    healPiece(g,p,spec.damage,p);
  }
}

function executeAbility(g,p,a){
  switch(a.ability){
    case 'dori-teleport-attack': {
      if(p.gauge!==10 || !inside(a.r,a.c) || pieceAt(g,a.r,a.c)) throw new Error('빈 위치로만 순간이동 공격을 할 수 있습니다.');
      const old={r:p.r,c:p.c}; p.r=a.r;p.c=a.c; invalidate(g);
      const attackSpec=legalAttacks(g,p.id).find(x=>x.target===a.target);
      if(!attackSpec){p.r=old.r;p.c=old.c;throw new Error('순간이동 위치에서 공격할 수 없는 대상입니다.');}
      const action=executeAttack(g,p,{kind:'attack',target:a.target});
      action.ability='dori-teleport-attack'; action.teleportFrom=old; action.teleportTo={r:a.r,c:a.c};
      return action;
    }
    case 'missile': {
      if(onCooldown(g,p,'missile'))throw new Error('미사일 쿨타임 중입니다.');
      if(!inside(a.r,a.c))throw new Error('미사일 중심이 보드 밖입니다.');
      g.missiles.push({id:`m${g.missiles.length+1}`,ownerId:p.id,team:p.team,r:a.r,c:a.c,createdTurn:g.turnNo,revealTurn:g.turnNo+3,dropTurn:g.turnNo+4,revealed:false,done:false});
      setCooldown(p,'missile',6,g.turnNo);
      return {kind:'ability',ability:'missile',id:p.id,center:{r:a.r,c:a.c}};
    }
    case 'heal': {
      for(const q of aliveAllies(g,p.team)){
        if(q.id===p.id)continue;
        const d=CHEB(q.r-p.r,q.c-p.c);
        const amount=d<=1?2:d<=2?1:0;
        if(amount)healPiece(g,q,effectiveHealingAmount(g,p,amount),p);
      }
      healPiece(g,p,effectiveHealingAmount(g,p,3),p);
      return {kind:'ability',ability:'heal',id:p.id};
    }
    case 'potion': {
      if(onCooldown(g,p,'potion'))throw new Error('물약 쿨타임 중입니다.');
      const q=getPiece(g,a.target);
      if(!validateTarget(g,a.target,p.team))throw new Error('아군 대상이 필요합니다.');
      q.gauge=Math.max(0,q.gauge-1);
      setCooldown(p,'potion',8,g.turnNo);
      return {kind:'ability',ability:'potion',id:p.id,target:q.id};
    }
    case 'guard-reduce': {
      if(onCooldown(g,p,'reduce'))throw new Error('피해 감소 쿨타임 중입니다.');
      for(const q of aliveAllies(g,p.team)) if(CHEB(q.r-p.r,q.c-p.c)<=2) setEffect(q,'buffs','reduce',3,g.turnNo);
      setCooldown(p,'reduce',7,g.turnNo);
      return {kind:'ability',ability:'guard-reduce',id:p.id};
    }
    case 'guard-immune': {
      if(onCooldown(g,p,'immune'))throw new Error('무적 보호 쿨타임 중입니다.');
      const q=getPiece(g,a.target);
      if(!validateTarget(g,a.target,p.team)||CHEB(q.r-p.r,q.c-p.c)>3)throw new Error('7×7 범위의 아군만 선택할 수 있습니다.');
      setEffect(q,'buffs','immune',999999,g.turnNo); // consumed by first incoming attack
      setCooldown(p,'immune',8,g.turnNo);
      return {kind:'ability',ability:'guard-immune',id:p.id,target:q.id};
    }
    case 'guard-redirect': {
      if(onCooldown(g,p,'redirect'))throw new Error('피해 전가 쿨타임 중입니다.');
      const q=getPiece(g,a.target);
      if(!validateTarget(g,a.target,p.team,{notKing:true})||CHEB(q.r-p.r,q.c-p.c)>3)throw new Error('왕 돌이를 제외한 7×7 범위의 아군만 선택할 수 있습니다.');
      setEffect(q,'buffs','redirect',4,g.turnNo,{owner:p.id});
      setCooldown(p,'redirect',6,g.turnNo);
      return {kind:'ability',ability:'guard-redirect',id:p.id,target:q.id};
    }
    default: throw new Error('알 수 없는 능력입니다.');
  }
}

function finalize(g,action){
  g.log.push({turn:g.turnNo,team:g.turn,pieceId:action.id,action});
  g.history.push({state:clone(g),action});
  g.redo=[];
  endTurn(g,action);
  return g;
}

export function applyAction(g,a){
  if(!g||g.winner)throw new Error('전투가 종료되었습니다.');
  beginTurn(g);
  if(g.winner) throw new Error('예약된 효과로 전투가 종료되었습니다.');
  const p=getPiece(g,a.id); if(!isAlive(p)||p.team!==g.turn)throw new Error('현재 턴의 살아있는 기물을 선택해야 합니다.');
  const before=clone(g);
  let action;
  if(a.kind==='move')action=executeMove(g,p,a);
  else if(a.kind==='attack')action=executeAttack(g,p,a);
  else if(a.kind==='ability')action=executeAbility(g,p,a);
  else throw new Error('지원하지 않는 행동입니다.');
  invalidate(g);
  // Snapshot must be before action for undo.
  g.history.push({before,action:clone(action)}); g.redo=[];
  g.log.push({turn:g.turnNo,team:g.turn,pieceId:p.id,pieceType:p.type,action:clone(action)});
  endTurn(g,action);
  return g;
}

export function undo(g){
  const h=g.history.pop(); if(!h)return g;
  g.redo.push({before:clone(g),action:h.action});
  return h.before;
}
export function redo(g){
  const h=g.redo.pop(); if(!h)return g;
  const next=clone(h.before); next.history=g.history; next.redo=g.redo;
  return applyAction(next,h.action);
}

export function legalActions(g,id){return [...legalMoves(g,id),...legalAttacks(g,id),...legalAbilities(g,id)];}

export function serialize(g){return JSON.stringify(g);}
export function deserialize(s){const g=typeof s==='string'?JSON.parse(s):clone(s);return g;}
export function getStateSummary(g){
  return {turn:g.turn,turnNo:g.turnNo,winner:g.winner,alive:g.pieces.filter(isAlive).length,missiles:g.missiles.filter(m=>!m.done).length,
    kingHp:Object.fromEntries(TEAMS.map(t=>[t,g.pieces.find(p=>p.team===t&&p.type==='king')?.hp??0]))};
}

export function spawnBone(g,r,c){
  if(!inside(r,c)||pieceAt(g,r,c)||g.bones.some(b=>b.r===r&&b.c===c&&b.alive!==false))return null;
  const bone={id:`bone${g.bones.length+1}`,r,c,alive:true};g.bones.push(bone);return bone;
}
export function collectBone(g,pieceId,boneId){
  const p=getPiece(g,pieceId),b=g.bones.find(x=>x.id===boneId&&x.alive!==false);
  if(!isAlive(p)||!b||p.r!==b.r||p.c!==b.c)return false;
  p.bone=true;b.alive=false;return true;
}

// Debug/test helper: creates a minimal board without changing the public game rules.
export function createTestGame(pieces,turn='white'){
  const g=createGame();g.pieces=[];let i=1;
  for(const x of pieces){const p=mkPiece(x.id||`t${i++}`,x.team,x.type,x.r,x.c);Object.assign(p,x);p.alive=x.alive!==false;g.pieces.push(p);}
  g.turn=turn;g.turnNo=1;g.ply=1;g.history=[];invalidate(g);g.redo=[];g.missiles=[];g.bones=[];g.log=[];g.events=[];g.winner=null;return g;
}

export const RULES = Object.freeze({
  board:'12x12',promotion:false,oneActionPerTurn:true,kingVictory:true,
  mini:{hp:3,count:6,score:1}, missile:{hp:10,count:1,score:4,delay:4,revealBefore:1,damage:5,cooldown:6},
  cannon:{hp:5,count:2,score:5,range:4,damage:3,splash:1},
  lancer:{hp:4,count:4,score:3,chargeRange:4,firstDamage:2,increment:1,terminalPush:2,adjacentDamage:1},
  knight:{hp:5,count:2,score:3,damage:2}, medic:{hp:4,count:1,score:7}, archer:{hp:4,count:4,score:4},
  guardian:{hp:30,count:1,score:6,reduceTurns:3,reduceCooldown:7,immuneCooldown:8,redirectTurns:4,redirectCooldown:6},
  dori:{hp:15,count:1,score:10,maxGauge:10}, king:{hp:25,count:1,score:0}
});
