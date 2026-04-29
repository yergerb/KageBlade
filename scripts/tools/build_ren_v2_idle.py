from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SPRITE_DIR = ROOT / "assets" / "sprites"
ARTIFACT_DIR = ROOT / "artifacts" / "ren-v2-implementation"

SOURCE_PATH = SPRITE_DIR / "ren-v2-idle-cutout.png"
ATLAS_PATH = SPRITE_DIR / "ren-v2-idle-atlas.png"
MANIFEST_PATH = SPRITE_DIR / "ren-v2-idle-atlas.json"
PREVIEW_PATH = ARTIFACT_DIR / "ren-v2-idle-exaggerated-preview.gif"

FRAME_COUNT = 8
FPS = 7.0
CELL_W = 768
CELL_H = 896
COLS = 4
PLACE_X = 85
PLACE_Y = 50


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def bilinear_sample_premultiplied(source: np.ndarray, sample_x: np.ndarray, sample_y: np.ndarray) -> np.ndarray:
    height, width, _ = source.shape
    valid = (sample_x >= 0.0) & (sample_x <= width - 1) & (sample_y >= 0.0) & (sample_y <= height - 1)

    sx = np.clip(sample_x, 0.0, width - 1)
    sy = np.clip(sample_y, 0.0, height - 1)

    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, width - 1)
    y1 = np.clip(y0 + 1, 0, height - 1)

    wx = sx - x0
    wy = sy - y0

    top = source[y0, x0] * (1.0 - wx)[..., None] + source[y0, x1] * wx[..., None]
    bottom = source[y1, x0] * (1.0 - wx)[..., None] + source[y1, x1] * wx[..., None]
    sampled = top * (1.0 - wy)[..., None] + bottom * wy[..., None]
    sampled *= valid[..., None]
    return sampled


def unpremultiply(sampled: np.ndarray) -> np.ndarray:
    alpha = sampled[..., 3:4]
    rgb = np.divide(sampled[..., :3], alpha, out=np.zeros_like(sampled[..., :3]), where=alpha > 0.0001)
    rgba = np.concatenate([rgb, alpha], axis=2)
    return np.clip(rgba * 255.0, 0.0, 255.0).astype(np.uint8)


def warp_frame(source_image: Image.Image, frame_index: int) -> Image.Image:
    source = np.asarray(source_image.convert("RGBA"), dtype=np.float32) / 255.0
    source[..., :3] *= source[..., 3:4]

    height, width, _ = source.shape
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    xn = xx / max(width - 1, 1)
    yn = yy / max(height - 1, 1)

    t = (math.tau * frame_index) / FRAME_COUNT
    sway = math.sin(t)
    breath = math.sin(t - math.pi * 0.5)

    upper = 1.0 - smoothstep(0.40, 0.92, yn)
    chest = smoothstep(0.22, 0.36, yn) * (1.0 - smoothstep(0.55, 0.75, yn))
    shoulder = smoothstep(0.12, 0.26, yn) * (1.0 - smoothstep(0.42, 0.58, yn))
    hair = (1.0 - smoothstep(0.10, 0.34, yn)) * smoothstep(0.30, 0.48, xn) * (1.0 - smoothstep(0.64, 0.82, xn))
    tassel = (1.0 - smoothstep(0.05, 0.23, yn)) * (1.0 - smoothstep(0.12, 0.28, xn))
    sash = smoothstep(0.36, 0.52, yn) * (1.0 - smoothstep(0.70, 0.88, yn)) * smoothstep(0.12, 0.32, xn) * (1.0 - smoothstep(0.48, 0.66, xn))
    cloak = smoothstep(0.50, 0.68, yn) * (1.0 - smoothstep(0.78, 0.92, yn)) * (1.0 - smoothstep(0.34, 0.55, xn))
    sword = smoothstep(0.08, 0.22, yn) * (1.0 - smoothstep(0.54, 0.72, yn)) * smoothstep(0.38, 0.56, xn)

    wind_wave = np.sin(t + yn * 7.5)

    dx = np.zeros_like(xx)
    dy = np.zeros_like(yy)

    # Plant the boots, then let the body and costume snap harder around them.
    dx += (10.0 * sway + 3.0 * wind_wave) * upper
    dx += (xx - 310.0) * (0.018 * breath) * chest
    dy += (yy - 405.0) * (0.010 * breath) * chest
    dy += -5.0 * breath * shoulder

    dx += 9.0 * math.sin(t + 1.25) * hair
    dy += 2.5 * math.cos(t + 1.10) * hair

    dx += 15.0 * math.sin(t + 1.85) * tassel
    dy += 5.0 * math.cos(t + 1.55) * tassel

    dx += 18.0 * math.sin(t + 0.85) * cloak
    dy += 2.5 * math.cos(t + 0.65) * cloak

    dx += 13.0 * math.sin(t + 1.05) * sash
    dy += 3.0 * math.cos(t + 0.95) * sash

    dx += 7.0 * math.sin(t + 0.40) * sword
    dy += 3.0 * math.cos(t + 0.35) * sword

    sampled = bilinear_sample_premultiplied(source, xx - dx, yy - dy)
    return Image.fromarray(unpremultiply(sampled), mode="RGBA")


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        return (0, 0, 0, 0)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def build_atlas(frames: list[Image.Image]) -> Image.Image:
    rows = math.ceil(FRAME_COUNT / COLS)
    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        cell.alpha_composite(frame, (PLACE_X, PLACE_Y))
        atlas.alpha_composite(cell, ((index % COLS) * CELL_W, (index // COLS) * CELL_H))
    return atlas


def save_manifest() -> None:
    manifest = {
        "image": ATLAS_PATH.name,
        "source": SOURCE_PATH.name,
        "concept_source": "../concepts/ren-v2-model-sheet.png",
        "cell_width": CELL_W,
        "cell_height": CELL_H,
        "columns": COLS,
        "rows": math.ceil(FRAME_COUNT / COLS),
        "fps": FPS,
        "motion": "exaggerated planted idle: stronger cloth, hair, tassel, sword, and chest motion",
        "frames": [
            {
                "index": index,
                "name": f"ren_v2_idle_{index:02d}",
                "x": (index % COLS) * CELL_W,
                "y": (index // COLS) * CELL_H,
            }
            for index in range(FRAME_COUNT)
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def save_preview(frames: list[Image.Image]) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    preview_frames = []
    for frame in frames:
        cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        cell.alpha_composite(frame, (PLACE_X, PLACE_Y))
        crop = cell.crop((60, 30, 690, 870))
        background = Image.new("RGBA", crop.size, (8, 8, 14, 255))
        background.alpha_composite(crop)
        preview_frames.append(background.convert("P", palette=Image.Palette.ADAPTIVE))
    preview_frames[0].save(
        PREVIEW_PATH,
        save_all=True,
        append_images=preview_frames[1:],
        duration=int(1000 / FPS),
        loop=0,
        disposal=2,
    )


def main() -> None:
    source = Image.open(SOURCE_PATH).convert("RGBA")
    frames = [warp_frame(source, index) for index in range(FRAME_COUNT)]
    atlas = build_atlas(frames)
    atlas.save(ATLAS_PATH)
    save_manifest()
    save_preview(frames)

    frame_bounds = [alpha_bounds(frame) for frame in frames]
    atlas_bounds = alpha_bounds(atlas)
    print(f"wrote {ATLAS_PATH}")
    print(f"wrote {MANIFEST_PATH}")
    print(f"wrote {PREVIEW_PATH}")
    print(f"frame_bounds={frame_bounds}")
    print(f"atlas_bounds={atlas_bounds}")


if __name__ == "__main__":
    main()
