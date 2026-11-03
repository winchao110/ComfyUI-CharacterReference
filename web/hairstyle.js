import { app } from "../../scripts/app.js";

/* ============================================================
   发型选择器 · 前端
   节点上显示当前发型缩略图，点击弹出选择面板（女生 52 款 / 男生 30 款）
   ============================================================ */

const API_LIST = "/hairstyle_picker/list";
const NODE_NAME = "HairStylePicker";

let DATA = null;
let LOADING = null;

function loadData() {
  if (DATA) return Promise.resolve(DATA);
  if (LOADING) return LOADING;
  LOADING = fetch(API_LIST)
    .then((r) => r.json())
    .then((j) => {
      DATA = j.items || [];
      return DATA;
    })
    .catch((e) => {
      console.error("[发型选择器] 发型库加载失败", e);
      DATA = [];
      return DATA;
    });
  return LOADING;
}

const CSS = `
.hsp-node{display:flex;flex-direction:column;gap:6px;width:100%;height:100%;box-sizing:border-box;padding:2px}
.hsp-thumb{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;
  background:rgba(0,0,0,.25);cursor:pointer;border:1px solid rgba(255,255,255,.12)}
.hsp-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.hsp-thumb:hover{border-color:#4a9eff}
.hsp-thumb .hsp-mask{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:13px;letter-spacing:2px;opacity:0;transition:.15s}
.hsp-thumb:hover .hsp-mask{opacity:1}
.hsp-tag{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:12px;color:#fff;
  background:linear-gradient(transparent,rgba(0,0,0,.75));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hsp-actions{display:flex;gap:6px}
.hsp-btn{flex:1;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:12px;cursor:pointer;transition:.15s}
.hsp-btn:hover{background:rgba(255,255,255,.16)}
.hsp-btn.primary{background:#2f76d2;border-color:#2f76d2;color:#fff}
.hsp-btn.primary:hover{background:#3a8be8}

/* ---------- 弹窗 ---------- */
.hsp-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);
  animation:hsp-fade .16s ease}
@keyframes hsp-fade{from{opacity:0}to{opacity:1}}
.hsp-panel{position:relative;width:min(1560px,96vw);height:95vh;display:flex;flex-direction:column;
  background:#1b1d22;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9e9ea;
  font-family:system-ui,"Microsoft YaHei",sans-serif}
.hsp-note{flex:none;padding:7px 18px;font-size:11.5px;line-height:1.5;text-align:center;
  color:#8e96a3;background:rgba(255,255,255,.035);border-bottom:1px solid rgba(255,255,255,.06);
  letter-spacing:.3px;user-select:none}
.hsp-head{display:flex;align-items:center;gap:12px;padding:14px 16px;
  border-bottom:1px solid rgba(255,255,255,.09);flex-wrap:wrap}
.hsp-title{font-size:15px;font-weight:600;letter-spacing:1px;margin-right:4px}
.hsp-title span{font-size:12px;font-weight:400;color:#8b93a0;margin-left:8px}
.hsp-tabs{display:flex;gap:4px;background:rgba(255,255,255,.06);padding:3px;border-radius:8px}
.hsp-tabs button{border:0;background:transparent;color:#aeb6c2;font-size:13px;padding:5px 14px;
  border-radius:6px;cursor:pointer;transition:.15s}
.hsp-tabs button.on{background:#2f76d2;color:#fff}
.hsp-search{flex:1;min-width:160px;height:30px;border-radius:8px;padding:0 10px;font-size:13px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;outline:none}
.hsp-search:focus{border-color:#2f76d2}
.hsp-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:transparent;color:#c7ccd4;font-size:15px;cursor:pointer}
.hsp-close:hover{background:rgba(255,255,255,.1)}
.hsp-add{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(74,158,255,.5);
  background:rgba(74,158,255,.12);color:#8fc2ff;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.hsp-add:hover{background:rgba(74,158,255,.26);color:#fff;border-color:#4a9eff}

/* ---------- 新增发型表单 ---------- */
.hsp-form-mask{position:absolute;inset:0;z-index:6;background:rgba(10,11,14,.74);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.hsp-form{width:min(700px,90%);background:#21242a;border:1px solid rgba(255,255,255,.14);
  border-radius:12px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.55);
  display:flex;flex-direction:column;color:#e9e9ea}
.fhd{padding:13px 16px;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.09)}
.fbody{display:flex;gap:16px;padding:16px}
.fpick{flex:0 0 200px;width:200px;height:200px;border-radius:10px;
  border:1px dashed rgba(255,255,255,.25);background:#1a1c21;display:flex;align-items:center;
  justify-content:center;cursor:pointer;position:relative;overflow:hidden;text-align:center}
.fpick:hover{border-color:#2f76d2}
.fpick.drag{border-color:#4a9eff;background:rgba(74,158,255,.1)}
.fpick img{width:100%;height:100%;object-fit:cover;display:none}
.fpick.has img{display:block}
.fpick.has .fhint{display:none}
.fhint{font-size:12px;color:#8b93a0;line-height:1.8;padding:0 10px}
.fhint i{font-style:normal;font-size:11px;color:#6d7482}
.fright{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.fright label{font-size:12px;color:#aeb6c2;margin-top:2px}
.fright label em{color:#ff6b6b;font-style:normal;margin-left:2px}
.fright label i{font-style:normal;color:#6d7482}
.fname,.fdesc{width:100%;box-sizing:border-box;border-radius:8px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;
  font-size:13px;padding:8px 10px;outline:none;font-family:inherit}
.fname:focus,.fdesc:focus{border-color:#2f76d2}
.fdesc{height:88px;resize:vertical;line-height:1.5}
.fgender{display:flex;gap:6px}
.fgender button{flex:1;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);color:#aeb6c2;font-size:13px;cursor:pointer;transition:.15s}
.fgender button.on{background:#2f76d2;border-color:#2f76d2;color:#fff}
.ffoot{display:flex;align-items:center;gap:10px;padding:12px 16px;
  border-top:1px solid rgba(255,255,255,.09)}
.fmsg{flex:1;font-size:12px;color:#ff8f8f;line-height:1.4}
.fmsg.ok{color:#7ddc8f}
.ffoot button{height:32px;padding:0 18px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:13px;cursor:pointer;transition:.15s}
.ffoot button:hover{background:rgba(255,255,255,.15)}
.ffoot .fok{background:#2f76d2;border-color:#2f76d2;color:#fff}
.ffoot .fok:hover{background:#3a8be8}
.ffoot .fok:disabled{opacity:.55;cursor:default}
.hsp-grid{flex:1;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;gap:14px;
  padding:16px 18px;align-content:flex-start}
.hsp-grid::-webkit-scrollbar{width:9px}
.hsp-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
.hsp-card{width:calc((100% - 70px)/6 - 1px);flex:none;box-sizing:border-box;border-radius:10px;overflow:hidden;cursor:pointer;background:#23262c;
  border:2px solid transparent;transition:transform .12s,border-color .12s;position:relative}
.hsp-card:hover{transform:translateY(-3px);border-color:rgba(74,158,255,.6)}
.hsp-card.on{border-color:#2f76d2;box-shadow:0 0 0 2px rgba(47,118,210,.35)}
.hsp-card .pic{position:relative;width:100%;padding-top:100%;overflow:hidden;background:#111}
.hsp-card .pic img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
.hsp-card .nm{padding:9px 10px;font-size:13.5px;line-height:1.4;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.hsp-card .gd{position:absolute;top:6px;left:6px;font-size:10px;padding:1px 6px;border-radius:20px;
  background:rgba(0,0,0,.6);color:#cfd6e0}
.hsp-foot{padding:9px 16px;border-top:1px solid rgba(255,255,255,.09);font-size:12px;
  color:#8b93a0;display:flex;justify-content:space-between}
.hsp-del{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,120,120,.45);
  background:rgba(255,90,90,.1);color:#ffa8a8;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.hsp-del:hover{background:rgba(255,90,90,.24);color:#fff;border-color:#ff6b6b}
.hsp-del.armed{background:#c0392b;border-color:#c0392b;color:#fff}
.hsp-del.armed:hover{background:#d9463a;border-color:#d9463a}
.hsp-del:disabled{opacity:.5;cursor:default;background:rgba(255,90,90,.1);
  border-color:rgba(255,120,120,.3);color:#b98a8a}
.hsp-delcancel{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:transparent;color:#aeb6c2;font-size:13px;cursor:pointer;flex:none;display:none}
.hsp-delcancel.on{display:inline-block}
.hsp-delcancel:hover{background:rgba(255,255,255,.1);color:#fff}
.hsp-add.off{display:none}

/* ---------- 删除模式 ---------- */
.hsp-card .hsp-ck{display:none;position:absolute;top:7px;right:7px;width:20px;height:20px;
  border-radius:6px;border:2px solid rgba(255,255,255,.8);background:rgba(0,0,0,.45);
  color:#fff;font-size:13px;line-height:16px;text-align:center;box-sizing:border-box;z-index:3;
  font-weight:700}
.hsp-del-mode .hsp-card .hsp-ck{display:block}
.hsp-del-mode .hsp-card{cursor:pointer}
.hsp-del-mode .hsp-card:hover{transform:none;border-color:rgba(255,255,255,.22)}
.hsp-del-mode .hsp-card.on{border-color:transparent;box-shadow:none}
.hsp-card.sel{border-color:#e05a4f !important;box-shadow:0 0 0 2px rgba(224,90,79,.35) !important}
.hsp-card.sel .hsp-ck{background:#e05a4f;border-color:#e05a4f}
.hsp-card.sel .pic:after{content:"";position:absolute;inset:0;background:rgba(224,90,79,.22)}
.hsp-del-mode .hsp-foot{color:#ffa8a8}
.hsp-empty{grid-column:1/-1;text-align:center;color:#8b93a0;padding:40px 0;font-size:13px}
`;

