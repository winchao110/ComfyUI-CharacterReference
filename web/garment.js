import { app } from "../../scripts/app.js";

/* ============================================================
   服装选择器 · 前端
   节点上显示当前服装缩略图，点击弹出选择面板
   （8 个分类：春/夏/秋/冬/内衣/派对/泳装/性感 × 女装/男装 + 搜索）
   卡片 = 图（2:3）+ 下方的中文提示词
   ============================================================ */

const API = "/garment_picker";
const NODE_NAME = "GarmentPicker";
const PAGE = 120; // 每屏渲染的卡片数（库里有 1400+ 条，滚动增量渲染）

let DATA = null; // [{...}]
let CATS = [];
let LOADING = null;

function loadData(force) {
  if (force) {
    DATA = null;
    LOADING = null;
  }
  if (DATA) return Promise.resolve(DATA);
  if (LOADING) return LOADING;
  LOADING = fetch(API + "/list")
    .then((r) => r.json())
    .then((j) => {
      DATA = j.items || [];
      CATS = j.cats || [];
      return DATA;
    })
    .catch((e) => {
      console.error("[服装选择器] 服装库加载失败", e);
      DATA = [];
      return DATA;
    });
  return LOADING;
}

const CSS = `
.gsp-node{display:flex;flex-direction:column;gap:6px;width:100%;height:100%;box-sizing:border-box;padding:2px}
.gsp-thumb{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;
  background:rgba(0,0,0,.25);cursor:pointer;border:1px solid rgba(255,255,255,.12)}
.gsp-thumb img{width:100%;height:100%;object-fit:contain;display:block;background:#101010}
.gsp-thumb:hover{border-color:#4a9eff}
.gsp-thumb .gsp-mask{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:13px;letter-spacing:2px;opacity:0;transition:.15s}
.gsp-thumb:hover .gsp-mask{opacity:1}
.gsp-tag{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:12px;color:#fff;
  background:linear-gradient(transparent,rgba(0,0,0,.78));white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.gsp-actions{display:flex;gap:6px}
.gsp-btn{flex:1;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:12px;cursor:pointer;transition:.15s}
.gsp-btn:hover{background:rgba(255,255,255,.16)}
.gsp-btn.primary{background:#2f76d2;border-color:#2f76d2;color:#fff}
.gsp-btn.primary:hover{background:#3a8be8}

/* ---------- 弹窗 ---------- */
.gsp-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);
  animation:gsp-fade .16s ease}
@keyframes gsp-fade{from{opacity:0}to{opacity:1}}
.gsp-panel{position:relative;width:min(1760px,96vw);height:95vh;display:flex;flex-direction:column;
  background:#1b1d22;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9e9ea;
  font-family:system-ui,"Microsoft YaHei",sans-serif}
.gsp-note{flex:none;padding:7px 18px;font-size:11.5px;line-height:1.5;text-align:center;
  color:#8e96a3;background:rgba(255,255,255,.035);border-bottom:1px solid rgba(255,255,255,.06);
  letter-spacing:.3px;user-select:none}
.gsp-head{display:flex;align-items:center;gap:10px;padding:12px 16px 8px;
  border-bottom:1px solid rgba(255,255,255,.09);flex-wrap:wrap}
.gsp-title{font-size:15px;font-weight:600;letter-spacing:1px;margin-right:2px}
.gsp-title span{font-size:12px;font-weight:400;color:#8b93a0;margin-left:8px}
.gsp-tabs{display:flex;gap:4px;background:rgba(255,255,255,.06);padding:3px;border-radius:8px}
.gsp-tabs button{border:0;background:transparent;color:#aeb6c2;font-size:13px;padding:5px 14px;
  border-radius:6px;cursor:pointer;transition:.15s}
.gsp-tabs button.on{background:#2f76d2;color:#fff}
.gsp-search{flex:1;min-width:150px;height:30px;border-radius:8px;padding:0 10px;font-size:13px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;outline:none}
.gsp-search:focus{border-color:#2f76d2}
.gsp-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:transparent;color:#c7ccd4;font-size:15px;cursor:pointer;flex:none}
.gsp-close:hover{background:rgba(255,255,255,.1)}
.gsp-add{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(74,158,255,.5);
  background:rgba(74,158,255,.12);color:#8fc2ff;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.gsp-add:hover{background:rgba(74,158,255,.26);color:#fff;border-color:#4a9eff}
.gsp-add.off{display:none}
.gsp-del{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,120,120,.45);
  background:rgba(255,90,90,.1);color:#ffa8a8;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.gsp-del:hover{background:rgba(255,90,90,.24);color:#fff;border-color:#ff6b6b}
.gsp-del.armed{background:#c0392b;border-color:#c0392b;color:#fff}
.gsp-del:disabled{opacity:.5;cursor:default}
.gsp-delcancel{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:transparent;color:#aeb6c2;font-size:13px;cursor:pointer;flex:none;display:none}
.gsp-delcancel.on{display:inline-block}
.gsp-delcancel:hover{background:rgba(255,255,255,.1);color:#fff}

/* ---------- 8 个分类 ---------- */
.gsp-cats{display:flex;flex-wrap:wrap;gap:6px;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.gsp-cats button{height:27px;padding:0 13px;border-radius:20px;font-size:12.5px;cursor:pointer;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#b7bfca;
  transition:.14s;white-space:nowrap}
.gsp-cats button:hover{background:rgba(255,255,255,.12);color:#fff}
.gsp-cats button.on{background:#2f76d2;border-color:#2f76d2;color:#fff}
.gsp-cats button i{font-style:normal;font-size:11px;opacity:.7;margin-left:4px}

/* ---------- 卡片 ---------- */
.gsp-grid{flex:1;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;gap:14px;
  padding:14px 16px;align-content:flex-start;align-items:flex-start}
.gsp-grid::-webkit-scrollbar{width:9px}
.gsp-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
.gsp-card{width:calc((100% - 70px)/6 - 1px);flex:none;box-sizing:border-box;border-radius:10px;overflow:hidden;cursor:pointer;background:#23262c;
  border:2px solid transparent;transition:transform .12s,border-color .12s;position:relative}
.gsp-card:hover{transform:translateY(-3px);border-color:rgba(74,158,255,.6)}
.gsp-card.on{border-color:#2f76d2;box-shadow:0 0 0 2px rgba(47,118,210,.35)}
.gsp-card .pic{position:relative;width:100%;padding-top:150%;overflow:hidden;background:#141414}
.gsp-card .pic img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
.gsp-card .tx{padding:8px 10px 9px;font-size:13px;line-height:1.55;color:#c9d1db;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
  min-height:60px}
.gsp-card .tx.none{color:#6d7482;font-style:italic}
.gsp-card .gd{position:absolute;top:6px;left:6px;font-size:10px;padding:1px 6px;border-radius:20px;
  background:rgba(0,0,0,.62);color:#cfd6e0;z-index:2}
.gsp-empty{width:100%;text-align:center;color:#8b93a0;padding:44px 0;font-size:13px;line-height:2}
.gsp-empty b{color:#8fc2ff;font-weight:500}

/* ---------- 删除模式 ---------- */
.gsp-card .gsp-ck{display:none;position:absolute;top:8px;right:8px;width:23px;height:23px;
  border-radius:6px;border:2px solid rgba(255,255,255,.8);background:rgba(0,0,0,.45);
  color:#fff;font-size:13px;line-height:16px;text-align:center;box-sizing:border-box;z-index:3;
  font-weight:700}
.gsp-del-mode .gsp-card .gsp-ck{display:block}
.gsp-del-mode .gsp-card:hover{transform:none;border-color:rgba(255,255,255,.22)}
.gsp-del-mode .gsp-card.on{border-color:transparent;box-shadow:none}
.gsp-card.sel{border-color:#e05a4f !important;box-shadow:0 0 0 2px rgba(224,90,79,.35) !important}
.gsp-card.sel .gsp-ck{background:#e05a4f;border-color:#e05a4f}
.gsp-card.sel .pic:after{content:"";position:absolute;inset:0;background:rgba(224,90,79,.22)}
.gsp-del-mode .gsp-foot{color:#ffa8a8}
.gsp-foot{padding:9px 16px;border-top:1px solid rgba(255,255,255,.09);font-size:12px;
  color:#8b93a0;display:flex;justify-content:space-between;gap:12px}
.gsp-foot span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ---------- 新增服装表单 ---------- */
.gsp-form-mask{position:absolute;inset:0;z-index:6;background:rgba(10,11,14,.74);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.gsp-form{width:min(720px,90%);background:#21242a;border:1px solid rgba(255,255,255,.14);
  border-radius:12px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.55);
  display:flex;flex-direction:column;color:#e9e9ea}
.fhd{padding:13px 16px;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.09)}
.fbody{display:flex;gap:16px;padding:16px}
.fpick{flex:0 0 150px;width:150px;height:225px;border-radius:10px;
  border:1px dashed rgba(255,255,255,.25);background:#1a1c21;display:flex;align-items:center;
  justify-content:center;cursor:pointer;position:relative;overflow:hidden;text-align:center}
.fpick:hover{border-color:#2f76d2}
.fpick.drag{border-color:#4a9eff;background:rgba(74,158,255,.1)}
.fpick img{width:100%;height:100%;object-fit:cover;display:none}
.fpick.has img{display:block}
.fpick.has .fhint{display:none}
.fhint{font-size:12px;color:#8b93a0;line-height:1.9;padding:0 8px}
.fhint i{font-style:normal;font-size:11px;color:#6d7482}
.fright{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.fright label{font-size:12px;color:#aeb6c2;margin-top:2px}
.fright label i{font-style:normal;color:#6d7482}
.fdesc{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);color:#e9e9ea;font-size:13px;padding:8px 10px;outline:none;
  font-family:inherit;height:104px;resize:vertical;line-height:1.5}
.fdesc:focus{border-color:#2f76d2}
.frow{display:flex;gap:6px}
.frow button{flex:1;height:30px;border-radius:7px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);color:#aeb6c2;font-size:13px;cursor:pointer;transition:.15s}
.frow button.on{background:#2f76d2;border-color:#2f76d2;color:#fff}
.fsel{width:100%;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:#1a1c21;color:#e9e9ea;font-size:13px;padding:0 8px;outline:none;font-family:inherit}
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
`;

