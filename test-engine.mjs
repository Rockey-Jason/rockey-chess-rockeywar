import assert from 'node:assert/strict'; 
import {createGame,createTestGame,legalMoves,legalAttacks,legalAbilities,applyAction,spawnBone,collectBone} from './src/engine.js';
const P=(g,id)=>g.pieces.find(p=>p.id===id);
const count=(g,t,k)=>g.pieces.filter(p=>p.team===t&&p.type===k).length;

// Board / roster
let g=createGame(); assert.equal(g.size,12); assert.equal(g.pieces.length,46);
for(const t of ['white','black']) for(const [k,n] of Object.entries({mini:6,missile:1,cannon:2,lancer:4,knight:2,medic:1,archer:4,guardian:1,dori:1,king:1})) assert.equal(count(g,t,k),n);

// Mini movement and diagonal attack + backward push
let m=createTestGame([{id:'w',team:'white',type:'mini',r:6,c:5},{id:'ally',team:'white',type:'mini',r:6,c:4},{id:'b',team:'black',type:'mini',r:5,c:6}], 'white');
assert(legalMoves(m,'w').some(x=>x.r===4&&x.c===5)); assert(legalAttacks(m,'w').some(x=>x.target==='b'));
applyAction(m,{kind:'attack',id:'w',target:'b'}); assert.equal(P(m,'b').hp,2); assert.equal(P(m,'b').r,4);
// En passant
m=createTestGame([{id:'w',team:'white',type:'mini',r:6,c:5},{id:'b',team:'black',type:'mini',r:4,c:6},{id:'ba',team:'black',type:'mini',r:4,c:5}], 'black');
applyAction(m,{kind:'move',id:'b',r:6,c:6}); assert(legalAttacks(m,'w').some(x=>x.enPassant&&x.target==='b')); applyAction(m,{kind:'attack',id:'w',target:'b'}); assert(!P(m,'b').alive);

// Cannon: move changes facing; only facing direction; first hit + splash
let c=createTestGame([{id:'c',team:'white',type:'cannon',r:8,c:5},{id:'e',team:'black',type:'cannon',r:4,c:5},{id:'s',team:'black',type:'mini',r:4,c:6}], 'white');
applyAction(c,{kind:'move',id:'c',r:6,c:5}); c.turn='white'; assert.deepEqual(P(c,'c').faceDir,[-1,0]); assert(legalAttacks(c,'c').some(x=>x.target==='e')); assert(!legalAttacks(c,'c').some(x=>x.target==='s')); applyAction(c,{kind:'attack',id:'c',target:'e'}); assert.equal(P(c,'e').hp,1); assert.equal(P(c,'s').hp,2);

// Lancer: 2,3,4 damage piercing; terminal enemy push; edge reversal
let l=createTestGame([{id:'l',team:'white',type:'lancer',r:8,c:5},{id:'a',team:'black',type:'mini',r:7,c:5},{id:'b',team:'black',type:'mini',r:6,c:5},{id:'d',team:'black',type:'cannon',r:5,c:5}], 'white');
assert.equal(legalAttacks(l,'l').filter(x=>x.attackType==='lancer-charge').length,3); applyAction(l,{kind:'attack',id:'l',target:'d'}); assert.equal(P(l,'a').hp,1); assert.equal(P(l,'b').hp,0); assert.equal(P(l,'d').hp,1); assert.equal(P(l,'l').r,4);
let le=createTestGame([{id:'l',team:'white',type:'lancer',r:1,c:1},{id:'e',team:'black',type:'mini',r:0,c:1}], 'white'); applyAction(le,{kind:'attack',id:'l',target:'e'}); assert.equal(P(le,'l').chargeDir,1);

// Knight: 8 knight + 4 orthogonal-two moves from center
let k=createTestGame([{id:'k',team:'white',type:'knight',r:5,c:5}], 'white'); assert.equal(legalMoves(k,'k').length,12);

