# Kageblade

OLED-bright 2D weapon fighter prototype with neon anime arcade sprites, side-scrolling arenas, and weapon-first combat.

## Current Slice

- Godot project in `project.godot`
- Native Godot scene in `scenes/main.tscn`
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

Then press Play. The current native slice renders the approved longsword sheet on a dark arena with basic movement, attacks, block, parry, flip, hit sparks, health bars, and controller/keyboard input.

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
