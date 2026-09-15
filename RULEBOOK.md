# 돌이전쟁 — Complete Rulebook / Engine Contract

## 1. Core
- Board: 12×12.
- No promotion.
- A turn consumes exactly one action: move, attack, or ability.
- A piece at HP <= 0 is immediately dead and cannot act.
- King Dori ignores check/checkmate. It may move onto an attacked square.
- The first side to reduce the opposing King Dori to 0 HP wins immediately.
- Automatic movement caused by a kill does not consume another action.
- Pushes never leave the board or occupy another piece's square; movement stops at the last legal square.
- Direct and additional damage caused by one attack share one attack context. Guardian immunity therefore ignores every damage component of that attack.
- Dori's gauge only increases when Dori's own direct damage kills a target. Additional/area damage kills never increase it.
- Gauge cannot fall below 0 and is capped at 10. Reducing gauge never removes existing temporary or permanent debuffs.
- Healing cannot exceed max HP.

## 2. Mini Dori
- HP 3, score 1, six per team.
- Move forward 1 or backward 1.
- If an allied Mini Dori is immediately left or right, it may advance 2 squares. Any enemy in the advance path is pushed backward 1 and takes 1 damage.
- Diagonal forward enemy: 1 damage; if killed, Mini Dori moves to that square.
- En passant: if an opposing Mini Dori's previous move was the special 2-square advance, an adjacent allied Mini Dori may capture it. The captured Mini Dori dies immediately.

## 3. Dori Missile
- HP 10, score 4, one per team.
- Move to any empty square in its 3×3 neighborhood. It cannot capture or attack by moving.
- As an action, select any board square as the center of a hidden 3×3 strike area.
- Four turn changes later the missile falls: white→black→white→black, then impact at the start of the following turn state.
- One turn before impact, the strike area becomes visible to the opponent.
- All enemies currently inside the 3×3 area take 5 damage.
- After firing, missile ability has 6 turns of cooldown.
- A fired missile remains scheduled even if the missile piece is killed.

## 4. Dori Cannon
- HP 5, score 5, two per team.
- Move horizontally or vertically 1 or 2 squares through empty squares.
- Its facing direction changes to the direction of movement.
- Fires exactly 4 squares along its current facing direction.
- The first enemy piece in the path takes 3 damage.
- The 3×3 area centered on that enemy receives 1 additional damage to every enemy in the area, including the first target if it is still alive.
- The projectile disappears at the first enemy.

## 5. Spear Dori / Lancer
- HP 4, score 3, four per team.
- Move forward or backward 1; movement direction becomes its facing/charge direction.
- Charge up to 4 squares in its facing direction.
- Allied piece blocks the charge; it stops immediately before that ally.
- Enemy pieces are pierced instead of blocking the charge. Consecutive enemy hits deal 2, 3, 4, 5 damage.
- If the charge reaches the board edge, the lancer stops there; its next charge reverses direction.
- If an enemy occupies the terminal charge square, it is pushed backward 2 if possible.
- The charge damage sequence resets for every new charge.
- Adjacent enemies (orthogonal or diagonal) may receive 1 damage as a separate attack mode.

## 6. Knight Dori
- HP 5, score 3, two per team.
- Move to the eight knight squares or any square exactly 2 away horizontally/vertically.
- Same range for attack; 2 damage.
- If the target is killed, Knight Dori moves to the target square automatically.

## 7. Medic Dori
- HP 4, score 7, one per team.
- Moves like a normal king.
- Heals allies in 5×5 (Chebyshev distance <= 2) for 1.
- Allies in 3×3 (distance <= 1) instead receive 2; the 1-point 5×5 heal is not stacked.
- Medic itself heals 3.
- A Dori-reduction potion can target the allied Dori anywhere on the board, with no sight/path restriction, reducing its gauge by 1.
- Potion cooldown: 8 turns.

## 8. Archer Dori
- HP 4, score 4, four per team.
- Move any horizontal distance through empty squares, or exactly 1 square vertically.
- Whole-board attack: chosen enemy takes 1 damage.
- 9×9 centered on Archer: chosen enemy takes 2 damage and is pushed 1 square away.
- 5×5 centered on Archer: chosen enemy takes 3 damage and is pushed 2 squares away.
- 3×3 centered on Archer: chosen enemy takes 3 damage and is pushed 3 squares away.
- The closest applicable band is used: 3×3, then 5×5, then 9×9, otherwise global attack.
- Push is away from the Archer and stops early if blocked/off-board.

## 9. Guardian Dori
- HP 30, score 6, one per team.
- Moves like a king, plus exactly 2 horizontal squares.
- 5×5 ability: allies in range receive 25% damage reduction for 3 turns. Damage decimals are floored.
- 7×7 ability: one chosen ally receives a one-attack 100% immunity. The buff disappears after that attack, even when the attack has multiple damage components.
- 7×7 ability: one chosen ally except King Dori redirects all incoming damage to Guardian for 4 turns. If Guardian dies, no leftover damage transfers to the protected ally.
- Cooldowns: reduction 7, immunity 8, redirect 6 turns.

## 10. Dori
- HP 15, score 10, one per team.
- Passive: a direct Dori kill increases gauge by 1, max 10.
- Gauge 0 movement/attack: knight range; attack 1.
- Gauge 1–3: rook + knight movement/attack; attack 2.
- Gauge 4–6: queen + knight movement/attack; attack 3.
- Gauge 7: teleport to any empty square OR knight movement; attack 4 in knight range. If direct kill: 3×3 area around killed target takes 1 additional damage; Dori heals 10% of actual direct damage (integer HP).
- Gauge 8–9: teleport or rook + knight movement; attack 4 in rook + knight range. If direct kill: 5×5 area takes 2 additional damage; affected surviving enemies lose 3 attack for 4 turns and 1 healing for 5 turns; every surviving enemy whose HP equals the killed target's pre-death HP takes 1 additional damage. Dori heals 50% of actual direct damage (integer HP).
- Gauge 10: teleport or queen + knight movement. It may also teleport to an empty square and attack from that square as one action. Attack damage 5. If direct kill: 9×9 area takes 4 additional damage; affected surviving enemies permanently lose 4 attack and 2 healing; every surviving enemy whose HP equals the killed target's pre-death HP takes 3 additional damage. Dori heals 100% of actual direct damage, capped at 15 HP.
- Automatic movement after a Dori kill does not cost another action.

## 11. King Dori
- HP 25, no score, one per team.
- Normal king movement and attack for 1 damage.
- Check and checkmate do not exist.
- King Dori may move into an attacked square.
- HP 0 means immediate defeat.

## 12. Bone
- A board bone can be collected by an allied piece by moving onto its square.
- The collector gains +1 to every attack damage it deals, including direct and additional damage.
- Bone does not change healing, movement distance, push distance, or Dori gauge.
- The engine exposes `spawnBone` and automatic movement collection; no unrequested random spawning rule is invented.

## 13. Buff/debuff timing
- Effects are active on the turn they are applied.
- A 3-turn effect applied on turn N is active on N, N+1, N+2 and expires before N+3 actions.
- Permanent debuffs have infinite duration.
- Cooldowns are measured in global turn changes and become reusable after the stated number of turns has elapsed.
- Damage reduction is applied per damage component with floor rounding.
- One attack context is shared by direct and additional damage; one-hit immunity therefore covers the complete attack.
