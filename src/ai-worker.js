import * as E from './engine.js';

self.onmessage = ({data}) => {
  const {requestId, game} = data || {};
  try {
    if(!game || game.winner || game.turn!=='black'){
      self.postMessage({type:'best',requestId,action:null});
      return;
    }
    const candidates=[];
    // The worker is intentionally conservative: generate actions off the UI thread,
    // score only tactical information, and cap the candidate list.
    for(const p of game.pieces){
      if(!p.alive || p.team!=='black') continue;
      for(const a of E.legalAttacks(game,p.id)){
        const target=E.getPiece(game,a.target);
        let score=80+a.damage;
        if(target?.type==='king')score+=10000;
        if(target?.type==='dori')score+=120;
        if(target?.type==='guardian')score+=35;
        score += Math.max(0, target?.hp||0)<=a.damage ? 60 : 0;
        candidates.push({action:a,score});
      }
      for(const a of E.legalMoves(game,p.id)){
        // Prefer centralization without doing expensive search.
        const center=Math.abs(a.r-5.5)+Math.abs(a.c-5.5);
        candidates.push({action:a,score:12-Math.min(12,center)+Math.random()*2});
      }
      for(const a of E.legalAbilities(game,p.id)){
        if(a.ability==='heal')candidates.push({action:a,score:24});
        else if(a.ability==='guard-reduce')candidates.push({action:a,score:18});
        else if(a.ability==='missile')candidates.push({action:{...a,r:5,c:5},score:10});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    self.postMessage({type:'best',requestId,action:candidates[0]?.action||null});
  }catch(error){
    self.postMessage({type:'error',requestId,error:String(error?.stack||error)});
  }
};