function injectCSS() {
  if (document.getElementById("hsp-style")) return;
  const s = document.createElement("style");
  s.id = "hsp-style";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ---------------- 工具 ---------------- */

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/** 本地图片 -> 640×640 方形 JPEG（中心裁剪，浏览器端先压一次，省上传体积） */
function fileToBlob(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      try {
        const s = Math.min(im.naturalWidth, im.naturalHeight);
        if (!s) throw new Error("图片尺寸异常");
        const cv = document.createElement("canvas");
        cv.width = cv.height = 640;
        const ctx = cv.getContext("2d");
        ctx.drawImage(
          im,
          (im.naturalWidth - s) / 2,
          (im.naturalHeight - s) / 2,
          s,
          s,
          0,
          0,
          640,
          640
        );
        cv.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("图片编码失败"))),
          "image/jpeg",
          0.92
        );
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取这张图片"));
    };
    im.src = url;
  });
}

/* ---------------- 节点内 UI ---------------- */

function getWidget(node) {
  return node.widgets ? node.widgets.find((w) => w.name === "hairstyle_id") : null;
}

function paint(node, item) {
  const img = node.__hspImg;
  const tag = node.__hspTag;
  if (!img) return;
  if (item) {
    img.src = item.url;
    img.style.visibility = "visible";
    tag.textContent = item.name_cn + "  ·  " + (item.gender === "male" ? "男" : "女");
  } else {
    img.removeAttribute("src");
    img.style.visibility = "hidden";
    tag.textContent = "未选择发型";
  }
}

