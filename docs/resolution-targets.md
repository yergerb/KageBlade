# Resolution Targets

## Current Plan

Kageblade is built on a 1280 by 720 gameplay canvas, then scaled upward by Godot.

- 2560 by 1440 is a clean 2x scale.
- 3840 by 2160 is a clean 3x scale.
- The project opens at a 2560 by 1440 window size for development.
- The stretch scale mode is integer so the current chunky anime sprite style stays crisp at 1440p and 4K.

## Asset Pipeline

Use one high-resolution master sprite sheet per animation pass right now. Do not make separate 1440p and 4K asset folders yet.

Once Ren's moveset is stable, final production sheets should be regenerated or painted at larger source sizes if the sprites need more detail on 4K screens. For now, one bright master atlas keeps iteration fast and avoids syncing duplicate asset sets.
