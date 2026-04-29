from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
SPRITE_DIR = ROOT / "assets" / "sprites"
ARTIFACT_DIR = ROOT / "artifacts" / "ren-v2-implementation"

SOURCE_PATH = SPRITE_DIR / "ren-v2-idle-cutout.png"
ATLAS_PATH = SPRITE_DIR / "ren-v2-idle-atlas.png"
MANIFEST_PATH = SPRITE_DIR / "ren-v2-idle-atlas.json"
PREVIEW_PATH = ARTIFACT_DIR / "ren-v2-idle-chain-tassel-final-preview.gif"
ZOOM_PREVIEW_PATH = ARTIFACT_DIR / "ren-v2-idle-chain-tassel-final-zoom-preview.gif"
SHEET_PREVIEW_PATH = ARTIFACT_DIR / "ren-v2-idle-chain-tassel-final-approval-sheet.png"

FRAME_COUNT = 8
FPS = 6.0
CELL_W = 980
CELL_H = 1020
COLS = 4
ROWS = 2
PLACE_Y = 96

# The final frame is intentionally pulled back from the far-left swing so the loop
# lands cleanly into frame 0.
CHAIN_TASSEL_ANGLES = [-12, -6, 3, 12, 9, 1, -8, -10]


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def soften(mask: np.ndarray, power: float = 1.0) -> np.ndarray:
    return np.clip(mask, 0.0, 1.0) ** power


def sample_premultiplied(source: np.ndarray, sample_x: np.ndarray, sample_y: np.ndarray) -> np.ndarray:
    height, width, _ = source.shape
    valid = (
        (sample_x >= 0.0)
        & (sample_x <= width - 1)
        & (sample_y >= 0.0)
        & (sample_y <= height - 1)
    )
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
    return np.clip(np.concatenate([rgb, alpha], axis=2) * 255.0, 0.0, 255.0).astype(np.uint8)


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha)
    if len(xs) == 0:
        return (0, 0, 0, 0)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def build_motion_masks(source_image: Image.Image) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    source_pixels = np.asarray(source_image.convert("RGBA"), dtype=np.float32)
    height, width, _ = source_pixels.shape
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    xn = xx / max(width - 1, 1)
    yn = yy / max(height - 1, 1)

    alpha = source_pixels[..., 3] / 255.0
    r, g, b = source_pixels[..., 0], source_pixels[..., 1], source_pixels[..., 2]
    redish = ((r > 72) & (g < 88) & (b > 42) & (alpha > 0.10)).astype(np.float32)
    visible = np.clip(alpha * 2.2, 0.0, 1.0)

    lower_zone = smoothstep(0.50, 0.62, yn) * (1.0 - smoothstep(0.99, 1.0, yn))
    left_lower = 1.0 - smoothstep(0.56, 0.75, xn)
    lower_red = redish * lower_zone * left_lower * visible
    lower_tip_weight = smoothstep(0.58, 0.88, yn)
    outer_tip_weight = 1.0 - smoothstep(0.30, 0.55, xn)
    lower_strength = soften(lower_red * (0.45 + 0.75 * lower_tip_weight + 0.35 * outer_tip_weight), 0.70)

    front_sash = (
        redish
        * smoothstep(0.39, 0.48, yn)
        * (1.0 - smoothstep(0.61, 0.73, yn))
        * smoothstep(0.12, 0.22, xn)
        * (1.0 - smoothstep(0.62, 0.75, xn))
        * visible
    )
    front_sash = soften(front_sash, 0.95)

    hair = (
        visible
        * smoothstep(0.24, 0.36, xn)
        * (1.0 - smoothstep(0.70, 0.82, xn))
        * smoothstep(0.04, 0.08, yn)
        * (1.0 - smoothstep(0.24, 0.34, yn))
    )
    hair = soften(hair, 1.15) * 0.22

    blend_mask = np.clip(lower_strength + front_sash + hair, 0.0, 1.0)
    return lower_strength, lower_tip_weight, front_sash, hair, blend_mask


