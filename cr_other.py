# -*- coding: utf-8 -*-
"""其他素材管理 · 节点 + 路由（人物参考节点包）

- 库初始为空，素材全部由用户自己添加 / 删除
- 添加时只要求一张图，提示词选填，类别选填（自己填新类别也行，留空归到「其他」）
- 图片默认**原样保存、不压缩**（像素尺寸与原图一致，字节也原样落盘）
- 可选「按比例压缩到 N 百万像素」：等比缩放，长宽比不变，N 自由填写
- 输出：素材图（IMAGE，原始尺寸）+ 提示词（STRING，没填则为空串）
"""
import io
import math
import os
import random as _random
import time

import numpy as np
import torch
from PIL import Image, ImageOps
from aiohttp import web

from server import PromptServer

from cr_common import ASSETS_DIR, Library, next_uid, human_bytes

LIB = Library("其他素材", "others.json")
ROUTE = "/other_picker"
SUB = "others"                       # 图片存放在 assets/others/
MAX_UPLOAD = 100 * 1024 * 1024       # 单张上限 100MB（不压缩，给足空间）
FMT_EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "BMP": ".bmp"}
MAX_PROMPT = 2000
DEFAULT_CAT = "其他"                 # 没填类别时自动归到这里
MAX_CAT = 24

# 允许尺寸非常大，放开 PIL 的解压炸弹阈值（仅告警级别）
Image.MAX_IMAGE_PIXELS = None


def _norm_cat(s):
    """类别名标准化：压掉多余空白、截断超长，空值归到「其他」。"""
    c = " ".join(str(s or "").replace("\r", " ").replace("\n", " ")
                 .replace("\t", " ").split())
    if len(c) > MAX_CAT:
        c = c[:MAX_CAT]
    return c or DEFAULT_CAT


def _cats_of(items):
    """按首次出现顺序统计类别，「其他」固定排在最后。"""
    seen = {}
    for it in items:
        c = _norm_cat(it.get("cat"))
        seen[c] = seen.get(c, 0) + 1
    names = [c for c in seen if c != DEFAULT_CAT]
    if DEFAULT_CAT in seen:
        names.append(DEFAULT_CAT)
    return [{"name": c, "n": seen[c]} for c in names]


def _item_out(it, ver):
    w, h = int(it.get("w") or 0), int(it.get("h") or 0)
    return {
        "id": it["id"],
        "cat": _norm_cat(it.get("cat")),
        "prompt": it.get("prompt", ""),
        "name": it.get("name", ""),
        "w": w,
        "h": h,
        "mp": round(w * h / 1e6, 2) if w and h else 0,
        "bytes": int(it.get("bytes") or 0),
        "url": "%s/img/%s?v=%s" % (ROUTE, it["id"], ver),
    }


def _target_size(w, h, mp):
    """按总像素等比缩放到 mp 百万像素；不放大，返回 ((w,h), 是否缩放)。"""
    if not mp or mp <= 0:
        return (w, h), False
    target = float(mp) * 1e6
    cur = float(w) * float(h)
    if target >= cur:
        return (w, h), False
    s = math.sqrt(target / cur)
    return (max(1, int(round(w * s))), max(1, int(round(h * s)))), True


