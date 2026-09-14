# Dori War — Legal Action Visualization

The battlefield UI now visualizes the selected unit and every legal action returned by the rules engine.

- Cyan ring + SELECTED label: selected unit.
- Green pulsing dot + 이동: legal movement destination.
- Red target frame + damage label: legal attack target.
- Gold dashed frame + 대상/조준: current ability targeting cells.
- Selection HUD shows selected unit, coordinate, HP, Dori gauge, and counts for legal movement/attack/ability actions.
- Board legend explains the visual language.
- Each square receives an accessible aria-label describing legal actions.

The UI uses `window.DoriWarEngine.legalActions()` as its source of truth; it does not invent movement or attack destinations independently.
