import assert from 'node:assert/strict';
import * as E from './src/engine.js';
let g=E.createGame();
const p=g.pieces.find(x=>x.team==='white'&&x.type==='mini');
// two legal moves with a second mini to alternate
let a=E.legalMoves(g,p.id)[0]; g=E.applyAction(g,a);
const b=g.pieces.find(x=>x.team==='black'&&x.type==='mini');
g=E.applyAction(g,E.legalMoves(g,b.id)[0]);
assert.equal(g.history.length,2);
assert.ok(g.history.every(h=>!('history' in h.before)));
g=E.undo(g); assert.equal(g.history.length,1); assert.equal(g.redo.length,1);
g=E.undo(g); assert.equal(g.history.length,0); assert.equal(g.redo.length,2);
g=E.redo(g); assert.equal(g.history.length,1); assert.equal(g.redo.length,1);
g=E.redo(g); assert.equal(g.history.length,2); assert.equal(g.redo.length,0);
let d=E.createGame(); d=E.draw(d); assert.equal(d.result,'draw'); assert.equal(d.winner,null);
let r=E.createGame(); r=E.resign(r,'white'); assert.equal(r.result,'resignation'); assert.equal(r.winner,'black');
// memory growth sanity: 30 alternating legal moves, history stays flat.
g=E.createGame();
for(let i=0;i<30;i++){
  const ps=g.pieces.filter(x=>x.alive&&x.team===g.turn);
  let action=null; for(const q of ps){action=E.legalMoves(g,q.id)[0]||E.legalAttacks(g,q.id)[0]; if(action)break;}
  assert.ok(action,`no action at ${i}`); g=E.applyAction(g,action);
}
assert.equal(g.history.length,30);
assert.ok(g.history.every(h=>!('history' in h.before)));
const json=E.serialize(g); assert.ok(json.length<120000, `state too large: ${json.length}`);
console.log('PASS: final undo/draw/resign/performance regression suite', json.length, 'bytes');