def _store_image(raw, sid, mp):
    """把上传字节落盘。

    - 默认原样写字节（不改尺寸、不重新编码），仅当 EXIF 有旋转时纠正一次
    - 指定 mp 时等比缩放后重编码（有透明通道用 PNG，其余 JPEG q95）
    返回 (相对路径, 宽, 高, 字节数)
    """
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception as e:  # noqa: BLE001
        raise ValueError("无法识别这张图片：%s" % e)

    w, h = im.size
    if w < 1 or h < 1:
        raise ValueError("图片尺寸异常")
    fmt = (im.format or "PNG").upper()
    direct_fmt = fmt in FMT_EXT          # 能否原样保存
    if not direct_fmt:
        fmt = "PNG"

    try:
        orient = int(im.getexif().get(274, 1) or 1)
    except Exception:  # noqa: BLE001
        orient = 1

    (nw, nh), resized = _target_size(w, h, mp)

    # 什么都不用动 -> 原字节直接落盘（真正的「不压缩」）
    if direct_fmt and not resized and orient == 1:
        ext = FMT_EXT[fmt]
        rel = "%s/%s%s" % (SUB, sid, ext)
        path = os.path.join(ASSETS_DIR, SUB, sid + ext)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(raw)
        return rel, w, h, os.path.getsize(path)

    # 需要重编码：先摆正方向，再等比缩放
    work = ImageOps.exif_transpose(im)
    if resized and work.size != (nw, nh):
        work = work.resize((nw, nh), Image.LANCZOS)

    has_alpha = (work.mode in ("RGBA", "LA")
                 or (work.mode == "P" and "transparency" in work.info))
    if has_alpha:
        out_fmt = "PNG"
    elif fmt == "JPEG":
        out_fmt = "JPEG"
    elif fmt == "WEBP":
        out_fmt = "WEBP"
    else:
        out_fmt = "PNG"                  # BMP / GIF / TIFF 等统一转 PNG

    ext = FMT_EXT[out_fmt]
    rel = "%s/%s%s" % (SUB, sid, ext)
    path = os.path.join(ASSETS_DIR, SUB, sid + ext)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    if out_fmt == "JPEG":
        work.convert("RGB").save(path, "JPEG", quality=95, subsampling=0, optimize=True)
    elif out_fmt == "WEBP":
        work.save(path, "WEBP", quality=95, method=4)
    else:
        if work.mode not in ("RGB", "RGBA"):
            work = work.convert("RGBA" if has_alpha else "RGB")
        work.save(path, "PNG", optimize=True)

    with Image.open(path) as chk:
        fw, fh = chk.size
    return rel, fw, fh, os.path.getsize(path)


routes = PromptServer.instance.routes


@routes.get(ROUTE + "/list")
async def other_list(request):
    ver = LIB.version()
    raw_items = LIB.items()
    items = [_item_out(it, ver) for it in raw_items]
    cats = _cats_of(items)
    return web.json_response(
        {"items": items, "total": len(items), "cats": cats, "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.get(ROUTE + "/img/{sid}")
async def other_img(request):
    item = LIB.get(request.match_info["sid"])
    if not item:
        raise web.HTTPNotFound()
    path = LIB.abs_img(item)
    if not path or not os.path.isfile(path):
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


@routes.post(ROUTE + "/add")
async def other_add(request):
    """新增素材：multipart（file 必填 / prompt 选填 / cat 选填 / mp 选填）。"""
    try:
        form = await request.post()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "表单解析失败：%s" % e}, status=400)

    prompt = str(form.get("prompt") or "").strip()
    cat = _norm_cat(form.get("cat"))
    mp_raw = str(form.get("mp") or "").strip()
    name = str(form.get("name") or "").strip()
    up = form.get("file")

    if len(prompt) > MAX_PROMPT:
        return web.json_response(
            {"ok": False, "error": "提示词过长（最多 %d 字）" % MAX_PROMPT}, status=400)
    if up is None or not getattr(up, "file", None):
        return web.json_response({"ok": False, "error": "请选择一张图片"}, status=400)

    mp = 0.0
    if mp_raw:
        try:
            mp = float(mp_raw)
        except ValueError:
            return web.json_response({"ok": False, "error": "压缩像素请填数字（单位：百万像素）"}, status=400)
        if mp < 0 or mp > 400:
            return web.json_response({"ok": False, "error": "压缩像素请填 0.1 ~ 400 之间"}, status=400)

    raw = up.file.read()
    if not raw:
        return web.json_response({"ok": False, "error": "图片内容为空"}, status=400)
    if len(raw) > MAX_UPLOAD:
        return web.json_response(
            {"ok": False, "error": "图片过大（上限 %s）" % human_bytes(MAX_UPLOAD)}, status=400)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "素材库读取失败：%s" % e}, status=500)

    items = doc.setdefault("items", [])
    sid = next_uid(items, prefix="o")

    try:
        rel, w, h, size = _store_image(raw, sid, mp)
    except ValueError as e:
        return web.json_response({"ok": False, "error": str(e)}, status=400)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "图片写入失败：%s" % e}, status=500)

    item = {
        "id": sid,
        "cat": cat,
        "prompt": prompt,
        "img": rel,
        "w": w,
        "h": h,
        "bytes": size,
        "name": name or (getattr(up, "filename", "") or ""),
        "added": time.strftime("%Y-%m-%d %H:%M:%S"),
        "mode": ("mp:%.2f" % mp) if mp > 0 else "orig",
    }
    items.append(item)
    doc["total"] = len(items)

    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入素材库失败：%s" % e}, status=500)

    ver = LIB.version()
    return web.json_response(
        {"ok": True, "item": _item_out(item, ver), "total": len(items),
         "cats": _cats_of(items), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.post(ROUTE + "/update")
async def other_update(request):
    """改类别 / 提示词：JSON {"id": "o01", "cat": "...", "prompt": "..."}（图片不动）。"""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "请求格式错误"}, status=400)

    data = data if isinstance(data, dict) else {}
    sid = str(data.get("id") or "").strip()
    if not sid:
        return web.json_response({"ok": False, "error": "缺少素材 id"}, status=400)

    has_cat = "cat" in data
    has_prompt = "prompt" in data
    if not has_cat and not has_prompt:
        return web.json_response({"ok": False, "error": "没有要修改的内容"}, status=400)

    prompt = str(data.get("prompt") or "").strip()
    if has_prompt and len(prompt) > MAX_PROMPT:
        return web.json_response(
            {"ok": False, "error": "提示词过长（最多 %d 字）" % MAX_PROMPT}, status=400)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "素材库读取失败：%s" % e}, status=500)

    item = next((x for x in doc.get("items", []) if str(x.get("id")) == sid), None)
    if item is None:
        return web.json_response({"ok": False, "error": "没有找到这条素材"}, status=404)

    if has_cat:
        item["cat"] = _norm_cat(data.get("cat"))
    if has_prompt:
        item["prompt"] = prompt
    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入素材库失败：%s" % e}, status=500)

    ver = LIB.version()
    return web.json_response(
        {"ok": True, "item": _item_out(item, ver),
         "cats": _cats_of(doc.get("items", [])), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.post(ROUTE + "/delete")
async def other_delete(request):
    """批量删除素材：JSON {"ids": ["o01"]}。先写库，再删图片。"""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "请求格式错误"}, status=400)

    raw = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(raw, list) or not raw:
        return web.json_response({"ok": False, "error": "请提供要删除的素材 id"}, status=400)

    want = []
    for x in raw:
        s = str(x).strip()
        if s and s not in want:
            want.append(s)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "素材库读取失败：%s" % e}, status=500)

    items = doc.get("items", [])
    if not items:
        return web.json_response({"ok": False, "error": "素材库是空的"}, status=400)

    keep, removed = [], []
    for it in items:
        (removed if str(it.get("id")) in want else keep).append(it)

    if not removed:
        return web.json_response({"ok": False, "error": "没有找到要删除的素材"}, status=404)

    doc["items"] = keep
    doc["total"] = len(keep)
    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入素材库失败：%s" % e}, status=500)

    for it in removed:
        path = LIB.abs_img(it)
        if path and LIB.inside_assets(path) and os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass

    return web.json_response(
        {"ok": True, "deleted": [str(it.get("id")) for it in removed],
         "total": len(keep), "cats": _cats_of(keep), "version": LIB.version()},
        headers={"Cache-Control": "no-store"},
    )


