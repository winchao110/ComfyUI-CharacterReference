# -*- coding: utf-8 -*-
"""人物参考 · ComfyUI 自定义节点包（Character Reference）

包含四个节点：

- 发型选择器 HairStylePicker
    女生 / 男生发型库，点击缩略图弹出选择面板，输出「发型图 + 中文提示词」
- 服装选择器 GarmentPicker
    春装/夏装/秋装/冬装/内衣/派对/泳装/性感 8 个分类 × 女装/男装，
    库内图片统一 800×1200，输出「服装图 + 中文提示词」
- 人脸选择器 FacePicker
    女性 / 男性真实中国人脸，图片统一 768×768，文件名即「脸型，五官特征，气质」，
    输出「人脸图 + 中文提示词」
- 其他素材管理节点 OtherAssetsManager
    库初始为空，用户自己加图 / 删图，只填图 + 提示词（选填）；
    原图不压缩，也可等比压缩到指定百万像素；输出「素材图 + 提示词」

目录说明：
    assets/hairstyles.json   发型库（women/ men/ 为图，640×640）
    assets/garments.json     服装库（garments/<分类>/ 为图，800×1200）
    assets/faces.json        人脸库（faces/ 为图，768×768）
    assets/others.json       其他素材库（others/ 为图，尺寸不限，初始为空）
    web/hairstyle.js         发型节点前端（节点缩略图 + 选择面板）
    web/garment.js           服装节点前端
    web/face.js              人脸节点前端
    web/other.js             其他素材节点前端
    tools/                   重建图库的脚本

本机 ComfyUI 用 governance 加载器按文件加载节点包，节点目录不是 Python 包，
所以子模块用「显式按路径加载」而不是相对导入。
"""
import importlib.util
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))


def _load(filename, mod_name):
    """按文件路径加载兄弟模块，并登记进 sys.modules（供子模块互相 import）。"""
    if mod_name in sys.modules:
        return sys.modules[mod_name]
    path = os.path.join(_HERE, filename)
    spec = importlib.util.spec_from_file_location(mod_name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = mod
    try:
        spec.loader.exec_module(mod)
    except Exception:
        sys.modules.pop(mod_name, None)
        raise
    return mod


_common = _load("cr_common.py", "cr_common")
_hair = _load("cr_hair.py", "cr_hair")
_garment = _load("cr_garment.py", "cr_garment")
_face = _load("cr_face.py", "cr_face")
_other = _load("cr_other.py", "cr_other")

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

for _m in (_hair, _garment, _face, _other):
    NODE_CLASS_MAPPINGS.update(_m.NODE_CLASS_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(_m.NODE_DISPLAY_NAME_MAPPINGS)

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
