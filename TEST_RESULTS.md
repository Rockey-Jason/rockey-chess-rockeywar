# Dori War — Verification

Command:

`node test-engine.mjs`

Result:

`PASS: comprehensive Dori War rules suite`

Coverage includes:
- 12×12 board and complete 46-piece roster
- Mini movement, two-square assisted advance, diagonal attack, backward push, en passant
- Cannon facing, 4-square firing, first-hit and 3×3 splash
- Lancer piercing sequence, terminal push, edge reversal
- Knight movement range
- Medic overlapping heal ranges, self-heal, potion and cooldown
- Guardian damage reduction, one-attack immunity, redirection
- Archer global/9×9/5×5/3×3 attack bands and blocked push
- Dori gauge progression, tier 7/8/10 effects, debuffs, healing and teleport attack
- Bone collection and +1 attack damage
- Missile hidden/reveal/impact timing and survival after launcher death
- King Dori check immunity and immediate victory on HP 0


## Final performance / match-control regression
- Undo/redo snapshots no longer contain nested history/redo/log data.
- AI Worker receives a lightweight state without history, preventing structured-clone growth.
- Surrender and draw results are supported by the rules engine.
- Ordinary attacks do not animate; only actions that change the attacker's board position animate.
- Legal destinations are separated into move (green), attack (red), and lethal/kill (yellow), with damage labels.
- Pointer drag selects the unit immediately, so drag works without a prior click; drag movement is throttled with requestAnimationFrame.
- Navigation is guarded after the first committed action until the battle concludes.
- Regression suite: PASS.