// Medic: 3 self, 2 within 3x3, 1 within 5x5, overlap only 2
let med=createTestGame([{id:'m',team:'white',type:'medic',r:5,c:5,hp:1},{id:'a',team:'white',type:'mini',r:4,c:5,hp:1},{id:'b',team:'white',type:'mini',r:3,c:5,hp:1}], 'white'); applyAction(med,{kind:'ability',id:'m',ability:'heal'}); assert.equal(P(med,'m').hp,4); assert.equal(P(med,'a').hp,3); assert.equal(P(med,'b').hp,2);
med=createTestGame([{id:'m',team:'white',type:'medic',r:5,c:5},{id:'d',team:'white',type:'dori',r:7,c:7,gauge:4}], 'white'); applyAction(med,{kind:'ability',id:'m',ability:'potion',target:'d'}); assert.equal(P(med,'d').gauge,3); assert(P(med,'m').cooldowns.potion>med.turnNo);

// Guardian: 25% floor, 3-turn buff; one-hit immunity covers a multi-component attack; redirect fully absorbs
let gr=createTestGame([{id:'g',team:'white',type:'guardian',r:5,c:5},{id:'a',team:'white',type:'mini',r:6,c:6},{id:'e',team:'black',type:'cannon',r:4,c:6}], 'white'); applyAction(gr,{kind:'ability',id:'g',ability:'guard-reduce'}); assert(P(gr,'a').buffs.reduce); gr.turn='black'; applyAction(gr,{kind:'attack',id:'e',target:'a'}); assert.equal(P(gr,'a').hp,1); // 3*0.75 floor =2 damage
assert(P(gr,'a').buffs.reduce);
gr=createTestGame([{id:'g',team:'white',type:'guardian',r:5,c:5},{id:'a',team:'white',type:'mini',r:6,c:6},{id:'e',team:'black',type:'cannon',r:4,c:6}], 'white'); applyAction(gr,{kind:'ability',id:'g',ability:'guard-immune',target:'a'}); gr.turn='black'; applyAction(gr,{kind:'attack',id:'e',target:'a'}); assert.equal(P(gr,'a').hp,3);
gr=createTestGame([{id:'g',team:'white',type:'guardian',r:5,c:5},{id:'a',team:'white',type:'mini',r:6,c:6},{id:'e',team:'black',type:'cannon',r:4,c:6}], 'white'); applyAction(gr,{kind:'ability',id:'g',ability:'guard-redirect',target:'a'}); gr.turn='black'; applyAction(gr,{kind:'attack',id:'e',target:'a'}); assert.equal(P(gr,'a').hp,3); assert.equal(P(gr,'g').hp,25);

// Archer: global, 9x9, 5x5, 3x3 bands + push away
let ar=createTestGame([{id:'a',team:'white',type:'archer',r:6,c:6},{id:'e1',team:'black',type:'mini',r:6,c:7},{id:'e2',team:'black',type:'mini',r:6,c:8},{id:'e3',team:'black',type:'mini',r:6,c:10},{id:'e4',team:'black',type:'mini',r:0,c:0}], 'white'); let aa=legalAttacks(ar,'a'); assert.equal(aa.find(x=>x.target==='e1').damage,3); assert.equal(aa.find(x=>x.target==='e2').damage,3); assert.equal(aa.find(x=>x.target==='e3').damage,2); assert.equal(aa.find(x=>x.target==='e4').damage,1); applyAction(ar,{kind:'attack',id:'a',target:'e1'}); assert.equal(P(ar,'e1').c,7);

// Dori tier 7: kill -> gauge +1, 3x3 extra, 10% heal
let d=createTestGame([{id:'d',team:'white',type:'dori',r:6,c:6,gauge:7,hp:5},{id:'e',team:'black',type:'mini',r:4,c:5,hp:3},{id:'x',team:'black',type:'mini',r:4,c:6,hp:3}], 'white'); applyAction(d,{kind:'attack',id:'d',target:'e'}); assert.equal(P(d,'d').gauge,8); assert.equal(P(d,'x').hp,2); assert.equal(P(d,'d').hp,5);
// Dori tier 8: 5x5 extra, debuffs and 50% heal
 d=createTestGame([{id:'d',team:'white',type:'dori',r:6,c:6,gauge:8,hp:10},{id:'e',team:'black',type:'mini',r:4,c:6,hp:3},{id:'x',team:'black',type:'mini',r:5,c:7,hp:3}], 'white'); applyAction(d,{kind:'attack',id:'d',target:'e'}); assert.equal(P(d,'d').gauge,9); assert.equal(P(d,'x').hp,1); assert(P(d,'x').debuffs['attack-down']); assert(P(d,'x').debuffs['heal-down']);
