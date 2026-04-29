# Longsword Fighter

## Role

The first playable fighter should be a heavy anime samurai archetype: slower than the nunchaku fighter, but dangerous at mid-range with big commitment, strong block pressure, and huge punish damage.

## Personality

- Calm, confident, stylish
- Heavy sword discipline with modern ninja movement
- Neon cyan and magenta energy around blade impacts
- Wins through spacing, timing, and scary counter hits

## Current Sprite Sheets

- `assets/sprites/longsword-sheet.png`: transparent sheet for implementation
- `assets/sprites/longsword-sheet-source.png`: original chroma-key source
- `assets/sprites/longsword-combat-sheet-02-atlas.png`: movement, dash, back evade, kick, and thrust animation sheet
- `assets/sprites/longsword-combat-sheet-02.json`: frame map for combat sheet 02

The base sheet drives idle, slash, launcher, block, hit, and victory placeholders. Combat sheet 02 is wired into walk forward, walk backward, dash forward, back evade, kick, and forward thrust.

## Current Godot Implementation

- `scenes/fighters/longsword_fighter.tscn`: reusable fighter scene with sprite, hurtbox, hitbox, and controller script.
- `scripts/fighters/longsword_fighter.gd`: forward/back walk states with combat-sheet animation, double-tap dash/back evade, double jump, light combo, launcher, forward+Y thrust with combat-sheet animation, kick with combat-sheet animation, grab, kunai, block, parry, flip, hit reactions, combo counter data, and debug hitbox drawing.
- `scenes/main.tscn`: training room controller with Ren vs a dummy.

## Best Moveset Direction

Start with a compact but expressive kit. This is enough to make him feel real before we overproduce animations.

### Movement

- Idle
- Walk forward
- Walk backward
- Dash forward
- Backstep
- Jump
- Double jump
- Flip evade
- Land

### Core Buttons

- `X`: fast horizontal slash
- `X, X`: second slash follow-up
- `Forward + X`: advancing cut
- `Y`: vertical launcher
- `Forward + Y`: sword thrust
- `Down + Y`: ground-splitting slam
- `B`: boot kick to stop rushdown
- `Air + X`: falling slash

### Defense

- `A` / `RT`: sword block
- Block impact
- `LT`: parry startup
- Parry success
- Parry counter slash

### Grapple

- `RB`: hilt grab
- Grab success
- Throw / shove
- Throw whiff

### Specials To Add After Core Feel Works

- Crescent wave slash
- Rising greatsword uppercut
- Spinning cloak slash
- Charged overhead guard break
- Low sweeping blade cut

## Animation Priority

1. Idle, walk, block, hit reaction
2. Horizontal slash chain
3. Vertical launcher
4. Kick
5. Parry startup and parry counter
6. Grab and throw
7. Jump, air slash, flip
8. Specials
