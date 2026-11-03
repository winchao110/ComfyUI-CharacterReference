# -*- coding: utf-8 -*-
"""人物参考 · 节点包公共工具

发型库与服装库共用：json 读写（原子写）、内存缓存、版本号（刷浏览器缓存）、
统一尺寸 JPEG 导出。
"""
import hashlib
import io
import json
import os
import time

from PIL import Image, ImageOps

NODE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(NODE_DIR, "assets")


class Library:
    """一个 json 库（{items:[...]}）+ 图片目录的读写与缓存。

    - 缓存分字段保存，`version()` 不会污染 `load()` 的加载判断
    - 每次写库自动清缓存，版本号随之变化，前端拿到的图片 URL 也就变了
    """

    def __init__(self, name, filename):
        self.name = name
        self.data_file = os.path.join(ASSETS_DIR, filename)
        self._items = None
        self._by_id = None
        self._ver = None
        self._mtime = None

    # ---------- 读 ----------
    def load(self):
        """{id: item}（保持 json 顺序由 items() 给）

        文件 mtime 变了会自动重读，所以直接改 json（比如用脚本加图）
        不用重启 ComfyUI，刷新页面即可。
        """
        try:
            mtime = os.path.getmtime(self.data_file)
        except OSError:
            mtime = None
        if self._by_id is None or mtime != self._mtime:
            items = self.read_doc().get("items", [])
            self._items = items
            self._by_id = {it["id"]: it for it in items}
            self._mtime = mtime
            self._ver = None
        return self._by_id

    def items(self):
        self.load()
        return self._items

    def get(self, sid):
        return self.load().get(sid)

    def read_doc(self):
        with open(self.data_file, "r", encoding="utf-8") as f:
            return json.load(f)

    # ---------- 写 ----------
    def write_doc(self, doc):
        tmp = self.data_file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=1)
        os.replace(tmp, self.data_file)
        self.invalidate()

    def invalidate(self):
        self._items = None
        self._by_id = None
        self._ver = None
        self._mtime = None

    # ---------- 版本号 ----------
    def version(self):
        """json 内容 + 条目数 + mtime：换库/增删后自动变化，用于 ?v= 打缓存。"""
        self.load()  # 先检测外部改动（文件变了会连带清掉 _ver）
        if self._ver is None:
            h = hashlib.md5()
            try:
                with open(self.data_file, "rb") as f:
                    h.update(f.read())
                h.update(str(len(self.items())).encode())
                h.update(str(os.path.getmtime(self.data_file)).encode())
            except OSError:
                h.update(str(time.time()).encode())
            self._ver = h.hexdigest()[:10]
        return self._ver

    # ---------- 路径 ----------
    def abs_img(self, item):
        rel = str(item.get("img") or "").replace("/", os.sep)
        return os.path.join(ASSETS_DIR, rel) if rel else ""

    def inside_assets(self, path):
        base = os.path.realpath(ASSETS_DIR)
        return os.path.realpath(path).startswith(base + os.sep)


def next_uid(items, prefix="u"):
    """用户自建条目 id：u01、u02…（全局唯一，避免和 w/m/g 编号冲突）"""
    n = 0
    for it in items:
        sid = str(it.get("id", ""))
        if sid.startswith(prefix) and sid[len(prefix):].isdigit():
            n = max(n, int(sid[len(prefix):]))
    return "%s%02d" % (prefix, n + 1)


def open_image(raw):
    """字节流 -> RGB 图（自动纠正 EXIF 方向）"""
    im = Image.open(io.BytesIO(raw))
    return ImageOps.exif_transpose(im).convert("RGB")


def fit_image(im, size):
    """中心裁剪到目标比例，再缩放到确切尺寸（不拉伸变形）。"""
    tw, th = size
    w, h = im.size
    tr = tw / float(th)
    if w / float(h) > tr:                      # 太宽 -> 左右裁
        nw = max(1, int(round(h * tr)))
        left = (w - nw) // 2
        im = im.crop((left, 0, left + nw, h))
    else:                                      # 太高 -> 上下裁
        nh = max(1, int(round(w / tr)))
        top = (h - nh) // 2
        im = im.crop((0, top, w, top + nh))
    if im.size != (tw, th):
        im = im.resize((tw, th), Image.LANCZOS)
    return im


def save_jpeg(im, path, quality=88):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "JPEG", quality=quality, optimize=True, subsampling=0)


def prepare_upload(raw, size, quality=88):
    """上传图 -> 统一尺寸 JPEG 的 PIL 图；失败抛异常由调用方转 400。"""
    return fit_image(open_image(raw), size)


def human_bytes(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return "%.1f%s" % (n, unit) if unit != "B" else "%d B" % n
        n /= 1024.0