function syncFromValue(node) {
  // 序号守卫：只让最后发起的那次同步生效（节点创建早于工作流值恢复，会读到空串）
  const seq = (node.__hspSeq = (node.__hspSeq || 0) + 1);
  const w = getWidget(node);
  const id = w ? w.value : "";
  loadData().then((items) => {
    if (seq !== node.__hspSeq) return;
    if (!items.length) {
      node.__hspItem = null;
      paint(node, null);
      return;
    }
    const cur = getWidget(node);
    if (cur && cur.value !== id) return;

    let it = items.find((x) => x.id === id);
    if (!it) {
      // 新节点 / 原选中项已删除 → 落到第一款，并同步改写值
      it = items[0];
      if (cur) cur.value = it.id;
    }
    node.__hspItem = it;
    paint(node, it);
  });
}

function apply(node, item) {
  const w = getWidget(node);
  if (w) w.value = item.id;
  node.__hspItem = item;
  paint(node, item);
  app.graph.setDirtyCanvas(true, true);
}

/* ---------------- 选择弹窗 ---------------- */

let modal = null;

function closeModal() {
  if (modal) {
    modal.remove();
    modal = null;
    document.removeEventListener("keydown", onKey);
  }
}

function onKey(e) {
  if (e.key === "Escape") closeModal();
}

