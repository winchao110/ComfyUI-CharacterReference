# -*- coding: utf-8 -*-
"""从两个图片目录 + 提示词表，重建发型库。

用法（在节点根目录执行）：
    python tools/build_library.py

数据来源（可用参数覆盖）：
    女：C:/Users/Administrator/Downloads/50款发型参考图_640
    男：C:/Users/Administrator/Downloads/男性发型参考图_640
    提示词表：C:/Users/Administrator/Desktop/发型名对应提示词.txt

产出：
    assets/women/*.jpg      （按编号重命名，w01.. 对应 01..）
    assets/men/*.jpg        （按编号重命名，m01.. 对应 01..）
    assets/hairstyles.json  （id / gender / name_cn / prompt_zh）
"""
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

DEF_WOMEN = r"C:\Users\Administrator\Downloads\50款发型参考图_640"
DEF_MEN = r"C:\Users\Administrator\Downloads\男性发型参考图_640"
DEF_TXT = r"C:\Users\Administrator\Desktop\发型名对应提示词.txt"

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")


def norm(s):
    """归一化名称：去掉全部空白与首尾标点，便于跨源匹配。"""
    s = re.sub(r"\s+", "", s)
    return s.strip("。．.·、,，")


def parse_prompts(path):
    """解析提示词表 -> {'female': [(no, name, desc)], 'male': [...]}"""
    out = {"female": [], "male": []}
    section = None
    with open(path, "r", encoding="utf-8-sig") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            if line.startswith("女性") or line.startswith("女"):
                section = "female"
                if "：" not in line and ":" not in line and len(line) <= 4:
                    continue
            if line.startswith("男性") or line.startswith("男"):
                section = "male"
                if "：" not in line and ":" not in line and len(line) <= 4:
                    continue
            if section is None:
                continue
            m = re.match(r"^\s*(\d+)\s*[\.、]?\s*(.+?)\s*[：:]\s*(.+?)\s*$", line)
            if not m:
                continue
            out[section].append((int(m.group(1)), m.group(2).strip(), m.group(3).strip()))
    return out


def scan_dir(path):
    """目录里的图片 -> [(编号, 名称, 完整路径)]，按编号排序。"""
    rows = []
    for f in os.listdir(path):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in IMG_EXT:
            continue
        m = re.match(r"^(\d+)\s*(.*)$", stem)
        if m:
            rows.append((int(m.group(1)), (m.group(2) or stem).strip(), os.path.join(path, f)))
        else:
            rows.append((9999, stem.strip(), os.path.join(path, f)))
    rows.sort(key=lambda x: (x[0], x[1]))
    return rows


def clean_prompt_name(name):
    """提示词里用的名称：去掉英文括注，压掉多余空格。"""
    s = re.sub(r"[（(][^）)]*[A-Za-z][^）)]*[）)]", "", name)
    s = re.sub(r"\s*或\s*", "或", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build(gender, prefix, src, prompts):
    rows = scan_dir(src)
    by_name = {norm(n): d for _, n, d in prompts}
    seq = list(prompts)  # 兜底：按顺序对齐

    out_dir = os.path.join(ASSETS, "women" if gender == "female" else "men")
    os.makedirs(out_dir, exist_ok=True)

    items, miss = [], []
    for idx, (no, name, path) in enumerate(rows):
        desc = by_name.get(norm(name))
        if not desc:
            desc = seq[idx][2] if idx < len(seq) else ""
            miss.append(f"{name}（按顺序取第 {idx + 1} 条）")
        sid = "%s%02d" % (prefix, idx + 1)
        dst = os.path.join(out_dir, sid + os.path.splitext(path)[1].lower())
        if os.path.abspath(path) != os.path.abspath(dst):
            shutil.copy2(path, dst)
        pname = clean_prompt_name(name)
        items.append({
            "id": sid,
            "gender": gender,
            "name_cn": name,
            "prompt_zh": "发型%s，%s。" % (pname, desc.rstrip("。.")),
            "img": ("women" if gender == "female" else "men") + "/" + os.path.basename(dst),
        })
    return items, miss


def main():
    a = sys.argv[1:]
    women_dir = a[0] if len(a) > 0 else DEF_WOMEN
    men_dir = a[1] if len(a) > 1 else DEF_MEN
    txt = a[2] if len(a) > 2 else DEF_TXT

    for p in (women_dir, men_dir, txt):
        if not os.path.exists(p):
            raise SystemExit("路径不存在：" + p)

    prompts = parse_prompts(txt)
    print("提示词表：女 %d 条 / 男 %d 条" % (len(prompts["female"]), len(prompts["male"])))

    # 先保住用户在面板里手动添加的发型（source=user），重建不能把它们冲掉
    keep = []
    old_json = os.path.join(ASSETS, "hairstyles.json")
    if os.path.isfile(old_json):
        try:
            with open(old_json, "r", encoding="utf-8") as f:
                old = json.load(f)
            for it in old.get("items", []):
                if it.get("source") != "user":
                    continue
                p = os.path.join(ASSETS, str(it.get("img", "")).replace("/", os.sep))
                if os.path.isfile(p):
                    with open(p, "rb") as f:
                        keep.append((it, f.read()))
        except Exception as e:  # noqa: BLE001
            print("读取旧库失败（跳过保留用户新增）：", e)

    # 清空旧库
    for sub in ("women", "men"):
        d = os.path.join(ASSETS, sub)
        if os.path.isdir(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)

    w, wm = build("female", "w", women_dir, prompts["female"])
    m, mm = build("male", "m", men_dir, prompts["male"])
    items = w + m

    # 回填用户新增（id 能沿用就沿用，避免已有工作流里的选择失效）
    used = {it["id"] for it in items}
    for old_it, blob in keep:
        sid = str(old_it.get("id") or "")
        if not sid or sid in used:
            n = 1
            while ("u%02d" % n) in used:
                n += 1
            sid = "u%02d" % n
        used.add(sid)
        sub = "women" if old_it.get("gender") == "female" else "men"
        it = dict(old_it)
        it["id"] = sid
        it["img"] = sub + "/" + sid + ".jpg"
        with open(os.path.join(ASSETS, sub, sid + ".jpg"), "wb") as f:
            f.write(blob)
        items.append(it)

    with open(os.path.join(ASSETS, "hairstyles.json"), "w", encoding="utf-8") as f:
        json.dump({"version": 2, "items": items}, f, ensure_ascii=False, indent=1)

    print("女 %d 款 / 男 %d 款，共 %d 款" % (len(w), len(m), len(items)))
    if wm:
        print("女 - 名称未精确匹配（已按顺序兜底）：", "；".join(wm))
    if mm:
        print("男 - 名称未精确匹配（已按顺序兜底）：", "；".join(mm))
    print("示例：", items[0]["prompt_zh"])


if __name__ == "__main__":
    main()
