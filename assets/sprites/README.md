# Sprites

## Longsword Fighter

- `longsword-sheet-source.png`: generated green-screen source sheet.
- `longsword-sheet.png`: transparent working sheet for implementation, with the shoulder-sword idle frame cleaned of detached neighboring-cell artifacts.
- `longsword-idle-wind-atlas.png`: 8-frame planted idle loop with cloth, hair, sash, and sword wind motion.
- `longsword-idle-wind-atlas.json`: frame names and atlas coordinates for the wind idle.
- `ren-v2-idle-cutout.png`: transparent cutout extracted from the Ren V2 concept sheet for the first playable V2 art test, with the boot/foot edges preserved.
- `ren-v2-idle-atlas.png`: 8-frame Ren V2 idle atlas wired into the playable idle state, using oversized cells for safe cloth and chain/tassel motion.
- `ren-v2-idle-atlas.json`: frame names and atlas coordinates for the Ren V2 idle test.
- `longsword-duck-atlas.png`: 4-frame planted duck/crouch guard loop.
- `longsword-duck-atlas.json`: frame names and atlas coordinates for the duck loop.
- `longsword-combat-sheet-02-source.png`: generated green-screen source for the movement/control feedback pass.
- `longsword-combat-sheet-02.png`: transparent source sheet from combat sheet 02.
- `longsword-combat-sheet-02-atlas.png`: normalized 4 by 4 atlas with 448px cells for Godot integration.
- `longsword-combat-sheet-02.json`: frame names and atlas coordinates.

The original sheet is arranged as a rough 4 by 3 grid. The idle wind atlas is generated from the cleaned shoulder-sword pose so Ren stays planted while the clothing and sword move. The Ren V2 idle atlas is the current playable idle art test; rebuild it with `scripts/tools/build_ren_v2_idle.py`. The rest of Ren's states still use prototype sheets until the V2 pipeline is proven. The duck atlas is generated from the cleaned crouch guard pose so Down has a readable low profile. Combat sheet 02 has a normalized atlas and manifest, and the fighter controller uses it for walk forward, walk backward, dash forward, back evade, kick, and forward thrust.
