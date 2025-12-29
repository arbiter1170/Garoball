import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image


SURFACE_PREFIXES = (
    "groundBeige",
    "groundGrass",
    "groundGravel",
    "groundIce",
    "groundTarmac",
    "groundTransparent",
)


def find_image_for_xml(xml_path: Path) -> Path:
    image_from_attr = xml_path.parent / (xml_path.stem + ".png")
    if image_from_attr.exists():
        return image_from_attr

    try:
        root = ET.parse(xml_path).getroot()
        image_attr = root.attrib.get("imagePath")
        if image_attr:
            candidate = xml_path.parent / image_attr
            if candidate.exists():
                return candidate
    except ET.ParseError:
        pass

    raise FileNotFoundError(f"Could not locate image for {xml_path}")


def load_surface_metadata(asset_dir: Path) -> list[dict]:
    surfaces = []
    for path in sorted(asset_dir.glob("ground*.png")):
        with Image.open(path) as img:
            width, height = img.size
        theme = next((p for p in SURFACE_PREFIXES if path.stem.startswith(p)), "ground")
        surfaces.append(
            {
                "type": "surface",
                "name": path.stem,
                "theme": theme,
                "file": str(path.name),
                "width": width,
                "height": height,
            }
        )
    return surfaces


def load_spritesheet_metadata(xml_path: Path) -> dict:
    root = ET.parse(xml_path).getroot()
    image_path = find_image_for_xml(xml_path)
    with Image.open(image_path) as img:
        sheet_width, sheet_height = img.size

    frames = []
    for node in root.findall("SubTexture"):
        frame = {
            "name": node.attrib.get("name"),
            "x": int(node.attrib.get("x", 0)),
            "y": int(node.attrib.get("y", 0)),
            "width": int(node.attrib.get("width", 0)),
            "height": int(node.attrib.get("height", 0)),
        }
        frames.append(frame)

    return {
        "type": "spritesheet",
        "name": xml_path.stem,
        "file": str(image_path.name),
        "source_xml": str(xml_path.name),
        "dimensions": {"width": sheet_width, "height": sheet_height},
        "frames": frames,
    }


def load_single_image_metadata(image_path: Path) -> dict:
    with Image.open(image_path) as img:
        width, height = img.size
    return {
        "type": "image",
        "name": image_path.stem,
        "file": str(image_path.name),
        "width": width,
        "height": height,
    }


def build_manifest(asset_dir: Path) -> dict:
    manifest: dict[str, list] = {"surfaces": [], "spritesheets": [], "images": []}

    manifest["surfaces"] = load_surface_metadata(asset_dir)

    for xml_path in sorted(asset_dir.glob("*.xml")):
        manifest["spritesheets"].append(load_spritesheet_metadata(xml_path))

    referenced_images = {entry["file"] for entry in manifest["surfaces"]}
    referenced_images.update(sheet["file"] for sheet in manifest["spritesheets"])

    for image_path in sorted(asset_dir.glob("*.png")):
        if image_path.name in referenced_images:
            continue
        manifest["images"].append(load_single_image_metadata(image_path))

    return manifest


def main():
    parser = argparse.ArgumentParser(description="Analyze sprite assets and emit a manifest for the renderer.")
    parser.add_argument("asset_dir", nargs="?", default=".", help="Directory containing PNG and XML assets")
    parser.add_argument("--output", "-o", default="asset_manifest.json", help="Where to write the manifest JSON")
    args = parser.parse_args()

    asset_dir = Path(args.asset_dir).resolve()
    manifest = build_manifest(asset_dir)

    output_path = Path(args.output)
    output_path.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote manifest with {len(manifest['surfaces'])} surfaces, {len(manifest['spritesheets'])} spritesheets, "
          f"{len(manifest['images'])} standalone images → {output_path}")


if __name__ == "__main__":
    main()