class OtherAssetsManager:
    """其他素材管理：输出素材原图（不缩放）+ 提示词"""

    CATEGORY = "人物参考/其他素材"
    FUNCTION = "pick"
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("素材图", "提示词")
    DESCRIPTION = ("管理用户自建素材库（初始为空）：只加图，提示词与类别都选填（不填类别归到「其他」）；"
                   "原图不压缩，也可等比压缩到指定百万像素。输出素材图与提示词。")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "asset_id": ("STRING", {"default": ""}),
                "random": ("BOOLEAN", {"default": False}),
            }
        }

    @classmethod
    def IS_CHANGED(cls, asset_id, random, **kw):
        return float(time.time()) if random else ""

    def pick(self, asset_id, random=False):
        items = LIB.items()
        if not items:
            arr = np.zeros((512, 512, 3), dtype=np.float32)
            return (torch.from_numpy(arr)[None, ], "")

        item = _random.choice(items) if random else (LIB.get(asset_id) or items[0])

        path = LIB.abs_img(item)
        if not path or not os.path.isfile(path):
            arr = np.zeros((512, 512, 3), dtype=np.float32)
            return (torch.from_numpy(arr)[None, ], "")

        with Image.open(path) as im:
            img = ImageOps.exif_transpose(im).convert("RGB")   # 保持原始像素尺寸，不缩放

        arr = np.asarray(img).astype(np.float32) / 255.0
        return (torch.from_numpy(arr)[None, ], item.get("prompt", ""))


NODE_CLASS_MAPPINGS = {"OtherAssetsManager": OtherAssetsManager}
NODE_DISPLAY_NAME_MAPPINGS = {"OtherAssetsManager": "其他素材管理节点"}
