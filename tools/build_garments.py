# -*- coding: utf-8 -*-
"""从 PoseSwap 的服装库，重建「服装选择器」图库。

用法（在节点根目录执行）：
    python tools/build_garments.py
    python tools/build_garments.py <garment.json 路径> <图片目录>

数据来源默认：
    F:/ComfyUI-MINIMAX-20260814/ComfyUI/custom_nodes/comfyui-aicg3d-PoseSwap-main
        /garments/data/garment.json  +  /garments/img/*.webp

产出：
    assets/garments/<分类>/<id>.jpg   统一 800×1200（中心裁剪到 2:3）
    assets/garments.json              id / gender / cat / name_cn / prompt_zh / desc_en

英文描述是「颜色 + 材质 + 品类 + 鞋包配饰」的扁平词组（全库仅 84 个词），
这里用词表机械翻译并按穿搭顺序拼成中文提示词；用户自建条目（source=user）重建时保留。
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ASSETS, "garments")
DATA = os.path.join(ASSETS, "garments.json")

SRC_DIR = r"F:\ComfyUI-MINIMAX-20260814\ComfyUI\custom_nodes\comfyui-aicg3d-PoseSwap-main"
SRC_JSON = os.path.join(SRC_DIR, "garments", "data", "garment.json")
SRC_IMG = os.path.join(SRC_DIR, "garments", "img")

SIZE = (800, 1200)
QUALITY = 88

# key 与前端 / garment_node.py 里的分类保持一致
CAT_MAP = {
    "春装": ("spring", "spr"),
    "夏装": ("summer", "sum"),
    "秋装": ("autumn", "aut"),
    "冬装": ("winter", "win"),
    "内衣": ("lingerie", "lng"),
    "派对": ("party", "pty"),
    "泳装": ("swim", "swm"),
    "性感": ("sexy", "sxy"),
}

# 词表：token -> (类别, 中文)
# 类别含义：color 颜色 / pattern 图案 / len 长度 / fabric 材质 / detail 细节 /
#           top 上装 / dress 连身 / bottom 下装 / legwear 袜类 / shoe 鞋 / bag 包 / acc 配饰
WORDS = {
    # 颜色
    "black": ("color", "黑色"), "white": ("color", "白色"), "ivory": ("color", "象牙白"),
    "beige": ("color", "米色"), "grey": ("color", "灰色"), "navy": ("color", "藏蓝色"),
    "red": ("color", "红色"), "blue": ("color", "蓝色"), "pink": ("color", "粉色"),
    "green": ("color", "绿色"), "mint": ("color", "薄荷绿"), "cream": ("color", "奶油白"),
    "brown": ("color", "棕色"), "gold": ("color", "金色"), "silver": ("color", "银色"),
    "yellow": ("color", "黄色"), "khaki": ("color", "卡其色"), "burgundy": ("color", "酒红色"),
    "orange": ("color", "橙色"), "olive": ("color", "橄榄绿"), "lavender": ("color", "薰衣草紫"),
    "purple": ("color", "紫色"),
    # 图案
    "floral": ("pattern", "碎花"), "polka-dot": ("pattern", "波点"),
    # 长度
    "mini": ("len", "迷你"), "midi": ("len", "中长"), "maxi": ("len", "长款"),
    # 材质 / 工艺
    "knit": ("fabric", "针织"), "lace": ("fabric", "蕾丝"), "leather": ("fabric", "皮革"),
    "satin": ("fabric", "缎面"), "denim": ("fabric", "牛仔"), "fur": ("fabric", "毛绒"),
    "wool": ("fabric", "羊毛"), "suede": ("fabric", "麂皮"), "velvet": ("fabric", "丝绒"),
    "chiffon": ("fabric", "雪纺"), "tulle": ("fabric", "薄纱"), "mesh": ("fabric", "网纱"),
    "corduroy": ("fabric", "灯芯绒"),
    "pleated": ("detail", "百褶"), "frill": ("detail", "荷叶边"), "ribbon": ("detail", "蝴蝶结"),
    # 上装
    "camisole": ("top", "吊带衫"), "cardigan": ("top", "针织开衫"), "jacket": ("top", "外套"),
    "shirt": ("top", "衬衫"), "blouse": ("top", "雪纺衫"), "sweater": ("top", "毛衣"),
    "turtleneck": ("top", "高领毛衣"), "vest": ("top", "背心"), "hoodie": ("top", "连帽卫衣"),
    "corset": ("top", "束身胸衣"), "bra": ("top", "文胸"), "coat": ("top", "大衣"),
    # 连身
    "dress": ("dress", "连衣裙"), "robe": ("dress", "长袍"),
    "swimsuit": ("dress", "泳衣"), "apron": ("dress", "围裙"),
    # 下装
    "skirt": ("bottom", "半身裙"), "pants": ("bottom", "长裤"), "shorts": ("bottom", "短裤"),
    "jeans": ("bottom", "牛仔裤"), "briefs": ("bottom", "内裤"),
    # 袜类
    "tights": ("legwear", "连裤袜"), "stockings": ("legwear", "丝袜"), "socks": ("legwear", "短袜"),
    # 鞋
    "boots": ("shoe", "靴子"), "heels": ("shoe", "高跟鞋"), "sandals": ("shoe", "凉鞋"),
    "sneakers": ("shoe", "运动鞋"), "loafers": ("shoe", "乐福鞋"), "pumps": ("shoe", "单鞋"),
    # 包
    "bag": ("bag", "手提包"), "tote": ("bag", "托特包"),
    # 配饰
    "necklace": ("acc", "项链"), "choker": ("acc", "颈链"), "belt": ("acc", "腰带"),
    "hat": ("acc", "帽子"), "headband": ("acc", "发箍"), "sunglasses": ("acc", "墨镜"),
    "scarf": ("acc", "围巾"), "muffler": ("acc", "围脖"), "beret": ("acc", "贝雷帽"),
    "beanie": ("acc", "针织帽"), "gloves": ("acc", "手套"),
}

# 中文里修饰语的先后顺序
MOD_ORDER = ("color", "pattern", "len", "fabric", "detail")

# 提示词里的穿搭顺序：(类别, 前缀)；dress/top 特殊处理
SEGMENTS = (
    ("dress", "身穿"),
    ("top", "上身穿"),
    ("bottom", "下身穿"),
    ("legwear", "腿上穿"),
    ("shoe", "脚踩"),
    ("bag", "手拎"),
    ("acc", "搭配"),
)

TAG_RE = re.compile(r"\[\d+\]")      # 有些描述末尾带 [3] 之类的水印编号


def parse(desc):
    """扁平词组 -> {类别: [中文短语, ...]}（保持原顺序）"""
    tokens = [t for t in re.split(r"[\s,;/]+", TAG_RE.sub(" ", desc.lower())) if t]
    buckets = {}
    mods = {}
    for i, t in enumerate(tokens):
        t = t.strip(".")
        if not t:
            continue
        if t == "olive" and i + 1 < len(tokens) and tokens[i + 1].startswith("green"):
            tokens[i + 1] = ""          # olive green -> 橄榄绿
        elif t == "mint" and i + 1 < len(tokens) and tokens[i + 1].startswith("green"):
            tokens[i + 1] = ""          # mint green -> 薄荷绿
        kind, zh = WORDS.get(t, ("", ""))
        if not zh:
            continue
        if kind in MOD_ORDER:
            mods[kind] = zh
            continue
        # 名词：把攒着的修饰语拼上去
        phrase = "".join(mods.get(k, "") for k in MOD_ORDER) + zh
        buckets.setdefault(kind, []).append(phrase)
        mods = {}
    # 结尾落单的修饰语（原文本身残缺，如 "... bag wool"）：丢弃，避免出现「搭配羊毛」
    return buckets


def join_zh(parts):
    """两个用「和」，三个及以上用「、」"""
    if len(parts) <= 2:
        return "和".join(parts)
    return "、".join(parts)


def to_prompt(buckets):
    """按穿搭顺序拼中文提示词。"""
    segs = []
    dress = buckets.get("dress", [])
    top = buckets.get("top", [])
    if dress:
        segs.append("身穿" + join_zh(dress))
        if top:
            segs.append("内搭" + join_zh(top))
    elif top:
        segs.append("上身穿" + join_zh(top))

    for kind, lead in SEGMENTS:
        if kind in ("dress", "top"):
            continue
        got = buckets.get(kind, [])
        if got:
            segs.append(lead + join_zh(got))

    return "服装：" + "，".join(segs) + "。" if segs else ""


def to_name(buckets):
    """卡片标题：主件 + 下装（各取第一件）"""
    main = (buckets.get("dress") or buckets.get("top") or buckets.get("bottom") or [""])[0]
    parts = [p for p in [main] if p]
    if buckets.get("bottom") and main not in buckets["bottom"][:1]:
        parts.append(buckets["bottom"][0])
    name = "、".join(parts) if parts else "服装"
    return name[:20]


def fit(im, size):
    tw, th = size
    im = im.convert("RGB")
    w, h = im.size
    tr = tw / float(th)
    if w / float(h) > tr:
        nw = max(1, int(round(h * tr)))
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    else:
        nh = max(1, int(round(w / tr)))
        top = (h - nh) // 2
        im = im.crop((0, top, w, top + nh))
    if im.size != (tw, th):
        im = im.resize((tw, th), Image.LANCZOS)
    return im


def main():
    src_json = sys.argv[1] if len(sys.argv) > 1 else SRC_JSON
    src_img = sys.argv[2] if len(sys.argv) > 2 else SRC_IMG

    with open(src_json, "r", encoding="utf-8") as f:
        recs = json.load(f)["records"]
    print("源记录 %d 条" % len(recs))

    # 保留用户自建条目
    keep_user = []
    if os.path.isfile(DATA):
        try:
            with open(DATA, "r", encoding="utf-8") as f:
                keep_user = [it for it in json.load(f).get("items", [])
                             if it.get("source") == "user"]
        except Exception:  # noqa: BLE001
            keep_user = []
    print("保留自建 %d 条" % len(keep_user))

    items = []
    missing = []
    for n, rec in enumerate(recs, 1):
        cat_cn = rec.get("cat_cn") or ""
        if cat_cn not in CAT_MAP:
            missing.append(rec.get("id"))
            continue
        key, slug = CAT_MAP[cat_cn]
        sid = str(rec["id"]).lower()
        src = os.path.join(src_img, os.path.basename(rec["img"]))
        if not os.path.isfile(src):
            missing.append(rec["id"])
            continue

        out_dir = os.path.join(OUT, slug)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, sid + ".jpg")
        if not os.path.isfile(out_path):
            im = fit(Image.open(src), SIZE)
            im.save(out_path, "JPEG", quality=QUALITY, optimize=True, subsampling=0)

        buckets = parse(rec.get("desc", ""))
        items.append({
            "id": sid,
            "gender": "female",
            "cat": key,
            "cat_cn": cat_cn,
            "name_cn": to_name(buckets),
            "prompt_zh": to_prompt(buckets),
            "desc_en": rec.get("desc", ""),
            "img": "garments/%s/%s.jpg" % (slug, sid),
        })
        if n % 100 == 0 or n == len(recs):
            print("  已处理 %d/%d" % (n, len(recs)), flush=True)

    items.extend(keep_user)

    doc = {
        "version": 2,
        "note": "服装选择器图库：图片 assets/garments/<分类>/*.jpg（800×1200），本文件由 tools/build_garments.py 生成",
        "cats": [{"key": k, "name": cn, "slug": s} for cn, (k, s) in CAT_MAP.items()],
        "items": items,
    }
    tmp = DATA + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    os.replace(tmp, DATA)

    print("完成：%d 条写入 %s" % (len(items), DATA))
    if missing:
        print("缺失/跳过 %d 条：%s" % (len(missing), missing[:10]))


if __name__ == "__main__":
    main()
