# -*- coding: utf-8 -*-
"""服装选择器 · 节点 + 路由（人物参考节点包）

- 节点上显示当前服装缩略图，点击打开选择弹窗（8 个分类 × 女装/男装 + 搜索）
- 库内图片统一 800×1200（2:3），存于 assets/garments/
- 输出：服装图（IMAGE）+ 中文提示词（STRING）
"""
import os
import random as _random
import time

import numpy as np
import torch
from PIL import Image
from aiohttp import web

from server import PromptServer

from cr_common import (
    ASSETS_DIR,
    Library,
    next_uid,
    prepare_upload,
    save_jpeg,
)

LIB = Library("服装", "garments.json")
SIZE = (800, 1200)         # 库内统一尺寸（2:3）
ROUTE = "/garment_picker"

# key 与数据文件里的 cat 字段一致；slug 用作 id 前缀
CATS = [
    ("spring", "春装", "spr"),
    ("summer", "夏装", "sum"),
    ("autumn", "秋装", "aut"),
    ("winter", "冬装", "win"),
    ("lingerie", "内衣", "lng"),
    ("party", "派对", "pty"),
    ("swim", "泳装", "swm"),
    ("sexy", "性感", "sxy"),
]
CAT_KEYS = {c[0] for c in CATS}
CAT_NAME = {c[0]: c[1] for c in CATS}
CAT_SLUG = {c[0]: c[2] for c in CATS}


def _item_out(it, ver):
    return {
        "id": it["id"],
        "gender": it.get("gender", "female"),
        "cat": it.get("cat", ""),
        "cat_cn": it.get("cat_cn", ""),
        "name_cn": it.get("name_cn", ""),
        "prompt_cn": it.get("prompt_zh", ""),
        "desc_en": it.get("desc_en", ""),
        "url": "%s/img/%s?v=%s" % (ROUTE, it["id"], ver),
    }


def _auto_name(prompt, items):
    """没填名称时用提示词前 12 字当名称；也没有就用「自建服装NN」。"""
    p = (prompt or "").strip().strip("。.")
    if p.startswith("服装："):
        p = p[3:]
    p = p.strip("。.")
    if p:
        return p[:12]
    n = sum(1 for it in items if str(it.get("source")) == "user")
    return "自建服装%02d" % (n + 1)


routes = PromptServer.instance.routes