def build_chain_layers(source_image: Image.Image) -> tuple[tuple[int, int], Image.Image, Image.Image, tuple[int, int], Image.Image]:
    move_box = (4, 38, 84, 186)
    pivot_global = (38, 42)
    pivot_local = (pivot_global[0] - move_box[0], pivot_global[1] - move_box[1])
    move_source = source_image.crop(move_box)
    move_pixels = np.asarray(move_source.convert("RGBA"))
    alpha = move_pixels[..., 3]
    local_y, local_x = np.mgrid[0 : move_source.height, 0 : move_source.width]
    global_x = local_x + move_box[0]
    global_y = local_y + move_box[1]

    upper_chain = (global_y >= 40) & (global_y <= 104) & (global_x >= 20) & (global_x <= 53)
    connector = (global_y >= 86) & (global_y <= 123) & (global_x >= 18) & (global_x <= 62)
    tassel = (global_y >= 104) & (global_y <= 184) & (global_x >= 4) & (global_x <= 82)
    not_sword = ~(((global_x >= 50) & (global_y <= 92)) | ((global_x >= 56) & (global_y <= 116)))
    move_mask_pixels = (alpha > 5) & (upper_chain | connector | tassel) & not_sword
    move_mask = Image.fromarray(np.where(move_mask_pixels, 255, 0).astype(np.uint8), "L")
    move_piece = Image.new("RGBA", move_source.size, (0, 0, 0, 0))
    move_piece.paste(move_source, (0, 0), move_mask)

    overlay_box = (0, 0, 132, 118)
    overlay_source = source_image.crop(overlay_box)
    overlay_pixels = np.asarray(overlay_source.convert("RGBA"))
    overlay_alpha = overlay_pixels[..., 3]
    overlay_y, overlay_x = np.mgrid[0 : overlay_source.height, 0 : overlay_source.width]
    global_overlay_x = overlay_x + overlay_box[0]
    global_overlay_y = overlay_y + overlay_box[1]
    pommel = (global_overlay_y <= 45) & (global_overlay_x <= 78)
    handle = (global_overlay_x >= 48) & (global_overlay_y <= 118)
    not_original_chain = ~((global_overlay_x <= 48) & (global_overlay_y >= 42))
    overlay_mask_pixels = (overlay_alpha > 5) & (pommel | handle) & not_original_chain
    overlay_mask = Image.fromarray(np.where(overlay_mask_pixels, 255, 0).astype(np.uint8), "L")
    overlay_piece = Image.new("RGBA", overlay_source.size, (0, 0, 0, 0))
    overlay_piece.paste(overlay_source, (0, 0), overlay_mask)

    save_mask_guide(source_image, move_box, move_mask_pixels, overlay_box, overlay_mask_pixels, pivot_global)
    return move_box[:2], move_mask, move_piece, pivot_global, overlay_piece


def save_mask_guide(
    source_image: Image.Image,
    move_box: tuple[int, int, int, int],
    move_mask_pixels: np.ndarray,
    overlay_box: tuple[int, int, int, int],
    overlay_mask_pixels: np.ndarray,
    pivot_global: tuple[int, int],
) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    guide_crop = source_image.crop((0, 0, 145, 205))
    guide = Image.new("RGBA", guide_crop.size, (7, 7, 13, 255))
    guide.alpha_composite(guide_crop)

    moving = np.zeros((guide.height, guide.width, 4), dtype=np.uint8)
    for y in range(move_box[1], move_box[3]):
        for x in range(move_box[0], move_box[2]):
            if 0 <= x < guide.width and 0 <= y < guide.height and move_mask_pixels[y - move_box[1], x - move_box[0]]:
                moving[y, x] = [0, 255, 80, 110]

    locked = np.zeros((guide.height, guide.width, 4), dtype=np.uint8)
    for y in range(overlay_box[1], overlay_box[3]):
        for x in range(overlay_box[0], overlay_box[2]):
            if 0 <= x < guide.width and 0 <= y < guide.height and overlay_mask_pixels[y - overlay_box[1], x - overlay_box[0]]:
                locked[y, x] = [0, 160, 255, 95]

    guide.alpha_composite(Image.fromarray(moving, "RGBA"))
    guide.alpha_composite(Image.fromarray(locked, "RGBA"))
    draw = ImageDraw.Draw(guide)
    draw.ellipse((pivot_global[0] - 3, pivot_global[1] - 3, pivot_global[0] + 3, pivot_global[1] + 3), fill=(255, 255, 0, 255))
    draw.text((4, 184), "green moves, blue locks sword", fill=(230, 230, 230, 255))
    guide.resize((guide.width * 4, guide.height * 4), Image.Resampling.NEAREST).save(
        ARTIFACT_DIR / "ren-v2-chain-tassel-final-mask-guide.png"
    )


def paste_chain_tassel(
    frame: Image.Image,
    angle: float,
    move_origin: tuple[int, int],
    move_mask: Image.Image,
    move_piece: Image.Image,
    pivot_global: tuple[int, int],
    overlay_piece: Image.Image,
) -> Image.Image:
    out = frame.copy()
    out.paste(Image.new("RGBA", move_piece.size, (0, 0, 0, 0)), move_origin, move_mask)

    canvas_size = (180, 230)
    center = (canvas_size[0] // 2, 28)
    pivot_local = (pivot_global[0] - move_origin[0], pivot_global[1] - move_origin[1])
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(move_piece, (center[0] - pivot_local[0], center[1] - pivot_local[1]))
    rotated = canvas.rotate(angle, resample=Image.Resampling.BICUBIC, center=center)
    out.alpha_composite(rotated, (pivot_global[0] - center[0], pivot_global[1] - center[1]))

    # Draw the original sword cap, pommel, and handle back over the moving charm.
    out.alpha_composite(overlay_piece, (0, 0))
    return out


def build_frames(source_image: Image.Image) -> list[Image.Image]:
    source = np.asarray(source_image.convert("RGBA"), dtype=np.float32) / 255.0
    source[..., :3] *= source[..., 3:4]
    height, width, _ = source.shape
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)

    lower_strength, lower_tip_weight, front_sash, hair, blend_mask = build_motion_masks(source_image)
    move_origin, move_mask, move_piece, pivot_global, overlay_piece = build_chain_layers(source_image)

    frames: list[Image.Image] = []
    for index, angle in enumerate(CHAIN_TASSEL_ANGLES):
        t = math.tau * index / FRAME_COUNT
        wave = math.sin(t + 1.15)
        follow = math.sin(t * 2.0 + 0.35)
        lower_dx = (15.0 * wave + 4.0 * follow) * (0.45 + 0.75 * lower_tip_weight)
        lower_dy = (2.4 * math.cos(t + 1.15) + 0.8 * math.cos(t * 2.0)) * lower_tip_weight
        sash_dx = 1.0 * math.sin(t + 0.75)
        sash_dy = 0.25 * math.cos(t + 0.75)
        hair_dx = 0.24 * math.sin(t + 0.55)
        hair_dy = 0.05 * math.cos(t + 0.55)

        dx = lower_strength * lower_dx + front_sash * sash_dx + hair * hair_dx
        dy = lower_strength * lower_dy + front_sash * sash_dy + hair * hair_dy
        warped = sample_premultiplied(source, xx - dx, yy - dy)
        frame = source * (1.0 - blend_mask[..., None]) + warped * blend_mask[..., None]
        frame_image = Image.fromarray(unpremultiply(frame), "RGBA")
        frames.append(paste_chain_tassel(frame_image, angle, move_origin, move_mask, move_piece, pivot_global, overlay_piece))
    return frames


