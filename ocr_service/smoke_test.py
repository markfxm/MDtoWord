from __future__ import annotations

import json
import sys
from pathlib import Path

if __package__ is None or __package__ == "":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ocr_service.pix2text_adapter import recognize_image_bytes


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python ocr_service/smoke_test.py <image-path>", file=sys.stderr)
        return 2

    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(f"Image not found: {image_path}", file=sys.stderr)
        return 2

    result = recognize_image_bytes(image_path.read_bytes(), image_path.name)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
