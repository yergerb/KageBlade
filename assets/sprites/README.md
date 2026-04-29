# Sprites

## Longsword Fighter

- `longsword-sheet-source.png`: generated green-screen source sheet.
- `longsword-sheet.png`: transparent working sheet for implementation, with the shoulder-sword idle frame cleaned of detached neighboring-cell artifacts.
- `longsword-idle-wind-atlas.png`: 8-frame planted idle loop with cloth, hair, sash, and sword wind motion.
- `longsword-idle-wind-atlas.json`: frame names and atlas coordinates for the wind idle.
- `longsword-combat-sheet-02-source.png`: generated green-screen source for the movement/control feedback pass.
- `longsword-combat-sheet-02.png`: transparent source sheet from combat sheet 02.
- `longsword-combat-sheet-02-atlas.png`: normalized 4 by 4 atlas with 448px cells for Godot integration.
- `longsword-combat-sheet-02.json`: frame names and atlas coordinates.

The original sheet is arranged as a rough 4 by 3 grid. The idle wind atlas is generated from the cleaned shoulder-sword pose so Ren stays planted while the clothing and sword move. Combat sheet 02 has a normalized atlas and manifest, and the fighter controller uses it for walk forward, walk backward, dash forward, back evade, kick, and forward thrust.
