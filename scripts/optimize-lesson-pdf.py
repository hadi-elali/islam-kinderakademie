"""Prepare a smaller PDF copy and verify every page before publication.

Offline dependencies: pikepdf, Pillow, PyMuPDF, numpy. No network or credentials.
Keeps image resolution, color profiles, soft masks, text, and document structure.
Only large Flate-compressed RGB images are encoded as high-quality 4:4:4 JPEG.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np
import pikepdf
import pymupdf


def page_features(page):
    links = [{k: v for k, v in item.items() if k != "xref"} for item in page.get_links()]
    annotations = [(item.type, tuple(item.rect), item.flags, item.info) for item in page.annots() or []]
    widgets = [(item.field_name, item.field_value, tuple(item.rect)) for item in page.widgets() or []]
    return (tuple(page.rect), page.rotation, page.get_text(), links, annotations, widgets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--quality", type=int, default=95)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    if args.source.resolve() == args.target.resolve():
        raise ValueError("The original must remain intact")
    if not 90 <= args.quality <= 100:
        raise ValueError("Use quality 90–100 for teaching documents")

    converted = []
    with pikepdf.open(args.source) as pdf:
        if pdf.is_encrypted or int(pdf.Root.get("/AcroForm", {}).get("/SigFlags", 0)):
            raise ValueError("Encrypted or signed originals require a separate review")
        for obj in pdf.objects:
            if not isinstance(obj, pikepdf.Stream) or obj.get("/Subtype") != pikepdf.Name("/Image"):
                continue
            if str(obj.get("/Filter")) != "/FlateDecode" or obj.get("/ImageMask", False):
                continue
            width, height = int(obj.get("/Width", 0)), int(obj.get("/Height", 0))
            if min(width, height) < 300 or width * height < 100000 or int(obj.get("/BitsPerComponent", 0)) != 8:
                continue
            old_size = len(obj.read_raw_bytes())
            # Raw samples retain the original /Decode mapping and ICC profile.
            # Keep PDF soft masks in their existing lossless streams. Extracting
            # just the base samples avoids flattening transparency into JPEG.
            image = pikepdf.PdfImage(obj).as_pil_image(apply_decode_array=False, apply_mask=False)
            if image.mode != "RGB":
                continue
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=args.quality, subsampling=0, optimize=True)
            data = output.getvalue()
            if len(data) >= old_size * 0.9:
                continue
            obj.write(data, filter=pikepdf.Name("/DCTDecode"))
            if "/DecodeParms" in obj:
                del obj["/DecodeParms"]
            converted.append({"width": width, "height": height, "before": old_size, "after": len(data)})
        pdf.save(args.target, compress_streams=True, recompress_flate=True,
                 object_stream_mode=pikepdf.ObjectStreamMode.generate, linearize=True)

    pages = []
    with pymupdf.open(args.source) as original, pymupdf.open(args.target) as optimized:
        assert original.page_count == optimized.page_count, "Page count changed"
        assert original.get_toc() == optimized.get_toc(), "Bookmarks changed"
        assert original.embfile_names() == optimized.embfile_names(), "Attachments changed"
        for name in original.embfile_names():
            assert original.embfile_get(name) == optimized.embfile_get(name), "Attachment content changed"
        for index in range(original.page_count):
            before, after = original[index], optimized[index]
            assert page_features(before) == page_features(after), f"Page {index + 1}: structure/text changed"
            first = before.get_pixmap(dpi=144, alpha=False, colorspace=pymupdf.csRGB)
            second = after.get_pixmap(dpi=144, alpha=False, colorspace=pymupdf.csRGB)
            assert (first.width, first.height, first.n) == (second.width, second.height, second.n)
            a = np.frombuffer(first.samples, dtype=np.uint8).astype(np.int16)
            b = np.frombuffer(second.samples, dtype=np.uint8).astype(np.int16)
            difference = np.abs(a - b)
            mean = float(difference.mean())
            large = float((difference > 20).mean())
            assert mean < 2.5 and large < 0.01, f"Page {index + 1}: visual difference requires review"
            pages.append({"page": index + 1, "mean_channel_difference_255": round(mean, 5),
                          "channel_fraction_difference_above_20": round(large, 7)})
        result = {"original_bytes": args.source.stat().st_size, "optimized_bytes": args.target.stat().st_size,
                  "original_sha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
                  "optimized_sha256": hashlib.sha256(args.target.read_bytes()).hexdigest(),
                  "pages": original.page_count, "bookmarks": len(original.get_toc()),
                  "structure_and_text_unchanged": True, "image_resolution_unchanged": True,
                  "jpeg_quality": args.quality, "jpeg_subsampling": "4:4:4", "converted_images": len(converted),
                  "render_comparisons": pages}
    args.report.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