// Dori tier 10: 9x9 extra, permanent debuffs, 100% heal, gauge caps 10
 d=createTestGame([{id:'d',team:'white',type:'dori',r:6,c:6,gauge:10,hp:5},{id:'e',team:'black',type:'mini',r:4,c:6,hp:3},{id:'x',team:'black',type:'cannon',r:5,c:7,hp:5}], 'white'); applyAction(d,{kind:'attack',id:'d',target:'e'}); assert.equal(P(d,'d').hp,10); assert.equal(P(d,'d').gauge,10); assert(P(d,'x').debuffs['attack-down-permanent']);
// Dori teleport attack is one action
 d=createTestGame([{id:'d',team:'white',type:'dori',r:10,c:10,gauge:10},{id:'e',team:'black',type:'mini',r:3,c:3,hp:3}], 'white'); applyAction(d,{kind:'ability',id:'d',ability:'dori-teleport-attack',r:4,c:4,target:'e'}); assert.equal(P(d,'d').r,3); assert.equal(P(d,'d').c,3);

// Bones: acquisition gives +1 attack, no movement/heal/gauge side effects
let bo=createTestGame([{id:'m',team:'white',type:'mini',r:3,c:3},{id:'e',team:'black',type:'mini',r:2,c:3}], 'white'); const b=spawnBone(bo,3,4); assert(b); P(bo,'m').c=4; assert(collectBone(bo,'m',b.id)); assert.equal(P(bo,'m').bone,true); assert.equal(legalAttacks(bo,'m')[0].damage,2);

// Missile: reveal one turn before, explode after four turn changes, survives owner death
let mi=createTestGame([{id:'m',team:'white',type:'missile',r:10,c:1},{id:'w',team:'white',type:'mini',r:10,c:2},{id:'b',team:'black',type:'cannon',r:8,c:8},{id:'bm',team:'black',type:'mini',r:8,c:10},{id:'bk',team:'black',type:'king',r:0,c:11}], 'white');
applyAction(mi,{kind:'ability',id:'m',ability:'missile',r:8,c:8}); assert.equal(mi.missiles[0].revealTurn,4); assert.equal(mi.missiles[0].dropTurn,5); P(mi,'m').hp=0;P(mi,'m').alive=false;
// four completed actions total after scheduling: black, white, black, white => turn 5
for(let i=0;i<4;i++){const actor=mi.pieces.find(p=>p.alive&&p.team===mi.turn&&p.type==='mini'); if(!actor) break; const mv=legalMoves(mi,actor.id)[0]; if(mv)applyAction(mi,mv);}
assert(mi.missiles[0].done); assert.equal(P(mi,'b').hp,0);

// Permanent/temporary debuffs survive gauge decrease
let db=createTestGame([{id:'d',team:'white',type:'dori',r:5,c:5,gauge:10},{id:'e',team:'black',type:'mini',r:4,c:5}], 'white'); db.turn='black'; db.pieces.find(p=>p.id==='e').debuffs['attack-down-permanent']={amount:4,until:Infinity}; db.pieces.find(p=>p.id==='d').gauge=1; assert(P(db,'e').debuffs['attack-down-permanent']);

// King: check is irrelevant; king attacks and death immediately wins
let win=createTestGame([{id:'w',team:'white',type:'king',r:5,c:5},{id:'b',team:'black',type:'king',r:5,c:6,hp:1}], 'white'); assert(legalAttacks(win,'w').some(x=>x.target==='b')); applyAction(win,{kind:'attack',id:'w',target:'b'}); assert.equal(win.winner,'white');

console.log('PASS: comprehensive Dori War rules suite');
