# Kageblade

OLED-bright 2D weapon fighter prototype with neon anime arcade sprites, side-scrolling arenas, and weapon-first combat.

## Current Slice

- Godot project in `project.godot`
- Native Godot scene in `scenes/main.tscn`
- Reusable longsword fighter scene in `scenes/fighters/longsword_fighter.tscn`
- Godot combat/render scripts in `scripts/`
- Static browser prototype in `index.html`
- Greatsword idle/combat sprite sheets in `assets/sprites/`
- Ren V2 high-detail concept sheet in `assets/concepts/`
- Ren V2 idle art test wired into the playable fighter idle state
- Early combat prototype in `src/game.js`
- Art direction and moveset notes in `docs/`

## Legacy Browser Prototype Controls

Gamepad:

- `X`: horizontal slash
- `Y`: vertical slash
- `B`: kick
- `A` / `RT`: block
- `RB`: grab
- `LT`: parry
- `LB`: flip

Keyboard fallback:

- Arrow keys: move
- `W` / `Space`: jump
- `X`: horizontal slash
- `Y`: vertical slash
- `B`: kick
- `A`: block
- `R`: grab
- `Q`: parry
- `E`: flip

## Run In Godot

Open Godot, choose **Import**, and select this file:

`project.godot`

Open `scenes/main.tscn` if Godot does not show it automatically, then press Play. The current native slice is a training room: Ren vs a dummy, the approved longsword sheets rendered through a reusable fighter scene, debug hitboxes, basic combo logic, launcher/chase setup, block, parry, flip, kunai, hit sparks, health bars, and controller/keyboard input.

## Native Controls

Gamepad:

- Left stick / D-pad: move
- Hold Down: duck/crouch
- Double tap forward/back: quick dash / back evade
- `A`: jump / chase after launcher
- `A` again in air: double jump
- `X`: mash-friendly light slash combo
- `Down + X`: kunai
- `Y`: launcher
- `Forward + Y`: sword thrust
- `B`: kick
- `RT`: block
- `LT`: parry
- `RB`: grab
- `LB`: flip evade

Keyboard:

- Arrow keys / WASD: move
- Hold Down / `S`: duck/crouch
- Double tap forward/back: quick dash / back evade
- `Space` / `W` / `Up`: jump
- Jump again in air: double jump
- `J` / `X`: light slash combo
- `S + J` / `Down + X`: kunai
- `I` / `Y`: launcher
- `Forward + I` / `Forward + Y`: sword thrust
- `K` / `B`: kick
- `L`: block
- `U` / `Q`: parry
- `O` / `R`: grab
- `P` / `E`: flip evade
- `Enter`: reset room

## Run Old Browser Prototype

Open `index.html` in a browser. No install step is required yet.

## Art Direction

The target look is a saturated neon night arcade style: dark OLED-friendly backgrounds, bright cyan/magenta/gold attacks, thick ink outlines, chunky HD pixel/cel-shaded sprites, and large readable weapon arcs.

The next production art direction starts from `assets/concepts/ren-v2-model-sheet.png`, which is a higher-detail character sheet for a future rigged or cel-shaded sprite pipeline.

## Resolution Target

Kageblade uses a 1280 by 720 gameplay canvas that scales cleanly to 2560 by 1440 and 3840 by 2160. Current development uses one high-resolution sprite atlas per animation pass; separate 1440p and 4K sprite exports are not needed yet.

## Next Production Steps

1. Tighten the combat atlas frame crops after playtesting movement feel.
2. Add sprite passes for launcher, slash chain, parry, grab, air slash, and hit reaction.
3. Create matching effects sheets for slash trails, sparks, parries, blocks, and hit bursts.
4. Create one dark rooftop arena background that keeps the fighters readable.
5. Start character two after Ren's core movement and first combo route feel fun.