def build_atlas(frames: list[Image.Image]) -> Image.Image:
    source_w, _ = frames[0].size
    place_x = (CELL_W - source_w) // 2
    atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        cell.alpha_composite(frame, (place_x, PLACE_Y))
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
        "rows": ROWS,
        "fps": FPS,
        "visible_bottom": PLACE_Y + 792,
        "motion": "planted idle with strong lower-cloth wave; chain and tassel swing as a separate layer while sword handle is locked",
        "frames": [
            {
                "index": index,
                "name": f"ren_v2_idle_{index:02d}",
                "x": (index % COLS) * CELL_W,
                "y": (index // COLS) * CELL_H,
                "chain_tassel_angle": CHAIN_TASSEL_ANGLES[index],
            }
            for index in range(FRAME_COUNT)
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def save_previews(frames: list[Image.Image]) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    place_x = (CELL_W - frames[0].width) // 2

    sheet_scale = 0.43
    small_cell = (int(CELL_W * sheet_scale), int(CELL_H * sheet_scale))
    gutter = 28
    sheet = Image.new("RGBA", (small_cell[0] * COLS + gutter * (COLS + 1), small_cell[1] * ROWS + gutter * (ROWS + 1)), (7, 7, 13, 255))
    draw = ImageDraw.Draw(sheet)

    preview_frames = []
    zoom_frames = []
    for index, frame in enumerate(frames):
        cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        cell.alpha_composite(frame, (place_x, PLACE_Y))
        bg = Image.new("RGBA", (CELL_W, CELL_H), (7, 7, 13, 255))
        bg.alpha_composite(cell)

        small = bg.resize(small_cell, Image.Resampling.LANCZOS)
        sheet_x = gutter + (index % COLS) * (small_cell[0] + gutter)
        sheet_y = gutter + (index // COLS) * (small_cell[1] + gutter)
        sheet.alpha_composite(small, (sheet_x, sheet_y))
        draw.rectangle((sheet_x, sheet_y, sheet_x + small_cell[0] - 1, sheet_y + small_cell[1] - 1), outline=(0, 220, 255, 170), width=2)

        preview_frames.append(bg.resize((646, 672), Image.Resampling.LANCZOS).convert("P", palette=Image.Palette.ADAPTIVE))
        zoom = bg.crop((place_x - 10, PLACE_Y - 8, place_x + 188, PLACE_Y + 228)).resize((594, 708), Image.Resampling.NEAREST)
        zoom_frames.append(zoom.convert("P", palette=Image.Palette.ADAPTIVE))

    sheet.save(SHEET_PREVIEW_PATH)
    preview_frames[0].save(PREVIEW_PATH, save_all=True, append_images=preview_frames[1:], duration=int(1000 / FPS), loop=0, disposal=2)
    zoom_frames[0].save(ZOOM_PREVIEW_PATH, save_all=True, append_images=zoom_frames[1:], duration=int(1000 / FPS), loop=0, disposal=2)


def main() -> None:
    source_image = Image.open(SOURCE_PATH).convert("RGBA")
    frames = build_frames(source_image)
    atlas = build_atlas(frames)
    atlas.save(ATLAS_PATH)
    save_manifest()
    save_previews(frames)

    print(f"wrote {ATLAS_PATH}")
    print(f"wrote {MANIFEST_PATH}")
    print(f"wrote {PREVIEW_PATH}")
    print(f"wrote {ZOOM_PREVIEW_PATH}")
    print(f"wrote {SHEET_PREVIEW_PATH}")
    print(f"frame_bounds={[alpha_bounds(frame) for frame in frames]}")
    print(f"atlas_bounds={alpha_bounds(atlas)}")


if __name__ == "__main__":
    main()
