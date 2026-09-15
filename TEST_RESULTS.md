# Dori War — Final Premium QA

## Static / engine checks
- `node --check src/engine.js` — PASS
- `node --check src/ai-worker.js` — PASS
- `node test-engine.mjs` — PASS: comprehensive Dori War rules suite
- Active `index.html` contains exactly one `visualForPiece()` definition.
- Active `index.html` contains exactly one `animateCommittedAction()` definition.
- Active `index.html` contains no `action-ghost`, `makeActionClone`, or `animation-hidden` implementation.
- No `console.error()` or `console.warn()` calls are used by the active frontend code.

## Animation architecture
- Committed moves animate the real destination `.piece` element with Web Animations API.
- No temporary movement clone is created.
- Dragging also uses the real piece element; no drag ghost DOM is created.
- Previous action animations are cancelled and cleaned before a new action animation begins.
- Destination impact is a CSS-only cell effect; it does not create another piece.
- Reduced-motion preference is respected.
- Local and remote committed moves use the same real-piece animation path.

## Performance architecture
- The 144 board cells are created exactly once and reused.
- Rendering is coalesced through one `requestAnimationFrame`.
- Board piece lookup during render uses a single map instead of 144 engine queries.
- Active legal actions are cached for the current selection/state key.
- Drag pointer movement is coalesced through `requestAnimationFrame`.
- AI Worker is loaded lazily only when an AI turn actually starts.
- Undo snapshots exclude history/redo/log growth and remain flat.
- Worker/network state excludes local undo history.

## Browser test note
This build environment does not provide full interactive browser automation. Therefore this report does not claim that every browser, extension, device, or network condition is error-free. The previously identified clone/ghost architecture and history-growth bottleneck have been removed from the active build, and the source/engine checks above pass.