function injectCSS() {
  if (document.getElementById("gsp-style")) return;
  const s = document.createElement("style");
  s.id = "gsp-style";
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

/** 本地图片 -> 800×1200 JPEG（居中裁剪成 2:3，先压一次省上传体积） */
function fileToBlob(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      try {
        const W = 800;
        const H = 1200;
        const iw = im.naturalWidth;
        const ih = im.naturalHeight;
        if (!iw || !ih) throw new Error("图片尺寸异常");
        const tr = W / H;
        let sw = iw;
        let sh = ih;
        if (iw / ih > tr) {
          sw = Math.round(ih * tr);
          sh = ih;
        } else {
          sw = iw;
          sh = Math.round(iw / tr);
        }
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext("2d");
        ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H);
        cv.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("图片编码失败"))),
          "image/jpeg",
          0.9
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
  return node.widgets ? node.widgets.find((w) => w.name === "garment_id") : null;
}

function shortText(it) {
  const p = (it && it.prompt_cn) || "";
  return p || "（未填提示词）";
}

function paint(node, item) {
  const img = node.__gspImg;
  const tag = node.__gspTag;
  if (!img) return;
  if (item) {
    img.src = item.url;
    img.style.visibility = "visible";
    tag.textContent = (item.cat_cn || "") + " · " + shortText(item);
  } else {
    img.removeAttribute("src");
    img.style.visibility = "hidden";
    tag.textContent = "未选择服装";
  }
}

