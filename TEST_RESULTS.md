# Dori War — Final Verification

## Automated verification

- `node test-engine.mjs` → **PASS: comprehensive Dori War rules suite**
- `node --check src/engine.js` → **PASS**
- `node --check src/ai-worker.js` → **PASS**
- Inline module script syntax check → **PASS**
- Engine exports used by `index.html` → **all resolved**

## Final UI / animation safeguards

- Exactly one `visualForPiece()` definition.
- Exactly one committed-move animation implementation.
- No `.action-ghost` / clone-based move animation.
- No `.animation-hidden` destination hiding.
- No `console.error()` / `console.warn()` calls in the application UI code.
- Persistent 12×12 board DOM; rendering does not rebuild 144 cells.
- Move animation uses the real destination piece with GPU-friendly `transform` + `opacity`.
- Active animations are cancelled and cleaned before a new committed move.
- Destination impact pulse is cleaned automatically.
- Drag movement is frame-coalesced with `requestAnimationFrame`.
- AI state transfer uses lightweight game snapshots without undo-history nesting.
- Undo/redo history uses flat snapshots instead of recursively copying history.
- `resign`, `draw`, and `lightweightState` are provided by the engine.
- Favicon is embedded to avoid an unnecessary `/favicon.ico` request.

## Browser note

Automated browser interaction was not available in this build environment, so no claim is made that every browser/extension/network condition is error-free. The known duplicate/ghost animation architecture and the identified missing-engine-export issue were removed, and the project passes the static/engine checks above.
