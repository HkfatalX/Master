#!/usr/bin/env python3
"""Gera os ícones do app (mipmap) a partir de assets/icon.png.

Uso: python3 scripts/make_icons.py assets/icon.png app/android/app/src/main/res
"""
import sys
from pathlib import Path

from PIL import Image

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

src = Image.open(sys.argv[1]).convert("RGB")
res = Path(sys.argv[2])
for name, px in SIZES.items():
    d = res / f"mipmap-{name}"
    d.mkdir(parents=True, exist_ok=True)
    src.resize((px, px), Image.LANCZOS).save(d / "ic_launcher.png")
print("Ícones gerados em", res)
