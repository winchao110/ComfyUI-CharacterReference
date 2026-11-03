# -*- coding: utf-8 -*-
"""把「脸型眉形参考图」插入人脸库最前面（id r01..r06）。

- 源图 768×768 PNG（手绘插画，带图注），转 JPEG q92 存进 assets/faces/
- 条目插入 faces.json items 头部，因此面板里排在最前
- 幂等：重复执行会覆盖同 id 的图与条目，不会重复插入
"""
import json
import os
import sys

from PIL import Image

NODE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(NODE, "assets")
JSON = os.path.join(ASSETS, "faces.json")
SRC = r"C:\Users\Administrator\Downloads\脸型眉形参考图"

# (源文件名, id, 卡片上显示的名字) —— 顺序即面板显示顺序：从最通用的鹅蛋脸开始
PLAN = [
    ("鹅蛋脸，柔和的眉形，不破坏鹅蛋脸型原本的美感.png", "r01", "鹅蛋脸，眉形柔和，衬脸型美感"),
    ("圆脸，把眉峰挑高，显脸长.png", "r02", "圆脸，眉峰挑高，显脸长"),
    ("方脸，眉峰拉高，显脸长.png", "r03", "方脸，眉峰拉高，显脸长"),
    ("长脸，平眉，显得脸短一些.png", "r04", "长脸，平眉，显脸短"),
    ("心形脸，眉形柔和没有明显棱角，会看上去更温柔.png", "r05", "心形脸，眉形柔和无棱角，更温柔"),
    ("菱形脸，眉毛要弯，没有明显眉峰，不让注意力落到颧骨上.png", "r06", "菱形脸，弯眉无眉峰，弱化颧骨"),
]


def main():
    doc = json.load(open(JSON, encoding="utf-8"))
    items = doc["items"]
    old = {it["id"]: it for it in items}

    new_items = []
    for fn, fid, name in PLAN:
        src = os.path.join(SRC, fn)
        if not os.path.isfile(src):
            print("!! 缺图", fn)
            continue
        im = Image.open(src).convert("RGB")
        if im.size != (768, 768):
            im = im.resize((768, 768), Image.LANCZOS)
        out = os.path.join(ASSETS, "faces", fid + ".jpg")
        im.save(out, "JPEG", quality=92, subsampling=0, optimize=True)
        new_items.append({
            "id": fid,
            "gender": "female",
            "name_cn": name,
            "prompt_zh": "中国女性面部，%s。" % name,
            "img": "faces/%s.jpg" % fid,
            "src": fn,
        })
        print("  %s <- %s  %.0fKB" % (fid, fn, os.path.getsize(out) / 1024))

    # 去掉旧的同 id 条目，再把新条目置顶
    rest = [it for it in items if it["id"] not in {x["id"] for x in new_items}]
    doc["items"] = new_items + rest
    doc["total"] = len(doc["items"])
    tmp = JSON + ".tmp"
    json.dump(doc, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, JSON)
    print("faces.json: %d -> %d 条（新增/更新 %d）" % (len(items), doc["total"], len(new_items)))
    print("前 8 条 id:", [it["id"] for it in doc["items"][:8]])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
