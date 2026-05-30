from __future__ import annotations

import base64
import io
import mimetypes
import re
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image


ENGINE_NAME = "pix2text"
P2T_IMPORT_ERROR = (
    "Pix2Text is not installed. Run: pip install -r ocr_service/requirements.txt"
)

_p2t_instance: Any | None = None


def _get_pix2text() -> Any:
    global _p2t_instance
    if _p2t_instance is not None:
        return _p2t_instance

    try:
        from pix2text import Pix2Text
    except ImportError as exc:
        raise RuntimeError(P2T_IMPORT_ERROR) from exc

    _p2t_instance = Pix2Text.from_config(
        total_configs={
            "text_formula": {
                "formula": {
                    "more_processor_configs": {
                        "use_fast": False,
                    }
                }
            }
        },
        device="cpu",
    )
    return _p2t_instance


def _position_to_bbox(position: Any) -> list[float] | None:
    if position is None:
        return None
    if hasattr(position, "tolist"):
        position = position.tolist()

    if isinstance(position, dict):
        values = [
            position.get("left") or position.get("x") or position.get("x0"),
            position.get("top") or position.get("y") or position.get("y0"),
            position.get("right") or position.get("x1"),
            position.get("bottom") or position.get("y1"),
        ]
        if all(isinstance(v, (int, float)) for v in values):
            return [float(v) for v in values]
        return None

    if isinstance(position, (list, tuple)):
        flat: list[float] = []
        for item in position:
            if isinstance(item, (int, float)):
                flat.append(float(item))
            elif isinstance(item, (list, tuple)):
                for value in item:
                    if isinstance(value, (int, float)):
                        flat.append(float(value))

        if len(flat) >= 4:
            xs = flat[0::2] if len(flat) > 4 else [flat[0], flat[2]]
            ys = flat[1::2] if len(flat) > 4 else [flat[1], flat[3]]
            return [min(xs), min(ys), max(xs), max(ys)]

    return None


def _normalize_block_type(raw_type: Any, text: str) -> str:
    value = str(raw_type or "").lower()
    if "table" in value:
        return "table"
    if "formula" in value or "math" in value or value in {"isolated", "embedding"}:
        return "formula"
    if "figure" in value or "image" in value:
        return "figure"
    if re.match(r"^\s*#{1,6}\s+", text):
        return "heading"
    return "paragraph"


def _normalize_markdown(markdown: str) -> str:
    text = markdown.replace("\r\n", "\n").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _looks_like_latex(text: str) -> bool:
    return bool(re.search(r"\\[a-zA-Z]+|[_^{}]|\\frac|\\sqrt", text))


