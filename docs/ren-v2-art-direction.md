# Ren V2 Art Direction

## Purpose

Ren V2 is the higher-detail version of the longsword fighter. The current playable sprites remain useful for combat prototyping, but Ren V2 should become the visual source for future production animation.

## Source Sheet

- `assets/concepts/ren-v2-model-sheet.png`

The sheet defines Ren's front, side, and back reads, face direction, greatsword design, costume layers, and OLED-friendly palette.

This is concept/reference art only. It is not wired into the playable Godot fighter yet.

## Visual Pillars

- Sharp anime fighter silhouette with readable hair, shoulder armor, sash, cloak strips, and oversized sword.
- Dark navy and black base costume with cyan rim light, hot magenta cloth/energy, gold armor trim, and a bright blade edge.
- More detailed than the current sprite prototypes, but still clean enough to reduce into readable fighting-game frames.
- Greatsword should feel heavy and elegant, not like a generic katana.

## Pipeline Recommendation

Use the current Godot fighter as the mechanics prototype while Ren V2 becomes the production art target.

Preferred path:

1. Lock the Ren V2 design.
2. Build a consistent rig or cel-shaded 3D proxy from this sheet.
3. Render or draw the key animation sets from that same source.
4. Convert those animation renders into sprite atlases for Godot.
5. Replace the prototype sheets state by state, starting with idle, walk, crouch, jump, flip, and the main slash chain.

## Immediate Next Steps

1. Playtest the wired Ren V2 idle test in Godot.
2. Decide whether Ren V2 is locked or needs a second design variant.
3. Build a neutral front-facing rig reference from the model sheet.
4. Produce a real flip animation test with tucked legs, cloak drag, and sword-weight follow-through.
5. Compare that flip test in Godot against the current prototype timing before replacing any more gameplay sprites.

## Playable Art Test

- `assets/sprites/ren-v2-idle-cutout.png`
- `assets/sprites/ren-v2-idle-atlas.png`
- `assets/sprites/ren-v2-idle-atlas.json`

The first Ren V2 implementation replaces only the idle state. Movement, duck, attacks, hit, block, and flip still use the older prototype sprite sheets so we can compare the new detail level without breaking the combat prototype.

The current Ren V2 idle pass is intentionally more exaggerated than the first test: boots stay planted while the hair, tassel, sash, cloak panels, sword, and chest breathing motion move harder for a livelier anime fighter read.

## Generation Prompt

The Ren V2 source sheet was generated with the built-in image generation path using this production brief:

Create a high-detail anime ninja-samurai greatsword fighter model sheet for Kageblade. Show one male warrior only, early 20s, lean athletic build, sharp anime face, wild dark navy-black hair with cyan rim highlights, calm dangerous expression, asymmetrical samurai/ninja armor, layered dark cloth, short cloak panels, red/magenta sash ribbons, gold trim, black armored gauntlets and boots, and an oversized greatsword. Use crisp cel shading, detailed linework, saturated OLED-friendly colors, and a dark navy/black base with cyan, hot magenta, gold, and white blade highlights. Include full-body front three-quarter, side, back, head close-up, sword close-up, and material/color callouts. No text, labels, logos, watermark, extra characters, chibi proportions, realistic photo style, bulky western knight armor, or muddy low-contrast colors.

## Backup Point

The pre-Ren-V2 playable prototype is preserved at:

- Branch: `codex/backup-pre-ren-v2`
- Tag: `pre-ren-v2-2026-04-29`
- Commit: `05cc1a8`
