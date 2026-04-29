# Longsword Fighter

## Role

The first playable fighter should be a heavy anime samurai archetype: slower than the nunchaku fighter, but dangerous at mid-range with big commitment, strong block pressure, and huge punish damage.

## Personality

- Calm, confident, stylish
- Heavy sword discipline with modern ninja movement
- Neon cyan and magenta energy around blade impacts
- Wins through spacing, timing, and scary counter hits

## Current Sprite Sheet

- `assets/sprites/longsword-sheet.png`: transparent sheet for implementation
- `assets/sprites/longsword-sheet-source.png`: original chroma-key source

The current sheet is a style-approved first pass, not the full final animation set.

## Best Moveset Direction

Start with a compact but expressive kit. This is enough to make him feel real before we overproduce animations.

### Movement

- Idle
- Walk forward
- Walk backward
- Dash forward
- Backstep
- Jump
- Flip evade
- Land

### Core Buttons

- `X`: fast horizontal slash
- `X, X`: second slash follow-up
- `Forward + X`: advancing cut
- `Y`: vertical launcher
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