function apply(node, item) {
  const w = getWidget(node);
  if (w) w.value = item.id;
  node.__gspItem = item;
  paint(node, item);
  app.graph.setDirtyCanvas(true, true);
}

function syncFromValue(node) {
  // 序号守卫：只让最后发起的那次同步生效。
  // 否则「节点创建时（工作流值还没恢复，读到空串）」发起的回调会在图库加载完成后
  // 把刚恢复的值改回第一款，造成「节点显示 A、实际执行 B」。
  const seq = (node.__gspSeq = (node.__gspSeq || 0) + 1);
  const w = getWidget(node);
  const id = w ? w.value : "";
  loadData().then((items) => {
    if (seq !== node.__gspSeq) return; // 已被更新的同步请求取代
    if (!items.length) {
      paint(node, null);
      return;
    }
    const cur = getWidget(node);
    if (cur && cur.value !== id) return; // 等待期间值已被改过，交给新的同步处理

    let it = items.find((x) => x.id === id);
    if (!it) {
      // 新节点，或原来选中的那款已被删除 → 落到第一款。
      // 必须同时改写值，保证「看到的」和「执行时用的」是同一件。
      it = items[0];
      if (cur) cur.value = it.id;
    }
    node.__gspItem = it;
    paint(node, it);
  });
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
    const cur = node.__gspItem;
    let gender = cur ? cur.gender : "female";
    let cat = "all";
    let keyword = "";

    const countLabel = (list) =>
      `女装 ${list.filter((x) => x.gender === "female").length} 款 · 男装 ${
        list.filter((x) => x.gender === "male").length
      } 款`;

    const catsHtml = () =>
      [`<button data-c="all">全部<i></i></button>`]
        .concat(
          CATS.map(
            (c) =>
              `<button data-c="${esc(c.key)}">${esc(c.name)}<i>${c.count || 0}</i></button>`
          )
        )
        .join("");

    const overlay = document.createElement("div");
    overlay.className = "gsp-overlay";
    overlay.innerHTML = `
      <div class="gsp-panel">
        <div class="gsp-note">素材来源于网络和用户自添加，未授权，只用于研究和学习</div>
        <div class="gsp-head">
          <div class="gsp-title">服装选择器<span>${countLabel(items)}</span></div>
          <div class="gsp-tabs">
            <button data-g="female">女装</button>
            <button data-g="male">男装</button>
          </div>
          <input class="gsp-search" placeholder="搜索服装（如：蕾丝 / 连衣裙 / 靴子）">
          <button class="gsp-add" title="上传新服装图并保存到服装库">＋ 添加服装</button>
          <button class="gsp-del" title="勾选要删除的服装">🗑 删除服装</button>
          <button class="gsp-delcancel" title="退出删除模式">取消</button>
          <button class="gsp-close" title="关闭">✕</button>
        </div>
        <div class="gsp-cats">${catsHtml()}</div>
        <div class="gsp-grid"></div>
        <div class="gsp-foot">
          <span class="gsp-tip">点击卡片即选中并写入节点</span>
          <span class="gsp-cur"></span>
        </div>
      </div>`;

    const panel = overlay.querySelector(".gsp-panel");
    const grid = overlay.querySelector(".gsp-grid");
    const search = overlay.querySelector(".gsp-search");
    const curLabel = overlay.querySelector(".gsp-cur");
    const tip = overlay.querySelector(".gsp-tip");
    const addBtn = overlay.querySelector(".gsp-add");
    const delBtn = overlay.querySelector(".gsp-del");
    const cancelBtn = overlay.querySelector(".gsp-delcancel");

    let delMode = false;
    let busy = false;
    const checked = new Set();

    let list = [];
    let shown = PAGE;

    function refreshDelBtn() {
      panel.classList.toggle("gsp-del-mode", delMode);
      addBtn.classList.toggle("off", delMode);
      cancelBtn.classList.toggle("on", delMode);
      if (!delMode) {
        delBtn.textContent = "🗑 删除服装";
        delBtn.classList.remove("armed");
        delBtn.disabled = false;
        tip.textContent = "点击卡片即选中并写入节点";
        return;
      }
      const n = checked.size;
      delBtn.textContent = n ? `删除选中 (${n})` : "删除选中";
      delBtn.classList.add("armed");
      delBtn.disabled = n === 0 || busy;
      tip.textContent = "勾选要删除的服装，可多选";
    }

    function cardHtml(it) {
      const sel = checked.has(it.id);
      const curId = (getWidget(node) || {}).value;
      const tx = it.prompt_cn
        ? `<div class="tx" title="${esc(it.prompt_cn)}">${esc(it.prompt_cn)}</div>`
        : `<div class="tx none">（未填提示词）</div>`;
      return `<div class="gsp-card${it.id === curId && !delMode ? " on" : ""}${
        sel ? " sel" : ""
      }" data-id="${esc(it.id)}">
        <div class="pic"><img loading="lazy" src="${esc(it.url)}" alt="${esc(it.name_cn)}"></div>
        <span class="gd">${esc(it.cat_cn || "")}</span>
        ${tx}
        <span class="gsp-ck">${sel ? "✓" : ""}</span>
      </div>`;
    }

    function applyFilter() {
      const kw = keyword.trim().toLowerCase();
      list = items.filter((it) => {
        if (it.gender !== gender) return false;
        if (cat !== "all" && it.cat !== cat) return false;
        if (!kw) return true;
        return (
          (it.prompt_cn || "").toLowerCase().includes(kw) ||
          (it.name_cn || "").toLowerCase().includes(kw) ||
          (it.desc_en || "").toLowerCase().includes(kw) ||
          (it.cat_cn || "").toLowerCase().includes(kw) ||
          it.id.toLowerCase().includes(kw)
        );
      });
      shown = PAGE;
    }

    function more() {
      const slice = list.slice(shown - PAGE, shown);
      grid.insertAdjacentHTML("beforeend", slice.map(cardHtml).join(""));
    }

    function fill() {
      if (!list.length) {
        const kw = keyword.trim();
        const maleTotal = items.filter((x) => x.gender === "male").length;
        const catName = (CATS.find((c) => c.key === cat) || {}).name || "";
        let hint = "没有匹配的服装";
        if (gender === "male" && maleTotal === 0 && !kw) {
          hint =
            "男装还没有服装<br>点右上角 <b>＋ 添加服装</b> 上传一张，性别选「男装」";
        } else if (cat !== "all" && !kw) {
          hint = `「${catName}」里还没有${gender === "male" ? "男装" : "女装"}，换个分类看看`;
        } else if (kw && cat !== "all") {
          hint = `「${catName}」里没搜到「${esc(kw)}」`;
        }
        grid.innerHTML = `<div class="gsp-empty">${hint}</div>`;
        curLabel.textContent = "";
        return;
      }
      grid.innerHTML = "";
      more();
      const c = items.find((x) => x.id === (getWidget(node) || {}).value);
      curLabel.textContent = c ? "当前：" + (c.cat_cn || "") + " · " + shortText(c) : "";
    }

    function render() {
      overlay.querySelector(".gsp-title span").textContent = countLabel(items);
      overlay.querySelectorAll(".gsp-tabs button").forEach((b) => {
        b.classList.toggle("on", b.dataset.g === gender);
      });
      overlay.querySelectorAll(".gsp-cats button").forEach((b) => {
        b.classList.toggle("on", b.dataset.c === cat);
      });
      // 搜索时分类计数帮助判断
      const totalChip = overlay.querySelector('.gsp-cats button[data-c="all"] i');
      if (totalChip) {
        totalChip.textContent = items.filter((x) => x.gender === gender).length;
      }
      refreshDelBtn();
      applyFilter();
      fill();
    }

    grid.addEventListener("scroll", () => {
      if (shown >= list.length) return;
      if (grid.scrollTop + grid.clientHeight > grid.scrollHeight - 500) {
        shown = Math.min(list.length, shown + PAGE);
        more();
      }
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".gsp-card");
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

    /* ---------- 删除服装 ---------- */
    async function doDelete() {
      const ids = [...checked];
      if (!ids.length || busy) return;

      const names = ids.map(
        (id) => (items.find((x) => x.id === id) || {}).name_cn || id
      );
      const preview = names.slice(0, 8).join("、") + (names.length > 8 ? " 等" : "");
      const ok = window.confirm(
        `确定删除这 ${ids.length} 款服装？\n\n${preview}\n\n图片文件会一并删除，无法撤销。`
      );
      if (!ok) return;

      busy = true;
      refreshDelBtn();
      delBtn.textContent = "正在删除…";
      try {
        const res = await fetch(API + "/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

        items = await loadData(true);
        checked.clear();
        delMode = false;

        const curW = getWidget(node);
        if (curW && ids.includes(curW.value)) {
          const fb =
            items.find((x) => x.gender === gender && (cat === "all" || x.cat === cat)) ||
            items.find((x) => x.gender === gender) ||
            items[0];
          if (fb) {
            apply(node, fb);
          } else {
            node.__gspItem = null;
            curW.value = "";
            paint(node, null);
            app.graph.setDirtyCanvas(true, true);
          }
        }
        console.log("[服装选择器] 已删除", ids.join(","), "剩余", items.length);
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

    overlay.querySelector(".gsp-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      gender = b.dataset.g;
      render();
    });

    overlay.querySelector(".gsp-cats").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      cat = b.dataset.c;
      render();
    });

    search.addEventListener("input", () => {
      keyword = search.value;
      render();
    });

    /* ---------- 新增服装 ---------- */
    function openAddForm() {
      const mask = document.createElement("div");
      mask.className = "gsp-form-mask";
      mask.innerHTML = `
        <div class="gsp-form">
          <div class="fhd">添加新服装</div>
          <div class="fbody">
            <div class="fpick">
              <img alt="预览">
              <div class="fhint">点击或拖入图片<br><i>jpg / png · 自动裁成<br>800×1200</i></div>
            </div>
            <div class="fright">
              <label>性别</label>
              <div class="frow fgender">
                <button data-g="female">女装</button>
                <button data-g="male">男装</button>
              </div>
              <label>分类</label>
              <select class="fsel fcat">
                ${CATS.map((c) => `<option value="${esc(c.key)}">${esc(c.name)}</option>`).join("")}
              </select>
              <label>提示词<i>（选填）</i></label>
              <textarea class="fdesc" maxlength="400"
                placeholder="如：服装：身穿黑色针织连衣裙，腿上穿黑色连裤袜，脚踩短靴。&#10;留空则该项只出图、提示词为空。"></textarea>
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
      const descEl = mask.querySelector(".fdesc");
      const catEl = mask.querySelector(".fcat");
      const msg = mask.querySelector(".fmsg");
      const okBtn = mask.querySelector(".fok");

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      pick.appendChild(fileInput);

      let g = gender; // 默认跟随当前性别
      let blob = null;

      const setGender = () => {
        mask.querySelectorAll(".fgender button").forEach((b) => {
          b.classList.toggle("on", b.dataset.g === g);
        });
      };
      setGender();

      if (cat !== "all") catEl.value = cat; // 默认跟随当前分类

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
        if (!blob) return say("请先选择一张服装图片");

        okBtn.disabled = true;
        say("正在保存…");
        try {
          const fd = new FormData();
          fd.append("file", blob, "garment.jpg");
          fd.append("gender", g);
          fd.append("cat", catEl.value);
          fd.append("prompt_zh", descEl.value.trim());

          const res = await fetch(API + "/add", { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

          items = await loadData(true);
          mask.remove();
          closeModal();
          apply(node, j.item);
          console.log("[服装选择器] 已新增服装", j.item.id, j.item.cat_cn);
        } catch (err) {
          say("保存失败：" + err.message);
          okBtn.disabled = false;
        }
      });

      mask.addEventListener("mousedown", (e) => {
        if (e.target === mask) mask.remove();
      });

      panel.appendChild(mask);
      setTimeout(() => pick.click(), 60);
    }

    addBtn.addEventListener("click", openAddForm);

    overlay.querySelector(".gsp-close").addEventListener("click", closeModal);
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
  name: "GarmentPicker.UI",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
      const node = this;
      injectCSS();

      // 隐藏 garment_id widget（值仍参与序列化与执行）
      const w = getWidget(node);
      if (w) {
        w.type = "hidden";
        w.computeSize = () => [0, -6];
      }

      const wrap = document.createElement("div");
      wrap.className = "gsp-node";
      wrap.innerHTML = `
        <div class="gsp-thumb">
          <img alt="服装预览">
          <div class="gsp-mask">点击选择服装</div>
          <div class="gsp-tag">未选择服装</div>
        </div>
        <div class="gsp-actions">
          <button class="gsp-btn primary">选择服装</button>
          <button class="gsp-btn">随机</button>
        </div>`;

      node.__gspImg = wrap.querySelector("img");
      node.__gspTag = wrap.querySelector(".gsp-tag");

      wrap.querySelector(".gsp-thumb").addEventListener("click", () => openPicker(node));
      wrap.querySelector(".primary").addEventListener("click", (e) => {
        e.stopPropagation();
        openPicker(node);
      });
      wrap.querySelectorAll(".gsp-btn")[1].addEventListener("click", (e) => {
        e.stopPropagation();
        loadData().then((items) => {
          if (!items.length) return;
          apply(node, items[Math.floor(Math.random() * items.length)]);
        });
      });

      const dom = node.addDOMWidget("gsp_ui", "gsp_ui", wrap, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 330,
        getMaxHeight: () => 520,
      });
      dom.element.style.width = "100%";

      const idx = node.widgets.indexOf(dom);
      if (idx > 0) {
        node.widgets.splice(idx, 1);
        node.widgets.unshift(dom);
        const sz = node.computeSize();
        node.setSize([node.size[0], sz[1]]);
      }

      if (node.size[0] < 280) node.setSize([280, node.size[1]]);
      // 延后一帧：loadGraphData 会紧接着调用 configure 恢复工作流里的值，
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
