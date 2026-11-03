# -*- coding: utf-8 -*-
"""重建人脸库：把 Downloads\\人脸库 下筛选好的图导入 assets/faces/ 并生成 faces.json

用法：
    python tools/build_faces.py "C:\\Users\\Administrator\\Downloads\\人脸库"

源目录结构：<根>\\女\\001_长脸，挑眉深眼窝，冷艳英气.jpg
             <根>\\男\\001_方脸，浓眉宽鼻，憨厚朴实.jpg
文件名规则：「序号_脸型，五官特征，气质」

产出：
    assets/faces/f001.jpg ... f139.jpg   （统一 768×768）
    assets/faces.json                     （id / gender / name_cn / prompt_zh / img / src）
"""
import json
import os
import sys

from PIL import Image, ImageOps

NODE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(NODE_DIR, "assets")
OUT_DIR = os.path.join(ASSETS, "faces")
OUT_JSON = os.path.join(ASSETS, "faces.json")

SIZE = (768, 768)
QUALITY = 90

GENDER_CN = {"female": "女性", "male": "男性"}
GENDER_DIR = {"female": "女", "male": "男"}
EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")


def parse_name(filename):
    """'001_长脸，挑眉深眼窝，冷艳英气.jpg' -> ('长脸，挑眉深眼窝，冷艳英气')"""
    stem = os.path.splitext(filename)[0]
    if "_" in stem:
        head, rest = stem.split("_", 1)
        if head.isdigit():
            return rest.strip()
    return stem.strip()


def build_prompt(gender, desc):
    """中文提示词：'中国女性面部，长脸，挑眉深眼窝，冷艳英气。'"""
    desc = (desc or "").strip().rstrip("。.")
    return "中国%s面部，%s。" % (GENDER_CN.get(gender, ""), desc)


def center_square(im, size):
    """中心裁成 1:1 后缩放到 size（不再二次裁脸，源图已是面部特写）。"""
    w, h = im.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    im = im.crop((left, top, left + s, top + s))
    if im.size != size:
        im = im.resize(size, Image.LANCZOS)
    return im


def main():
    if len(sys.argv) < 2:
        print("用法: python tools/build_faces.py <人脸库根目录>")
        return 1
    root = sys.argv[1]
    if not os.path.isdir(root):
        print("目录不存在:", root)
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    # 清掉旧图（旧库已备份在 _backup_nodes）
    for f in os.listdir(OUT_DIR):
        if f.lower().endswith(EXTS):
            os.remove(os.path.join(OUT_DIR, f))

    items = []
    seq = 0
    stat = {}
    for gender in ("female", "male"):
        src_dir = os.path.join(root, GENDER_DIR[gender])
        if not os.path.isdir(src_dir):
            print("缺少目录:", src_dir)
            continue
        files = sorted(
            f for f in os.listdir(src_dir) if f.lower().endswith(EXTS)
        )
        n = 0
        for fn in files:
            src = os.path.join(src_dir, fn)
            try:
                im = Image.open(src)
                im = ImageOps.exif_transpose(im).convert("RGB")
            except Exception as e:  # noqa: BLE001
                print("  跳过 %s (%s)" % (fn, e))
                continue
            seq += 1
            sid = "f%03d" % seq
            out_im = center_square(im, SIZE)
            out_path = os.path.join(OUT_DIR, sid + ".jpg")
            out_im.save(out_path, "JPEG", quality=QUALITY, optimize=True, subsampling=0)

            desc = parse_name(fn)
            items.append(
                {
                    "id": sid,
                    "gender": gender,
                    "name_cn": desc,
                    "prompt_zh": build_prompt(gender, desc),
                    "img": "faces/%s.jpg" % sid,
                    "src": fn,
                }
            )
            n += 1
        stat[gender] = n
        print("  %s %d 张" % (GENDER_CN[gender], n))

    doc = {
        "version": 1,
        "total": len(items),
        "items": items,
    }
    tmp = OUT_JSON + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    os.replace(tmp, OUT_JSON)

    print("完成：共 %d 张（女 %d / 男 %d）" % (len(items), stat.get("female", 0), stat.get("male", 0)))
    print("输出：", OUT_JSON)
    return 0


if __name__ == "__main__":
    sys.exit(main())