@routes.get(ROUTE + "/list")
async def garment_list(request):
    ver = LIB.version()
    items = [_item_out(it, ver) for it in LIB.items()]
    counts = {}
    for it in items:
        counts[it["cat"]] = counts.get(it["cat"], 0) + 1
    cats = [{"key": k, "name": n, "count": counts.get(k, 0)} for k, n, _ in CATS]
    return web.json_response(
        {"items": items, "cats": cats, "total": len(items), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.get(ROUTE + "/img/{sid}")
async def garment_img(request):
    item = LIB.get(request.match_info["sid"])
    if not item:
        raise web.HTTPNotFound()
    path = LIB.abs_img(item)
    if not path or not os.path.isfile(path):
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


@routes.post(ROUTE + "/add")
async def garment_add(request):
    """新增服装：multipart 表单（file / gender / cat / prompt_zh[选填]）。"""
    try:
        form = await request.post()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "表单解析失败：%s" % e}, status=400)

    gender = str(form.get("gender") or "").strip()
    cat = str(form.get("cat") or "").strip()
    desc = str(form.get("prompt_zh") or "").strip()
    up = form.get("file")

    if gender not in ("female", "male"):
        return web.json_response({"ok": False, "error": "性别只能是 female 或 male"}, status=400)
    if cat not in CAT_KEYS:
        return web.json_response({"ok": False, "error": "分类不存在：%s" % cat}, status=400)
    if desc and len(desc) > 400:
        return web.json_response({"ok": False, "error": "提示词过长（最多 400 字）"}, status=400)
    if up is None or not getattr(up, "file", None):
        return web.json_response({"ok": False, "error": "请选择一张服装图片"}, status=400)

    raw = up.file.read()
    if not raw:
        return web.json_response({"ok": False, "error": "图片内容为空"}, status=400)
    if len(raw) > 20 * 1024 * 1024:
        return web.json_response({"ok": False, "error": "图片过大（上限 20MB）"}, status=400)

    try:
        img = prepare_upload(raw, SIZE)
    except Exception:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "无法识别这张图片，请换 jpg / png"}, status=400)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "服装库读取失败：%s" % e}, status=500)

    items = doc.setdefault("items", [])
    sid = next_uid(items)
    sub = CAT_SLUG[cat]
    rel = "garments/%s/%s.jpg" % (sub, sid)

    try:
        save_jpeg(img, os.path.join(ASSETS_DIR, "garments", sub, sid + ".jpg"), quality=88)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "图片写入失败：%s" % e}, status=500)

    item = {
        "id": sid,
        "gender": gender,
        "cat": cat,
        "cat_cn": CAT_NAME[cat],
        "name_cn": _auto_name(desc, items),
        "prompt_zh": desc if not desc else (desc if desc.endswith(("。", ".")) else desc + "。"),
        "desc_en": "",
        "img": rel,
        "source": "user",
    }
    items.append(item)

    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入服装库失败：%s" % e}, status=500)

    ver = LIB.version()
    return web.json_response(
        {"ok": True, "item": _item_out(item, ver), "total": len(items), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.post(ROUTE + "/delete")
async def garment_delete(request):
    """批量删除服装：JSON {"ids": ["u01", "spr-0001"]}。先写库，再删图片。"""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "请求格式错误"}, status=400)

    raw = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(raw, list) or not raw:
        return web.json_response({"ok": False, "error": "请提供要删除的服装 id"}, status=400)

    want = []
    for x in raw:
        s = str(x).strip()
        if s and s not in want:
            want.append(s)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "服装库读取失败：%s" % e}, status=500)

    items = doc.get("items", [])
    if not items:
        return web.json_response({"ok": False, "error": "服装库是空的"}, status=400)

    keep, removed = [], []
    for it in items:
        (removed if str(it.get("id")) in want else keep).append(it)

    if not removed:
        return web.json_response({"ok": False, "error": "没有找到要删除的服装"}, status=404)

    doc["items"] = keep
    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入服装库失败：%s" % e}, status=500)

    for it in removed:
        path = LIB.abs_img(it)
        if path and LIB.inside_assets(path) and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass

    return web.json_response(
        {"ok": True, "deleted": [str(it.get("id")) for it in removed],
         "total": len(keep), "version": LIB.version()},
        headers={"Cache-Control": "no-store"},
    )


class GarmentPicker:
    """服装选择器：输出服装图 + 中文提示词"""

    CATEGORY = "人物参考/服装"
    FUNCTION = "pick"
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("服装图", "提示词")
    DESCRIPTION = ("点击节点上的缩略图打开选择弹窗（春装/夏装/秋装/冬装/内衣/派对/泳装/性感 × 女装/男装），"
                   "输出 800×1200 服装图与中文提示词。")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "garment_id": ("STRING", {"default": ""}),
                "width": ("INT", {"default": 800, "min": 256, "max": 1600, "step": 8,
                                  "display": "number"}),
                "random": ("BOOLEAN", {"default": False}),
            }
        }

    @classmethod
    def IS_CHANGED(cls, garment_id, width, random, **kw):
        return float(time.time()) if random else ""

    def pick(self, garment_id, width=800, random=False):
        w = max(256, int(width) // 2 * 2)
        h = int(w * 3 // 2)
        items = LIB.items()
        if not items:
            arr = np.zeros((h, w, 3), dtype=np.float32)
            return (torch.from_numpy(arr)[None, ], "")

        item = _random.choice(items) if random else (
            LIB.get(garment_id) or items[0])

        path = LIB.abs_img(item)
        if not path or not os.path.isfile(path):
            img = Image.new("RGB", (w, h), (32, 32, 32))
        else:
            img = Image.open(path).convert("RGB")
            if img.size != (w, h):
                img = img.resize((w, h), Image.LANCZOS)

        arr = np.asarray(img).astype(np.float32) / 255.0
        return (torch.from_numpy(arr)[None, ], item.get("prompt_zh", ""))


NODE_CLASS_MAPPINGS = {"GarmentPicker": GarmentPicker}
NODE_DISPLAY_NAME_MAPPINGS = {"GarmentPicker": "服装选择器"}