function openPicker(node) {
  injectCSS();
  closeModal();
  loadData().then((initialItems) => {
    let items = initialItems;
    const cur = node.__hspItem;
    let gender = cur ? cur.gender : "female";
    let keyword = "";

    const countLabel = (list) =>
      `女生 ${list.filter((x) => x.gender === "female").length} 款 · 男生 ${
        list.filter((x) => x.gender === "male").length
      } 款`;

    const overlay = document.createElement("div");
    overlay.className = "hsp-overlay";
    overlay.innerHTML = `
      <div class="hsp-panel">
        <div class="hsp-note">素材来源于网络和用户自添加，未授权，只用于研究和学习</div>
        <div class="hsp-head">
          <div class="hsp-title">发型选择器<span>${countLabel(items)}</span></div>
          <div class="hsp-tabs">
            <button data-g="female">女生</button>
            <button data-g="male">男生</button>
          </div>
          <input class="hsp-search" placeholder="搜索发型（如：大波浪 / 寸头 / 波波头）">
          <button class="hsp-add" title="上传新发型图并保存到发型库">＋ 添加发型</button>
          <button class="hsp-del" title="勾选要删除的发型">🗑 删除发型</button>
          <button class="hsp-delcancel" title="退出删除模式">取消</button>
          <button class="hsp-close" title="关闭">✕</button>
        </div>
        <div class="hsp-grid"></div>
        <div class="hsp-foot">
          <span class="hsp-tip">点击卡片即选中并写入节点</span>
          <span class="hsp-cur"></span>
        </div>
      </div>`;

    const panel = overlay.querySelector(".hsp-panel");
    const grid = overlay.querySelector(".hsp-grid");
    const search = overlay.querySelector(".hsp-search");
    const curLabel = overlay.querySelector(".hsp-cur");
    const tip = overlay.querySelector(".hsp-tip");
    const addBtn = overlay.querySelector(".hsp-add");
    const delBtn = overlay.querySelector(".hsp-del");
    const cancelBtn = overlay.querySelector(".hsp-delcancel");

    let delMode = false;
    let busy = false;
    const checked = new Set();

    function refreshDelBtn() {
      panel.classList.toggle("hsp-del-mode", delMode);
      addBtn.classList.toggle("off", delMode);
      cancelBtn.classList.toggle("on", delMode);
      if (!delMode) {
        delBtn.textContent = "🗑 删除发型";
        delBtn.classList.remove("armed");
        delBtn.disabled = false;
        tip.textContent = "点击卡片即选中并写入节点";
        return;
      }
      const n = checked.size;
      delBtn.textContent = n ? `删除选中 (${n})` : "删除选中";
      delBtn.classList.add("armed");
      delBtn.disabled = n === 0 || busy;
      tip.textContent = "勾选要删除的发型，可多选";
    }

    function render() {
      overlay.querySelector(".hsp-title span").textContent = countLabel(items);
      overlay.querySelectorAll(".hsp-tabs button").forEach((b) => {
        b.classList.toggle("on", b.dataset.g === gender);
      });
      refreshDelBtn();
      const kw = keyword.trim().toLowerCase();
      const list = items.filter((it) => {
        if (it.gender !== gender) return false;
        if (!kw) return true;
        return (
          it.name_cn.toLowerCase().includes(kw) ||
          it.prompt_cn.toLowerCase().includes(kw) ||
          it.id.toLowerCase().includes(kw)
        );
      });
      if (!list.length) {
        grid.innerHTML = '<div class="hsp-empty">没有匹配的发型</div>';
        curLabel.textContent = "";
        return;
      }
      const curId = (getWidget(node) || {}).value;
      grid.innerHTML = list
        .map((it) => {
          const sel = checked.has(it.id);
          return `<div class="hsp-card${it.id === curId && !delMode ? " on" : ""}${
            sel ? " sel" : ""
          }" data-id="${esc(it.id)}" title="${esc(it.prompt_cn)}">
            <div class="pic"><img loading="lazy" src="${esc(it.url)}" alt="${esc(it.name_cn)}"></div>
            <span class="gd">${esc(it.id.toUpperCase())}</span>
            <div class="nm">${esc(it.name_cn)}</div>
            <span class="hsp-ck">${sel ? "✓" : ""}</span>
          </div>`;
        })
        .join("");
      const c = items.find((x) => x.id === curId);
      curLabel.textContent = c ? "当前：" + c.name_cn : "";
    }

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".hsp-card");
      if (!card) return;
      const id = card.dataset.id;
      const it = items.find((x) => x.id === id);
      if (!it) return;

      if (delMode) {
        if (checked.has(id)) checked.delete(id);
        else checked.add(id);
        render();
        return;
      }

      apply(node, it);
      closeModal();
    });

    /* ---------- 删除发型 ---------- */
    async function doDelete() {
      const ids = [...checked];
      if (!ids.length || busy) return;

      const names = ids.map((id) => (items.find((x) => x.id === id) || {}).name_cn || id);
      const preview = names.slice(0, 8).join("、") + (names.length > 8 ? " 等" : "");
      const ok = window.confirm(
        `确定删除这 ${ids.length} 款发型？\n\n${preview}\n\n图片文件会一并删除，无法撤销。`
      );
      if (!ok) return;

      busy = true;
      refreshDelBtn();
      delBtn.textContent = "正在删除…";
      try {
        const res = await fetch("/hairstyle_picker/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

        DATA = null;
        LOADING = null;
        items = await loadData();
        checked.clear();
        delMode = false;

        // 当前选中的发型被删掉时，自动回退到一个可用项
        const curW = getWidget(node);
        if (curW && ids.includes(curW.value)) {
          const fb =
            items.find((x) => x.gender === gender) ||
            items.find((x) => x.gender === "female") ||
            items[0];
          if (fb) {
            apply(node, fb);
          } else {
            node.__hspItem = null;
            curW.value = "";
            paint(node, null);
            app.graph.setDirtyCanvas(true, true);
          }
        }
        console.log("[发型选择器] 已删除", ids.join(","), "剩余", items.length);
      } catch (err) {
        window.alert("删除失败：" + err.message);
      } finally {
        busy = false;
        render();
      }
    }

    delBtn.addEventListener("click", () => {
      if (!delMode) {
        delMode = true;
        checked.clear();
        render();
        return;
      }
      doDelete();
    });

    cancelBtn.addEventListener("click", () => {
      delMode = false;
      checked.clear();
      render();
    });

    overlay.querySelector(".hsp-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      gender = b.dataset.g;
      render();
    });

    search.addEventListener("input", () => {
      keyword = search.value;
      render();
    });

    /* ---------- 新增发型 ---------- */
    function openAddForm() {
      const mask = document.createElement("div");
      mask.className = "hsp-form-mask";
      mask.innerHTML = `
        <div class="hsp-form">
          <div class="fhd">添加新发型</div>
          <div class="fbody">
            <div class="fpick">
              <img alt="预览">
              <div class="fhint">点击或拖入图片<br><i>jpg / png · 自动裁成 640 方形</i></div>
            </div>
            <div class="fright">
              <label>发型名称<em>*</em></label>
              <input class="fname" maxlength="40" placeholder="如：法式羊毛卷">
              <label>分类</label>
              <div class="fgender">
                <button data-g="female">女生</button>
                <button data-g="male">男生</button>
              </div>
              <label>提示词<i>（选填）</i></label>
              <textarea class="fdesc" maxlength="400"
                placeholder="留空只输出「发型XX。」；填写描述会自动拼成「发型XX，你的描述。」"></textarea>
            </div>
          </div>
          <div class="ffoot">
            <span class="fmsg"></span>
            <button class="fcancel">取消</button>
            <button class="fok">保存</button>
          </div>
        </div>`;

      const pick = mask.querySelector(".fpick");
      const prev = mask.querySelector(".fpick img");
      const nameEl = mask.querySelector(".fname");
      const descEl = mask.querySelector(".fdesc");
      const msg = mask.querySelector(".fmsg");
      const okBtn = mask.querySelector(".fok");

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      pick.appendChild(fileInput);

      let g = gender; // 默认跟随当前分类
      let blob = null;

      const setGender = () => {
        mask.querySelectorAll(".fgender button").forEach((b) => {
          b.classList.toggle("on", b.dataset.g === g);
        });
      };
      setGender();

      function say(text, ok) {
        msg.textContent = text || "";
        msg.classList.toggle("ok", !!ok);
      }

      async function useFile(file) {
        if (!file) return;
        if (!/^image\//.test(file.type || "")) return say("请选择图片文件");
        try {
          blob = await fileToBlob(file);
        } catch (err) {
          return say("读取图片失败：" + err.message);
        }
        prev.src = URL.createObjectURL(blob);
        pick.classList.add("has");
        say("");
      }

      pick.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => useFile(fileInput.files[0]));
      pick.addEventListener("dragenter", (e) => {
        e.preventDefault();
        pick.classList.add("drag");
      });
      pick.addEventListener("dragover", (e) => {
        e.preventDefault();
        pick.classList.add("drag");
      });
      pick.addEventListener("dragleave", (e) => {
        e.preventDefault();
        pick.classList.remove("drag");
      });
      pick.addEventListener("drop", (e) => {
        e.preventDefault();
        pick.classList.remove("drag");
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        useFile(f);
      });

      mask.querySelector(".fgender").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        g = b.dataset.g;
        setGender();
      });

      mask.querySelector(".fcancel").addEventListener("click", () => mask.remove());

      okBtn.addEventListener("click", async () => {
        const name = nameEl.value.trim();
        if (!blob) return say("请先选择一张发型图片");
        if (!name) return say("请填写发型名称");

        okBtn.disabled = true;
        say("正在保存…");
        try {
          const fd = new FormData();
          fd.append("file", blob, "hairstyle.jpg");
          fd.append("gender", g);
          fd.append("name_cn", name);
          fd.append("prompt_zh", descEl.value.trim());

          const res = await fetch("/hairstyle_picker/add", { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

          // 让缓存失效，下次打开面板能看到新卡片
          DATA = null;
          LOADING = null;

          mask.remove();
          closeModal();
          apply(node, j.item);
          console.log("[发型选择器] 已新增发型", j.item.id, j.item.name_cn);
        } catch (err) {
          say("保存失败：" + err.message);
          okBtn.disabled = false;
        }
      });

      mask.addEventListener("mousedown", (e) => {
        if (e.target === mask) mask.remove();
      });

      overlay.querySelector(".hsp-panel").appendChild(mask);
      setTimeout(() => nameEl.focus(), 30);
    }

    overlay.querySelector(".hsp-add").addEventListener("click", openAddForm);

    overlay.querySelector(".hsp-close").addEventListener("click", closeModal);
    overlay.addEventListener("mousedown", (e) => {
      // 删除模式下点背景不关闭，避免误触丢掉勾选
      if (e.target === overlay && !delMode) closeModal();
    });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(overlay);
    modal = overlay;
    render();
    setTimeout(() => search.focus(), 30);
  });
}