def _block_markdown(block_type: str, text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        return ""
    if block_type == "formula":
        if cleaned.startswith("$$") or cleaned.startswith("$"):
            return cleaned
        if _looks_like_latex(cleaned):
            return f"$$\n{cleaned}\n$$"
    return cleaned


def _normalize_blocks(raw_blocks: Any) -> list[dict[str, Any]]:
    if isinstance(raw_blocks, dict):
        candidates = raw_blocks.get("outs") or raw_blocks.get("results") or raw_blocks.get("blocks")
        if candidates is None:
            candidates = [raw_blocks]
    elif isinstance(raw_blocks, list):
        candidates = raw_blocks
    else:
        candidates = []

    blocks: list[dict[str, Any]] = []
    for index, item in enumerate(candidates):
        if not isinstance(item, dict):
            continue

        text = str(
            item.get("text")
            or item.get("latex")
            or item.get("markdown")
            or item.get("content")
            or ""
        ).strip()
        block_type = _normalize_block_type(item.get("type") or item.get("category"), text)
        position = item.get("position")
        if position is None:
            position = item.get("bbox")
        if position is None:
            position = item.get("box")
        confidence = item.get("score")
        if confidence is None:
            confidence = item.get("confidence")
        if hasattr(confidence, "item"):
            confidence = confidence.item()

        block: dict[str, Any] = {
            "id": item.get("id") or f"block_{index + 1}",
            "type": block_type,
            "bbox": _position_to_bbox(position),
            "confidence": confidence,
        }

        if block_type == "formula":
            block["latex"] = text.strip("$ \n")
        elif block_type == "table":
            block["markdown"] = text
        else:
            block["text"] = text

        blocks.append(block)

    return blocks


def _markdown_from_blocks(blocks: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for block in blocks:
        value = block.get("markdown") or block.get("latex") or block.get("text") or ""
        parts.append(_block_markdown(str(block.get("type") or ""), str(value)))
    return _normalize_markdown("\n\n".join(part for part in parts if part))


def _page_element_to_block(element: Any) -> tuple[dict[str, Any], dict[str, Any] | None]:
    element_type_name = getattr(getattr(element, "type", None), "name", "UNKNOWN").lower()
    block_type_map = {
        "title": "heading",
        "text": "paragraph",
        "plain_text": "paragraph",
        "table": "table",
        "formula": "formula",
        "figure": "figure",
    }
    block_type = block_type_map.get(element_type_name, element_type_name)
    bbox = [float(value) for value in getattr(element, "box", [])] or None
    confidence = getattr(element, "score", None)
    if hasattr(confidence, "item"):
        confidence = confidence.item()

    block: dict[str, Any] = {
        "id": getattr(element, "id", ""),
        "type": block_type,
        "bbox": bbox,
        "confidence": confidence,
    }

    text = str(getattr(element, "text", "") or "").strip()
    asset = None

    if block_type == "formula":
        block["latex"] = text.strip("$ \n")
    elif block_type == "table":
        block["markdown"] = text
    elif block_type == "figure" and bbox:
        x0, y0, x1, y1 = [int(round(value)) for value in bbox]
        image = getattr(element, "total_img", None)
        if image is not None:
            width, height = image.size
            x0 = max(0, min(width - 1, x0))
            y0 = max(0, min(height - 1, y0))
            x1 = max(x0 + 1, min(width, x1))
            y1 = max(y0 + 1, min(height, y1))
            cropped = image.crop((x0, y0, x1, y1))
            data_url = _png_data_url(cropped)
            asset_id = f"{block['id']}_image"
            asset = {
                "id": asset_id,
                "type": "figure",
                "mimeType": "image/png",
                "dataUrl": data_url,
                "width": cropped.width,
                "height": cropped.height,
            }
            block["assetId"] = asset_id
            block["markdown"] = f"![图表]({data_url})"
        else:
            block["markdown"] = ""
    else:
        block["text"] = text

    return block, asset


def _recognize_page_to_structured(p2t: Any, image_path: Path) -> dict[str, Any]:
    page = p2t.recognize(
        str(image_path),
        file_type="page",
        table_as_image=False,
        text_contain_formula=True,
        title_contain_formula=False,
    )
    elements = list(getattr(page, "elements", []) or [])
    elements.sort()

    blocks: list[dict[str, Any]] = []
    assets: list[dict[str, Any]] = []
    for element in elements:
        block, asset = _page_element_to_block(element)
        if block.get("type") == "paragraph" and not block.get("text"):
            continue
        if block.get("type") == "formula" and not block.get("latex"):
            continue
        if block.get("type") == "table" and not block.get("markdown"):
            continue
        if asset:
            assets.append(asset)
        blocks.append(block)

    return {
        "markdown": _markdown_from_blocks(blocks),
        "blocks": blocks,
        "assets": assets,
    }


def _image_data_url(image_path: Path) -> str:
    mime_type = mimetypes.guess_type(image_path.name)[0] or "image/png"
    return f"data:{mime_type};base64,{base64.b64encode(image_path.read_bytes()).decode('ascii')}"


def _png_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('ascii')}"


def _attach_figure_assets(
    image_path: Path,
    blocks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    try:
        source = Image.open(image_path).convert("RGB")
    except Exception:
        return assets

    width, height = source.size
    for block in blocks:
        if block.get("type") != "figure" or not block.get("bbox"):
            continue

        x0, y0, x1, y1 = [int(round(value)) for value in block["bbox"]]
        x0 = max(0, min(width - 1, x0))
        y0 = max(0, min(height - 1, y0))
        x1 = max(x0 + 1, min(width, x1))
        y1 = max(y0 + 1, min(height, y1))

        cropped = source.crop((x0, y0, x1, y1))
        asset_id = f"{block['id']}_image"
        data_url = _png_data_url(cropped)
        assets.append(
            {
                "id": asset_id,
                "type": "figure",
                "mimeType": "image/png",
                "dataUrl": data_url,
                "width": cropped.width,
                "height": cropped.height,
            }
        )
        alt = str(block.get("text") or "图表").strip() or "图表"
        block["markdown"] = f"![{alt}]({data_url})"
        block["assetId"] = asset_id

    return assets


def _fallback_figure_asset(image_path: Path, markdown: str) -> list[dict[str, Any]]:
    # Pix2Text may already embed figures in Markdown. When it does not, keep a
    # reference to the original page image so the UI has a stable figure payload.
    if "data:image/" in markdown:
        return []

    try:
        with Image.open(image_path) as image:
            width, height = image.size
    except Exception:
        width = None
        height = None

    return [
        {
            "id": "source_image",
            "type": "source",
            "mimeType": mimetypes.guess_type(image_path.name)[0] or "image/png",
            "dataUrl": _image_data_url(image_path),
            "width": width,
            "height": height,
        }
    ]


def recognize_image_bytes(content: bytes, filename: str = "upload.png") -> dict[str, Any]:
    suffix = Path(filename).suffix or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        image_path = Path(temp_file.name)

    try:
        p2t = _get_pix2text()
        structured = _recognize_page_to_structured(p2t, image_path)
        markdown = structured["markdown"]
        blocks = structured["blocks"]
        assets = structured["assets"] or _fallback_figure_asset(image_path, markdown)
        return {
            "markdown": markdown,
            "blocks": blocks,
            "assets": assets,
            "engine": ENGINE_NAME,
        }
    finally:
        try:
            image_path.unlink(missing_ok=True)
        except Exception:
            pass
