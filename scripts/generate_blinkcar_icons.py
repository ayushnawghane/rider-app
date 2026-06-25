#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


OUT_DIR = Path("public/icons")
SIZE = 256
SCALE = 4
W = SIZE * SCALE
PALETTE = [
    (255, 61, 0),
    (255, 107, 0),
    (255, 145, 0),
    (255, 179, 0),
]


def s(value: float) -> int:
    return round(value * SCALE)


def rounded_line(draw: ImageDraw.ImageDraw, points, width: int, fill=255) -> None:
    pts = [(s(x), s(y)) for x, y in points]
    draw.line(pts, fill=fill, width=s(width), joint="curve")
    r = s(width) // 2
    for x, y in pts:
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def subtract(mask: Image.Image, callback) -> None:
    cut = Image.new("L", (W, W), 0)
    callback(ImageDraw.Draw(cut))
    mask.paste(ImageChops.subtract(mask, cut))


def star_points(cx: float, cy: float, outer: float, inner: float, count=5):
    pts = []
    for i in range(count * 2):
        radius = outer if i % 2 == 0 else inner
        angle = -math.pi / 2 + i * math.pi / count
        pts.append((s(cx + math.cos(angle) * radius), s(cy + math.sin(angle) * radius)))
    return pts


def arrow_head(draw: ImageDraw.ImageDraw, tip, back, spread=18, fill=255) -> None:
    tx, ty = tip
    bx, by = back
    angle = math.atan2(ty - by, tx - bx)
    left = angle + math.pi * 0.78
    right = angle - math.pi * 0.78
    pts = [
        (s(tx), s(ty)),
        (s(tx + math.cos(left) * spread), s(ty + math.sin(left) * spread)),
        (s(tx + math.cos(right) * spread), s(ty + math.sin(right) * spread)),
    ]
    draw.polygon(pts, fill=fill)


def draw_search(draw, mask):
    draw.ellipse((s(54), s(45), s(153), s(144)), outline=255, width=s(24))
    rounded_line(draw, [(137, 131), (198, 192)], 24)


def draw_map_pin(draw, mask):
    draw.ellipse((s(58), s(33), s(198), s(173)), fill=255)
    draw.polygon([(s(78), s(132)), (s(178), s(132)), (s(128), s(222))], fill=255)
    subtract(mask, lambda d: d.ellipse((s(101), s(76), s(155), s(130)), fill=255))


def draw_clock(draw, mask):
    draw.ellipse((s(42), s(42), s(214), s(214)), outline=255, width=s(24))
    rounded_line(draw, [(128, 81), (128, 132), (166, 154)], 20)


def draw_users(draw, mask):
    draw.ellipse((s(84), s(45), s(140), s(101)), fill=255)
    draw.ellipse((s(153), s(59), s(201), s(107)), fill=255)
    draw.rounded_rectangle((s(54), s(126), s(171), s(204)), radius=s(39), fill=255)
    draw.rounded_rectangle((s(139), s(136), s(219), s(196)), radius=s(30), fill=255)
    subtract(mask, lambda d: d.rectangle((s(39), s(178), s(232), s(232)), fill=255))


def draw_car(draw, mask):
    draw.rounded_rectangle((s(38), s(96), s(218), s(174)), radius=s(25), fill=255)
    draw.polygon([(s(73), s(99)), (s(104), s(59)), (s(161), s(59)), (s(194), s(99))], fill=255)
    draw.ellipse((s(62), s(151), s(108), s(197)), fill=255)
    draw.ellipse((s(148), s(151), s(194), s(197)), fill=255)
    subtract(mask, lambda d: d.rounded_rectangle((s(108), s(73), s(153), s(101)), radius=s(8), fill=255))


def draw_award(draw, mask):
    draw.polygon([(s(88), s(139)), (s(112), s(139)), (s(103), s(221)), (s(72), s(188))], fill=255)
    draw.polygon([(s(144), s(139)), (s(168), s(139)), (s(184), s(188)), (s(153), s(221))], fill=255)
    draw.ellipse((s(63), s(34), s(193), s(164)), fill=255)
    subtract(mask, lambda d: d.polygon(star_points(128, 99, 37, 17), fill=255))


def draw_swap(draw, mask):
    rounded_line(draw, [(61, 82), (176, 82)], 22)
    arrow_head(draw, (198, 82), (166, 82), 23)
    rounded_line(draw, [(195, 174), (80, 174)], 22)
    arrow_head(draw, (58, 174), (90, 174), 23)


def draw_phone(draw, mask):
    rounded_line(draw, [(74, 66), (90, 107), (120, 141), (158, 168), (200, 182)], 31)
    draw.rounded_rectangle((s(56), s(50), s(91), s(88)), radius=s(13), fill=255)
    draw.rounded_rectangle((s(179), s(164), s(216), s(201)), radius=s(13), fill=255)


def draw_message(draw, mask):
    draw.rounded_rectangle((s(43), s(54), s(213), s(174)), radius=s(32), fill=255)
    draw.polygon([(s(91), s(166)), (s(71), s(212)), (s(129), s(174))], fill=255)
    subtract(mask, lambda d: d.rounded_rectangle((s(78), s(91), s(178), s(114)), radius=s(10), fill=255))