/* ---------------- 注册 ---------------- */

app.registerExtension({
  name: "HairStylePicker.UI",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
      const node = this;
      injectCSS();

      // 隐藏 hairstyle_id widget（值仍参与序列化与执行）
      const w = getWidget(node);
      if (w) {
        w.type = "hidden";
        w.computeSize = () => [0, -6];
      }

      const wrap = document.createElement("div");
      wrap.className = "hsp-node";
      wrap.innerHTML = `
        <div class="hsp-thumb">
          <img alt="发型预览">
          <div class="hsp-mask">点击选择发型</div>
          <div class="hsp-tag">未选择发型</div>
        </div>
        <div class="hsp-actions">
          <button class="hsp-btn primary">选择发型</button>
          <button class="hsp-btn">随机</button>
        </div>`;

      node.__hspImg = wrap.querySelector("img");
      node.__hspTag = wrap.querySelector(".hsp-tag");

      wrap.querySelector(".hsp-thumb").addEventListener("click", () => openPicker(node));
      wrap.querySelector(".primary").addEventListener("click", (e) => {
        e.stopPropagation();
        openPicker(node);
      });
      wrap.querySelectorAll(".hsp-btn")[1].addEventListener("click", (e) => {
        e.stopPropagation();
        loadData().then((items) => {
          if (!items.length) return;
          apply(node, items[Math.floor(Math.random() * items.length)]);
        });
      });

      const dom = node.addDOMWidget("hsp_ui", "hsp_ui", wrap, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 300,
        getMaxHeight: () => 460,
      });
      dom.element.style.width = "100%";

      // 缩略图放到节点最上方，参数控件排在它下面
      const idx = node.widgets.indexOf(dom);
      if (idx > 0) {
        node.widgets.splice(idx, 1);
        node.widgets.unshift(dom);
        const sz = node.computeSize();
        node.setSize([node.size[0], sz[1]]);
      }

      if (node.size[0] < 260) node.setSize([260, node.size[1]]);
      // 延后一帧：configure 恢复工作流值发生在紧接着的同步流程里，
      // 立即同步会读到默认空值，把保存的选中项冲掉。
      requestAnimationFrame(() => syncFromValue(node));
      return r;
    };

    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
      requestAnimationFrame(() => syncFromValue(this));
      return r;
    };
  },
});
