# -*- coding: utf-8 -*-
"""发型选择器 · 节点 + 路由（人物参考节点包）

- 节点上显示当前发型缩略图，点击打开选择弹窗（女生 / 男生 分类 + 搜索）
- 输出：发型图（IMAGE）+ 中文提示词（STRING）
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

LIB = Library("发型", "hairstyles.json")
SIZE = (640, 640)          # 库内统一尺寸
ROUTE = "/hairstyle_picker"


def _item_out(it, ver):
    return {
        "id": it["id"],
        "gender": it["gender"],
        "name_cn": it["name_cn"],
        "prompt_cn": it.get("prompt_zh", ""),
        "url": "%s/img/%s?v=%s" % (ROUTE, it["id"], ver),
    }


def _build_prompt(name, desc):
    """拼中文提示词。留空时只输出「发型XX。」；填了描述则按现有格式拼接。"""
    name = (name or "").strip()
    desc = (desc or "").strip().rstrip("。.")
    if not desc:
        return "发型%s。" % name
    if desc.startswith("发型"):
        return desc if desc.endswith("。") else desc + "。"
    return "发型%s，%s。" % (name, desc)


routes = PromptServer.instance.routes


@routes.get(ROUTE + "/list")
async def hairstyle_list(request):
    ver = LIB.version()
    items = [_item_out(it, ver) for it in LIB.items()]
    return web.json_response(
        {"items": items, "total": len(items), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.get(ROUTE + "/img/{sid}")
async def hairstyle_img(request):
    item = LIB.get(request.match_info["sid"])
    if not item:
        raise web.HTTPNotFound()
    path = LIB.abs_img(item)
    if not path or not os.path.isfile(path):
        raise web.HTTPNotFound()
    return web.FileResponse(path, headers={"Cache-Control": "public, max-age=86400"})


@routes.post(ROUTE + "/add")
async def hairstyle_add(request):
    """新增发型：multipart 表单（file / gender / name_cn / prompt_zh）。"""
    try:
        form = await request.post()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "表单解析失败：%s" % e}, status=400)

    gender = str(form.get("gender") or "").strip()
    name = str(form.get("name_cn") or "").strip()
    desc = str(form.get("prompt_zh") or "").strip()
    up = form.get("file")

    if gender not in ("female", "male"):
        return web.json_response({"ok": False, "error": "性别只能是 female 或 male"}, status=400)
    if not name:
        return web.json_response({"ok": False, "error": "请填写发型名称"}, status=400)
    if len(name) > 40:
        return web.json_response({"ok": False, "error": "发型名称过长（最多 40 字）"}, status=400)
    if desc and len(desc) > 400:
        return web.json_response({"ok": False, "error": "提示词过长（最多 400 字）"}, status=400)
    if up is None or not getattr(up, "file", None):
        return web.json_response({"ok": False, "error": "请选择一张发型图片"}, status=400)

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
        return web.json_response({"ok": False, "error": "发型库读取失败：%s" % e}, status=500)

    items = doc.setdefault("items", [])
    sid = next_uid(items)
    sub = "women" if gender == "female" else "men"
    rel = "%s/%s.jpg" % (sub, sid)

    try:
        save_jpeg(img, os.path.join(ASSETS_DIR, sub, sid + ".jpg"), quality=92)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "图片写入失败：%s" % e}, status=500)

    item = {
        "id": sid,
        "gender": gender,
        "name_cn": name,
        "prompt_zh": _build_prompt(name, desc),
        "img": rel,
        "source": "user",
    }
    items.append(item)

    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入发型库失败：%s" % e}, status=500)

    ver = LIB.version()
    return web.json_response(
        {"ok": True, "item": _item_out(item, ver), "total": len(items), "version": ver},
        headers={"Cache-Control": "no-store"},
    )


@routes.post(ROUTE + "/delete")
async def hairstyle_delete(request):
    """批量删除发型：JSON {"ids": ["u01", "w03"]}。先写库，再删图片。"""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "请求格式错误"}, status=400)

    raw = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(raw, list) or not raw:
        return web.json_response({"ok": False, "error": "请提供要删除的发型 id"}, status=400)

    want = []
    for x in raw:
        s = str(x).strip()
        if s and s not in want:
            want.append(s)

    try:
        doc = LIB.read_doc()
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "发型库读取失败：%s" % e}, status=500)

    items = doc.get("items", [])
    if not items:
        return web.json_response({"ok": False, "error": "发型库是空的"}, status=400)

    keep, removed = [], []
    for it in items:
        (removed if str(it.get("id")) in want else keep).append(it)

    if not removed:
        return web.json_response({"ok": False, "error": "没有找到要删除的发型"}, status=404)

    doc["items"] = keep
    try:
        LIB.write_doc(doc)
    except Exception as e:  # noqa: BLE001
        return web.json_response({"ok": False, "error": "写入发型库失败：%s" % e}, status=500)

    # 库已更新，再清理图片文件；路径必须落在 assets 内
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


class HairStylePicker:
    """发型选择器：输出发型图 + 中文提示词"""

    CATEGORY = "人物参考/发型"
    FUNCTION = "pick"
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("发型图", "提示词")
    DESCRIPTION = "点击节点上的缩略图打开选择弹窗（女生 / 男生），输出发型图与中文提示词。"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "hairstyle_id": ("STRING", {"default": "w01"}),
                "size": ("INT", {"default": 640, "min": 128, "max": 2048, "step": 32,
                                 "display": "number"}),
                "random": ("BOOLEAN", {"default": False}),
            }
        }

    @classmethod
    def IS_CHANGED(cls, hairstyle_id, size, random, **kw):
        return float(time.time()) if random else ""

    def pick(self, hairstyle_id, size=640, random=False):
        items = LIB.items()
        if not items:
            arr = np.zeros((size, size, 3), dtype=np.float32)
            return (torch.from_numpy(arr)[None, ], "")

        item = _random.choice(items) if random else (LIB.get(hairstyle_id) or items[0])

        path = LIB.abs_img(item)
        if not path or not os.path.isfile(path):
            img = Image.new("RGB", (size, size), (32, 32, 32))
        else:
            img = Image.open(path).convert("RGB")
            if img.size != (size, size):
                img = img.resize((size, size), Image.LANCZOS)

        arr = np.asarray(img).astype(np.float32) / 255.0
        return (torch.from_numpy(arr)[None, ], item.get("prompt_zh", ""))


NODE_CLASS_MAPPINGS = {"HairStylePicker": HairStylePicker}
NODE_DISPLAY_NAME_MAPPINGS = {"HairStylePicker": "发型选择器"}