def draw_map(draw, mask):
    draw.polygon([(s(42), s(59)), (s(91), s(41)), (s(91), s(192)), (s(42), s(211))], fill=255)
    draw.polygon([(s(92), s(41)), (s(164), s(65)), (s(164), s(216)), (s(92), s(192))], fill=255)
    draw.polygon([(s(165), s(65)), (s(214), s(45)), (s(214), s(196)), (s(165), s(216))], fill=255)
    subtract(mask, lambda d: rounded_line(d, [(92, 51), (92, 187)], 8))
    subtract(mask, lambda d: rounded_line(d, [(164, 70), (164, 207)], 8))


def draw_star(draw, mask):
    draw.polygon(star_points(128, 127, 91, 42), fill=255)


def draw_plus(draw, mask):
    draw.rounded_rectangle((s(105), s(42), s(151), s(214)), radius=s(20), fill=255)
    draw.rounded_rectangle((s(42), s(105), s(214), s(151)), radius=s(20), fill=255)


def draw_house(draw, mask):
    draw.polygon([(s(36), s(119)), (s(128), s(42)), (s(220), s(119)), (s(196), s(145)), (s(128), s(88)), (s(60), s(145))], fill=255)
    draw.rounded_rectangle((s(61), s(123), s(195), s(211)), radius=s(20), fill=255)
    subtract(mask, lambda d: d.rounded_rectangle((s(110), s(154), s(146), s(211)), radius=s(12), fill=255))


def draw_inbox(draw, mask):
    draw.rounded_rectangle((s(47), s(63), s(209), s(196)), radius=s(24), fill=255)
    subtract(mask, lambda d: d.rectangle((s(68), s(79), s(188), s(121)), fill=255))
    subtract(mask, lambda d: d.rounded_rectangle((s(92), s(121), s(164), s(153)), radius=s(15), fill=255))


def draw_route(draw, mask):
    rounded_line(draw, [(67, 182), (100, 133), (154, 130), (188, 73)], 22)
    draw.ellipse((s(43), s(158), s(91), s(206)), fill=255)
    draw.ellipse((s(165), s(49), s(211), s(95)), fill=255)
    subtract(mask, lambda d: d.ellipse((s(58), s(173), s(76), s(191)), fill=255))
    subtract(mask, lambda d: d.ellipse((s(180), s(64), s(196), s(80)), fill=255))


def draw_user(draw, mask):
    draw.ellipse((s(82), s(42), s(174), s(134)), fill=255)
    draw.rounded_rectangle((s(51), s(144), s(205), s(218)), radius=s(45), fill=255)
    subtract(mask, lambda d: d.rectangle((s(45), s(194), s(211), s(230)), fill=255))


def draw_bell(draw, mask):
    draw.rounded_rectangle((s(70), s(72), s(186), s(178)), radius=s(54), fill=255)
    draw.rectangle((s(70), s(125), s(186), s(178)), fill=255)
    draw.rounded_rectangle((s(50), s(166), s(206), s(194)), radius=s(14), fill=255)
    draw.ellipse((s(108), s(188), s(148), s(221)), fill=255)
    draw.rounded_rectangle((s(113), s(42), s(143), s(78)), radius=s(15), fill=255)


def draw_zap(draw, mask):
    draw.polygon([
        (s(139), s(31)),
        (s(61), s(137)),
        (s(118), s(137)),
        (s(96), s(225)),
        (s(195), s(102)),
        (s(134), s(102)),
    ], fill=255)


ICONS = [
    ("search.png", draw_search),
    ("map-pin.png", draw_map_pin),
    ("clock.png", draw_clock),
    ("users.png", draw_users),
    ("car.png", draw_car),
    ("award.png", draw_award),
    ("swap.png", draw_swap),
    ("phone.png", draw_phone),
    ("message.png", draw_message),
    ("map.png", draw_map),
    ("star.png", draw_star),
    ("plus.png", draw_plus),
    ("house.png", draw_house),
    ("inbox.png", draw_inbox),
    ("route.png", draw_route),
    ("user.png", draw_user),
    ("bell.png", draw_bell),
    ("zap.png", draw_zap),
]


def gradient_layer(seed: int) -> Image.Image:
    y, x = np.mgrid[0:W, 0:W]
    t = (x + y) / (2 * (W - 1))
    stops = np.array(PALETTE, dtype=np.float32)
    scaled = t * (len(PALETTE) - 1)
    idx = np.minimum(scaled.astype(np.int16), len(PALETTE) - 2)
    frac = (scaled - idx)[..., None]
    rgb = stops[idx] * (1 - frac) + stops[idx + 1] * frac
    rng = np.random.default_rng(seed)
    grain = rng.integers(-10, 11, size=(W, W, 1), dtype=np.int16)
    rgb = np.clip(rgb.astype(np.int16) + grain, 0, 255).astype(np.uint8)
    alpha = np.full((W, W, 1), 255, dtype=np.uint8)
    return Image.fromarray(np.dstack([rgb, alpha]), "RGBA").filter(ImageFilter.GaussianBlur(radius=s(0.15)))


def render_icon(name: str, painter, index: int) -> None:
    mask = Image.new("L", (W, W), 0)
    painter(ImageDraw.Draw(mask), mask)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=s(0.15)))
    icon = gradient_layer(index)
    icon.putalpha(mask)
    icon = icon.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    icon.save(OUT_DIR / name, "PNG", optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, (name, painter) in enumerate(ICONS):
        render_icon(name, painter, index)


if __name__ == "__main__":
    main()
