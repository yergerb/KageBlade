# Kageblade

OLED-bright 2D weapon fighter prototype with neon anime arcade sprites, side-scrolling arenas, and weapon-first combat.

## Current Slice

- Godot project in `project.godot`
- Native Godot scene in `scenes/main.tscn`
- Reusable longsword fighter scene in `scenes/fighters/longsword_fighter.tscn`
- Godot combat/render scripts in `scripts/`
- Static browser prototype in `index.html`
- Greatsword character sprite sheet in `assets/sprites/`
- Early combat prototype in `src/game.js`
- Art direction and moveset notes in `docs/`

## Controls

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

Then press Play. The current native slice is a training room: Ren vs a dummy, the approved longsword sheet rendered through a reusable fighter scene, debug hitboxes, basic combo logic, launcher/chase setup, block, parry, flip, kunai, hit sparks, health bars, and controller/keyboard input.

## Native Controls

Gamepad:

- Left stick / D-pad: move
- `A`: jump / chase after launcher
- `X`: mash-friendly light slash combo
- `Down + X`: kunai
- `Y`: launcher
- `B`: kick
- `RT`: block
- `LT`: parry
- `RB`: grab
- `LB`: flip evade

Keyboard:

- Arrow keys / WASD: move
- `Space` / `W` / `Up`: jump
- `J` / `X`: light slash combo
- `S + J` / `Down + X`: kunai
- `I` / `Y`: launcher
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

## Next Production Steps

1. Crop `assets/sprites/longsword-sheet.png` into individual animation frames.
2. Replace the temporary canvas fighter art with sprite rendering.
3. Build the greatsword fighter's core moveset before starting character two.
4. Create matching effects sheets for slash trails, sparks, parries, blocks, and hit bursts.
5. Create one dark rooftop arena background that keeps the fighters readable.
