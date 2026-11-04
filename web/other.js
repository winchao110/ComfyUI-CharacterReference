import { app } from "../../scripts/app.js";

/* ============================================================
   其他素材管理节点 · 前端
   节点上显示当前素材缩略图，点击弹出素材库面板
   只加图 + 提示词（选填），原图不压缩，也可等比压缩到 N 百万像素
   ============================================================ */

const API_LIST = "/other_picker/list";
const API_ADD = "/other_picker/add";
const API_DEL = "/other_picker/delete";
const API_UPD = "/other_picker/update";
const NODE_NAME = "OtherAssetsManager";

let DATA = null;
let LOADING = null;

function resetCache() {
  DATA = null;
  LOADING = null;
}

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
      console.error("[其他素材] 素材库加载失败", e);
      DATA = [];
      return DATA;
    })
    .finally(() => {
      LOADING = null;
    });
  return LOADING;
}

const CSS = `
.osp-node{display:flex;flex-direction:column;gap:6px;width:100%;height:100%;box-sizing:border-box;padding:2px}
.osp-thumb{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;
  background:rgba(0,0,0,.28);cursor:pointer;border:1px solid rgba(255,255,255,.12)}
.osp-thumb img{width:100%;height:100%;object-fit:contain;display:block}
.osp-thumb:hover{border-color:#4a9eff}
.osp-thumb .osp-mask{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:13px;letter-spacing:2px;opacity:0;transition:.15s}
.osp-thumb:hover .osp-mask{opacity:1}
.osp-tag{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:12px;color:#fff;
  background:linear-gradient(transparent,rgba(0,0,0,.75));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.osp-actions{display:flex;gap:6px}
.osp-btn{flex:1;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:12px;cursor:pointer;transition:.15s}
.osp-btn:hover{background:rgba(255,255,255,.16)}
.osp-btn.primary{background:#2f76d2;border-color:#2f76d2;color:#fff}
.osp-btn.primary:hover{background:#3a8be8}

/* ---------- 弹窗 ---------- */
.osp-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);
  animation:osp-fade .16s ease}
@keyframes osp-fade{from{opacity:0}to{opacity:1}}
.osp-panel{position:relative;width:min(1560px,96vw);height:95vh;display:flex;flex-direction:column;
  background:#1b1d22;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9e9ea;
  font-family:system-ui,"Microsoft YaHei",sans-serif}
.osp-head{display:flex;align-items:center;gap:12px;padding:14px 16px;
  border-bottom:1px solid rgba(255,255,255,.09);flex-wrap:wrap}
.osp-title{font-size:15px;font-weight:600;letter-spacing:1px;margin-right:4px}
.osp-title span{font-size:12px;font-weight:400;color:#8b93a0;margin-left:8px}
.osp-search{flex:1;min-width:160px;height:30px;border-radius:8px;padding:0 10px;font-size:13px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;outline:none}
.osp-search:focus{border-color:#2f76d2}
.osp-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:transparent;color:#c7ccd4;font-size:15px;cursor:pointer}
.osp-close:hover{background:rgba(255,255,255,.1)}
.osp-add{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(74,158,255,.5);
  background:rgba(74,158,255,.12);color:#8fc2ff;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.osp-add:hover{background:rgba(74,158,255,.26);color:#fff;border-color:#4a9eff}
.osp-add.off{display:none}

/* ---------- 类别筛选条 ---------- */
.osp-cats{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:11px 16px 2px;flex:none}
.osp-cats.off{display:none}
.osp-cats .clab{font-size:12px;color:#6d7482;margin-right:2px;flex:none}
.chip{height:26px;padding:0 11px;border-radius:14px;border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.05);color:#c3cad4;font-size:12.5px;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;transition:.15s;white-space:nowrap;
  font-family:inherit;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.chip:hover{background:rgba(255,255,255,.14);color:#fff}
.chip.on{background:rgba(74,158,255,.18);border-color:rgba(74,158,255,.72);color:#bfe0ff}
.chip i{font-style:normal;font-size:11px;color:#7f8794;flex:none}
.chip.on i{color:#8fc2ff}

/* ---------- 新增素材表单 ---------- */
.osp-form-mask{position:absolute;inset:0;z-index:6;background:rgba(10,11,14,.74);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.osp-form{width:min(860px,92%);max-height:88%;background:#21242a;border:1px solid rgba(255,255,255,.14);
  border-radius:12px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.55);
  display:flex;flex-direction:column;color:#e9e9ea}
.ohd{padding:13px 16px;font-size:14px;font-weight:600;border-bottom:1px solid rgba(255,255,255,.09);
  display:flex;align-items:center;gap:8px}
.ohd i{font-style:normal;font-size:12px;font-weight:400;color:#8b93a0}
.obody{padding:14px 16px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.obody::-webkit-scrollbar{width:9px}
.obody::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
.opick{height:96px;border-radius:10px;border:1px dashed rgba(255,255,255,.25);background:#1a1c21;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  cursor:pointer;text-align:center;font-size:12.5px;color:#9aa3af;transition:.15s}
.opick:hover,.opick.drag{border-color:#4a9eff;background:rgba(74,158,255,.1);color:#cfe3ff}
.opick b{font-weight:600;color:#8fc2ff}
.opick i{font-style:normal;font-size:11px;color:#6d7482}
.orow{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:10px;
  background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
.orow .rpic{flex:0 0 84px;width:84px;height:84px;border-radius:8px;overflow:hidden;background:#111;
  display:flex;align-items:center;justify-content:center}
.orow .rpic img{width:100%;height:100%;object-fit:contain;display:block}
.orow .rmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.orow .rname{font-size:12px;color:#8b93a0;display:flex;gap:8px;align-items:center}
.orow .rname b{font-weight:400;color:#cfd6e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.orow .rname em{font-style:normal;color:#6d7482;flex:none}
.orow .rprompt,.osp-form .rprompt{width:100%;box-sizing:border-box;border-radius:7px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;
  font-size:12.5px;padding:7px 9px;outline:none;font-family:inherit;resize:vertical;
  min-height:56px;line-height:1.5}
.orow .rprompt:focus,.osp-form .rprompt:focus{border-color:#2f76d2}
.orow .rdel{flex:none;width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.14);
  background:transparent;color:#9aa3af;font-size:13px;cursor:pointer;line-height:1}
.orow .rdel:hover{background:rgba(255,90,90,.18);color:#ffa8a8;border-color:rgba(255,120,120,.4)}

/* ---------- 类别输入（添加 / 编辑共用） ---------- */
.ocatbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.ocatbar .clab{font-size:12.5px;color:#aeb6c2;flex:none}
.ocatbar input{width:190px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);color:#e9e9ea;font-size:12.5px;padding:0 9px;outline:none;
  font-family:inherit}
.ocatbar input:focus{border-color:#2f76d2}
.ocatbar .chint{font-size:11.5px;color:#6d7482;flex:1;min-width:120px}
.ochips{display:flex;flex-wrap:wrap;gap:7px}
.ochips .chip{height:24px;font-size:12px;padding:0 10px}
.ochips:empty{display:none}
.oedit .obody{padding:14px 16px 4px}
.oedit textarea.rprompt{min-height:92px}
.ompbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;
  border-top:1px solid rgba(255,255,255,.09);font-size:12.5px;color:#aeb6c2}
.ompbar input{width:96px;height:28px;border-radius:7px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.05);color:#e9e9ea;font-size:12.5px;padding:0 8px;outline:none;
  font-family:inherit}
.ompbar input:focus{border-color:#2f76d2}
.ompbar input.bad{border-color:#e05a4f}
.ompbar i{font-style:normal;color:#6d7482;font-size:11.5px}
.ompbar .ohint{flex:1;text-align:right;color:#6d7482;font-size:11.5px}
.ofoot{display:flex;align-items:center;gap:10px;padding:12px 16px;
  border-top:1px solid rgba(255,255,255,.09)}
.omsg{flex:1;font-size:12px;color:#ff8f8f;line-height:1.4}
.omsg.ok{color:#7ddc8f}
.ofoot button{height:32px;padding:0 18px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:13px;cursor:pointer;transition:.15s}
.ofoot button:hover{background:rgba(255,255,255,.15)}
.ofoot .ook{background:#2f76d2;border-color:#2f76d2;color:#fff}
.ofoot .ook:hover{background:#3a8be8}
.ofoot .ook:disabled{opacity:.55;cursor:default}

/* ---------- 卡片网格 ---------- */
.osp-grid{flex:1;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;gap:14px;
  padding:16px 18px;align-content:flex-start}
.osp-grid::-webkit-scrollbar{width:9px}
.osp-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
.osp-card{width:calc((100% - 70px)/6 - 1px);flex:none;box-sizing:border-box;border-radius:10px;
  overflow:hidden;cursor:pointer;background:#23262c;border:2px solid transparent;
  transition:transform .12s,border-color .12s;position:relative}
.osp-card:hover{transform:translateY(-3px);border-color:rgba(74,158,255,.6)}
.osp-card.on{border-color:#2f76d2;box-shadow:0 0 0 2px rgba(47,118,210,.35)}
.osp-card .pic{position:relative;width:100%;padding-top:100%;overflow:hidden;
  background:#141518;background-image:linear-gradient(45deg,#1a1b1f 25%,transparent 25%),
  linear-gradient(-45deg,#1a1b1f 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1b1f 75%),
  linear-gradient(-45deg,transparent 75%,#1a1b1f 75%);background-size:16px 16px;
  background-position:0 0,0 8px,8px -8px,-8px 0}
.osp-card .pic img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;display:block}
.osp-card .nm{padding:8px 9px;font-size:12.5px;line-height:1.38;color:#d8dde4;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  min-height:35px;box-sizing:border-box}
.osp-card .nm.empty{color:#7c8492;font-style:italic}
.osp-card .dim{position:absolute;top:6px;left:6px;font-size:10px;padding:1px 6px;border-radius:20px;
  background:rgba(0,0,0,.62);color:#cfd6e0;z-index:2}
.osp-card .ctag{position:absolute;left:6px;bottom:6px;z-index:2;max-width:calc(100% - 12px);
  box-sizing:border-box;font-size:10.5px;padding:1px 7px;border-radius:20px;
  background:rgba(47,118,210,.82);color:#eaf3ff;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis}
.osp-card .ctag.none{background:rgba(0,0,0,.55);color:#b6bdc8}
.osp-card .edit{position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:6px;
  border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.55);color:#dbe3ee;
  font-size:12px;line-height:1;cursor:pointer;z-index:2;opacity:0;transition:.15s}
.osp-card:hover .edit{opacity:1}
.osp-card .edit:hover{background:#2f76d2;border-color:#2f76d2;color:#fff}
.osp-foot{padding:9px 16px;border-top:1px solid rgba(255,255,255,.09);font-size:12px;
  color:#8b93a0;display:flex;justify-content:space-between;gap:16px}
.osp-foot .osp-tip{flex:none}
.osp-foot .osp-cur{flex:1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.osp-del{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,120,120,.45);
  background:rgba(255,90,90,.1);color:#ffa8a8;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.osp-del:hover{background:rgba(255,90,90,.24);color:#fff;border-color:#ff6b6b}
.osp-del.armed{background:#c0392b;border-color:#c0392b;color:#fff}
.osp-del.armed:hover{background:#d9463a;border-color:#d9463a}
.osp-del:disabled{opacity:.5;cursor:default;background:rgba(255,90,90,.1);
  border-color:rgba(255,120,120,.3);color:#b98a8a}
.osp-delcancel{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:transparent;color:#aeb6c2;font-size:13px;cursor:pointer;flex:none;display:none}
.osp-delcancel.on{display:inline-block}
.osp-delcancel:hover{background:rgba(255,255,255,.1);color:#fff}

/* ---------- 删除模式 ---------- */
.osp-card .osp-ck{display:none;position:absolute;top:7px;right:7px;width:20px;height:20px;
  border-radius:6px;border:2px solid rgba(255,255,255,.8);background:rgba(0,0,0,.45);
  color:#fff;font-size:13px;line-height:16px;text-align:center;box-sizing:border-box;z-index:3;
  font-weight:700}
.osp-del-mode .osp-card .osp-ck{display:block}
.osp-del-mode .osp-card .edit{display:none}
.osp-del-mode .osp-card{cursor:pointer}
.osp-del-mode .osp-card:hover{transform:none;border-color:rgba(255,255,255,.22)}
.osp-del-mode .osp-card.on{border-color:transparent;box-shadow:none}
.osp-card.sel{border-color:#e05a4f !important;box-shadow:0 0 0 2px rgba(224,90,79,.35) !important}
.osp-card.sel .osp-ck{background:#e05a4f;border-color:#e05a4f}
.osp-card.sel .pic:after{content:"";position:absolute;inset:0;background:rgba(224,90,79,.22)}
.osp-del-mode .osp-foot{color:#ffa8a8}
.osp-empty{width:100%;text-align:center;color:#8b93a0;padding:52px 0;font-size:13px;line-height:2}
.osp-empty b{display:block;font-size:14px;color:#c3cad4;margin-bottom:4px}
`;

function injectCSS() {
  if (document.getElementById("osp-style")) return;
  const s = document.createElement("style");
  s.id = "osp-style";
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

function fmtBytes(n) {
  if (!n) return "";
  if (n < 1024) return n + "B";
  if (n < 1048576) return (n / 1024).toFixed(0) + "KB";
  return (n / 1048576).toFixed(1) + "MB";
}

function label(it) {
  return it.prompt || it.name || it.id;
}

const DEFAULT_CAT = "其他";

/* 按首次出现顺序统计类别，「其他」固定排最后（与后端 _cats_of 同规则） */
function deriveCats(items) {
  const order = [];
  const cnt = Object.create(null);
  items.forEach((it) => {
    const c = String(it.cat || "").trim() || DEFAULT_CAT;
    if (!(c in cnt)) {
      cnt[c] = 0;
      order.push(c);
    }
    cnt[c] += 1;
  });
  const names = order.filter((c) => c !== DEFAULT_CAT);
  if (order.indexOf(DEFAULT_CAT) >= 0) names.push(DEFAULT_CAT);
  return names.map((c) => ({ name: c, n: cnt[c] }));
}

function catOf(it) {
  return String(it.cat || "").trim() || DEFAULT_CAT;
}

/* ---------------- 节点内 UI ---------------- */

function getWidget(node) {
  return node.widgets ? node.widgets.find((w) => w.name === "asset_id") : null;
}

function paint(node, item) {
  const img = node.__ospImg;
  const tag = node.__ospTag;
  if (!img) return;
  if (item) {
    img.src = item.url;
    img.style.visibility = "visible";
    tag.textContent = item.prompt
      ? `${catOf(item)} · ${item.prompt}`
      : `${catOf(item)} · ${item.w}×${item.h}（无提示词）`;
  } else {
    img.removeAttribute("src");
    img.style.visibility = "hidden";
    tag.textContent = "未选择素材";
  }
}

function syncFromValue(node) {
  // 序号守卫：只让最后发起的那次同步生效（节点创建早于工作流值恢复，会读到空串）
  const seq = (node.__ospSeq = (node.__ospSeq || 0) + 1);
  const w = getWidget(node);
  const id = w ? w.value : "";
  loadData().then((items) => {
    if (seq !== node.__ospSeq) return;
    if (!items.length) {
      node.__ospItem = null;
      paint(node, null);
      return;
    }
    const cur = getWidget(node);
    if (cur && cur.value !== id) return;

    let it = items.find((x) => x.id === id);
    if (!it) {
      it = items[0];
      if (cur) cur.value = it.id;
    }
    node.__ospItem = it;
    paint(node, it);
  });
}

function apply(node, item) {
  const w = getWidget(node);
  if (w) w.value = item.id;
  node.__ospItem = item;
  paint(node, item);
  app.graph.setDirtyCanvas(true, true);
}

/* ---------------- 素材面板 ---------------- */

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
    let keyword = "";
    let filterCat = "*";   // "*" = 全部

    const overlay = document.createElement("div");
    overlay.className = "osp-overlay";
    overlay.innerHTML = `
      <div class="osp-panel">
        <div class="osp-head">
          <div class="osp-title">其他素材<span></span></div>
          <input class="osp-search" placeholder="搜索提示词 / 类别 / 文件名 / 尺寸（如：1024x768）">
          <button class="osp-add" title="上传图片到素材库">＋ 添加素材</button>
          <button class="osp-del" title="勾选要删除的素材">🗑 删除素材</button>
          <button class="osp-delcancel" title="退出删除模式">取消</button>
          <button class="osp-close" title="关闭">✕</button>
        </div>
        <div class="osp-cats off"></div>
        <div class="osp-grid"></div>
        <div class="osp-foot">
          <span class="osp-tip">点击卡片即选中并写入节点</span>
          <span class="osp-cur"></span>
        </div>
      </div>`;

    const panel = overlay.querySelector(".osp-panel");
    const catsBar = overlay.querySelector(".osp-cats");
    const grid = overlay.querySelector(".osp-grid");
    const search = overlay.querySelector(".osp-search");
    const curLabel = overlay.querySelector(".osp-cur");
    const tip = overlay.querySelector(".osp-tip");
    const addBtn = overlay.querySelector(".osp-add");
    const delBtn = overlay.querySelector(".osp-del");
    const cancelBtn = overlay.querySelector(".osp-delcancel");

    let delMode = false;
    let busy = false;
    const checked = new Set();

    const countLabel = (list) => {
      const mp = list.reduce((s, x) => s + (x.w * x.h) / 1e6, 0);
      return `${list.length} 张 · 合计 ${mp.toFixed(1)} 百万像素`;
    };

    function refreshDelBtn() {
      panel.classList.toggle("osp-del-mode", delMode);
      addBtn.classList.toggle("off", delMode);
      cancelBtn.classList.toggle("on", delMode);
      if (!delMode) {
        delBtn.textContent = "🗑 删除素材";
        delBtn.classList.remove("armed");
        delBtn.disabled = false;
        tip.textContent = "点击卡片即选中并写入节点";
        return;
      }
      const n = checked.size;
      delBtn.textContent = n ? `删除选中 (${n})` : "删除选中";
      delBtn.classList.add("armed");
      delBtn.disabled = n === 0 || busy;
      tip.textContent = "勾选要删除的素材，可多选";
    }

    function renderChips() {
      const cats = deriveCats(items);
      if (!items.length) {
        catsBar.classList.add("off");
        catsBar.innerHTML = "";
        filterCat = "*";
        return;
      }
      if (filterCat !== "*" && !cats.some((c) => c.name === filterCat)) filterCat = "*";
      catsBar.classList.remove("off");
      const mk = (name, text, n, on) =>
        `<button class="chip${on ? " on" : ""}" data-cat="${esc(name)}" title="${esc(text)} ${n} 张">${esc(
          text
        )}<i>${n}</i></button>`;
      catsBar.innerHTML =
        `<span class="clab">类别</span>` +
        mk("*", "全部", items.length, filterCat === "*") +
        cats.map((c) => mk(c.name, c.name, c.n, filterCat === c.name)).join("");
    }

    function render() {
      overlay.querySelector(".osp-title span").textContent = countLabel(items);
      refreshDelBtn();
      renderChips();
      const kw = keyword.trim().toLowerCase();
      const list = items.filter((it) => {
        if (filterCat !== "*" && catOf(it) !== filterCat) return false;
        if (!kw) return true;
        const dim = `${it.w}x${it.h}`;
        return (
          (it.prompt || "").toLowerCase().includes(kw) ||
          (it.name || "").toLowerCase().includes(kw) ||
          catOf(it).toLowerCase().includes(kw) ||
          dim.includes(kw) ||
          it.id.toLowerCase().includes(kw)
        );
      });
      if (!list.length) {
        let empty;
        if (!items.length) {
          empty =
            '<div class="osp-empty"><b>素材库还是空的</b>点右上角「＋ 添加素材」上传图片，提示词和类别都可以不填</div>';
        } else if (kw) {
          empty = '<div class="osp-empty">没有匹配的素材</div>';
        } else {
          empty = `<div class="osp-empty">「${esc(filterCat)}」这个类别下没有素材</div>`;
        }
        grid.innerHTML = empty;
        curLabel.textContent = "";
        return;
      }
      const curId = (getWidget(node) || {}).value;
      grid.innerHTML = list
        .map((it) => {
          const sel = checked.has(it.id);
          return `<div class="osp-card${it.id === curId && !delMode ? " on" : ""}${
            sel ? " sel" : ""
          }" data-id="${esc(it.id)}" title="${esc(it.prompt || it.name || it.id)}">
            <div class="pic"><img loading="lazy" src="${esc(it.url)}" alt="${esc(it.id)}"></div>
            <span class="dim">${it.w}×${it.h}</span>
            <span class="ctag">${esc(catOf(it))}</span>
            <button class="edit" title="改类别 / 提示词">✎</button>
            <div class="nm${it.prompt ? "" : " empty"}">${esc(
            it.prompt || "（未填提示词）"
          )}</div>
            <span class="osp-ck">${sel ? "✓" : ""}</span>
          </div>`;
        })
        .join("");
      const c = items.find((x) => x.id === curId);
      curLabel.textContent = c
        ? `当前：${label(c)} · ${c.w}×${c.h}${c.bytes ? " · " + fmtBytes(c.bytes) : ""}`
        : "";
    }

    catsBar.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      filterCat = chip.dataset.cat || "*";
      render();
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".osp-card");
      if (!card) return;
      const id = card.dataset.id;
      const it = items.find((x) => x.id === id);
      if (!it) return;

      if (e.target.closest(".edit") && !delMode) {
        e.stopPropagation();
        openEditDialog(it);
        return;
      }

      if (delMode) {
        if (checked.has(id)) checked.delete(id);
        else checked.add(id);
        render();
        return;
      }

      apply(node, it);
      closeModal();
    });

    /* ---------- 编辑类别 / 提示词 ---------- */
    function openEditDialog(it) {
      const mask = document.createElement("div");
      mask.className = "osp-form-mask";
      const cats = deriveCats(items);
      const listId = "osp-cat-" + Date.now().toString(36);
      mask.innerHTML = `
        <div class="osp-form oedit">
          <div class="ohd">编辑素材<i>${esc(it.id)} · ${it.w}×${it.h}</i></div>
          <div class="obody">
            <div class="ocatbar">
              <span class="clab">类别</span>
              <input class="ocat" list="${listId}" maxlength="24" placeholder="留空 = ${esc(DEFAULT_CAT)}">
              <span class="chint">可选已有类别，也可以直接填一个新的</span>
            </div>
            <div class="ochips"></div>
            <datalist id="${listId}">${cats
              .map((c) => `<option value="${esc(c.name)}"></option>`)
              .join("")}</datalist>
            <textarea class="rprompt" placeholder="提示词（选填），留空即清空"></textarea>
          </div>
          <div class="ofoot">
            <span class="omsg"></span>
            <button class="ocancel">取消</button>
            <button class="ook">保存</button>
          </div>
        </div>`;

      const catEl = mask.querySelector(".ocat");
      const chipsEl = mask.querySelector(".ochips");
      const ta = mask.querySelector("textarea");
      const msg = mask.querySelector(".omsg");
      const okBtn = mask.querySelector(".ook");

      catEl.value = it.cat || "";
      ta.value = it.prompt || "";
      chipsEl.innerHTML = cats
        .map(
          (c) =>
            `<button class="chip" data-cat="${esc(c.name)}">${esc(c.name)}<i>${c.n}</i></button>`
        )
        .join("");
      chipsEl.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (b) catEl.value = b.dataset.cat || "";
      });

      const say = (t, ok) => {
        msg.textContent = t || "";
        msg.classList.toggle("ok", !!ok);
      };

      okBtn.addEventListener("click", async () => {
        okBtn.disabled = true;
        say("正在保存…", true);
        try {
          const res = await fetch(API_UPD, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: it.id,
              cat: catEl.value.trim(),
              prompt: ta.value.trim(),
            }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);
          resetCache();
          items = await loadData();
          if ((getWidget(node) || {}).value === it.id) apply(node, j.item);
          mask.remove();
          render();
        } catch (err) {
          say("保存失败：" + err.message);
          okBtn.disabled = false;
        }
      });

      mask.querySelector(".ocancel").addEventListener("click", () => mask.remove());
      mask.addEventListener("mousedown", (e) => {
        if (e.target === mask) mask.remove();
      });
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) okBtn.click();
      });

      panel.appendChild(mask);
      setTimeout(() => {
        catEl.focus();
        catEl.select();
      }, 20);
    }

    /* ---------- 删除素材 ---------- */
    async function doDelete() {
      const ids = [...checked];
      if (!ids.length || busy) return;

      const names = ids.map((id) => label(items.find((x) => x.id === id) || { id }));
      const preview = names.slice(0, 6).join("、") + (names.length > 6 ? " 等" : "");
      const ok = window.confirm(
        `确定删除这 ${ids.length} 个素材？\n\n${preview}\n\n图片文件会一并删除，无法撤销。`
      );
      if (!ok) return;

      busy = true;
      refreshDelBtn();
      delBtn.textContent = "正在删除…";
      try {
        const res = await fetch(API_DEL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

        resetCache();
        items = await loadData();
        checked.clear();
        delMode = false;

        const curW = getWidget(node);
        if (curW && ids.includes(curW.value)) {
          if (items[0]) {
            apply(node, items[0]);
          } else {
            node.__ospItem = null;
            curW.value = "";
            paint(node, null);
            app.graph.setDirtyCanvas(true, true);
          }
        }
        console.log("[其他素材] 已删除", ids.join(","), "剩余", items.length);
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

    search.addEventListener("input", () => {
      keyword = search.value;
      render();
    });

    /* ---------- 新增素材 ---------- */
    function openAddForm() {
      const cats = deriveCats(items);
      const listId = "osp-add-" + Date.now().toString(36);
      const mask = document.createElement("div");
      mask.className = "osp-form-mask";
      mask.innerHTML = `
        <div class="osp-form">
          <div class="ohd">添加素材<i>图片必选，类别与提示词都可以不填</i></div>
          <div class="obody">
            <div class="opick">
              <div><b>＋</b> 点击选择图片，或把图片拖到这里</div>
              <i>可一次多选 · 支持 jpg / png / webp / bmp · 尺寸不限</i>
            </div>
            <div class="ocatbar">
              <span class="clab">类别</span>
              <input class="ocat" list="${listId}" maxlength="24" placeholder="留空 = ${esc(DEFAULT_CAT)}">
              <span class="chint">可选已有类别，也可以直接填一个新的；本次添加的图都用这个类别</span>
            </div>
            <div class="ochips">${cats
              .map(
                (c) =>
                  `<button class="chip" data-cat="${esc(c.name)}">${esc(c.name)}<i>${c.n}</i></button>`
              )
              .join("")}</div>
            <datalist id="${listId}">${cats
              .map((c) => `<option value="${esc(c.name)}"></option>`)
              .join("")}</datalist>
            <div class="olist"></div>
          </div>
          <div class="ompbar">
            <span>压缩到</span>
            <input class="omp" type="text" inputmode="decimal" placeholder="留空">
            <span>百万像素</span>
            <i>留空 = 原图不压缩（尺寸、字节都不动）；填 2 就是等比缩到 2MP</i>
            <span class="ohint"></span>
          </div>
          <div class="ofoot">
            <span class="omsg"></span>
            <button class="ocancel">取消</button>
            <button class="ook">保存</button>
          </div>
        </div>`;

      const pick = mask.querySelector(".opick");
      const listEl = mask.querySelector(".olist");
      const catEl = mask.querySelector(".ocat");
      const chipsEl = mask.querySelector(".ochips");
      const mpEl = mask.querySelector(".omp");
      const hint = mask.querySelector(".ohint");
      const msg = mask.querySelector(".omsg");
      const okBtn = mask.querySelector(".ook");
      const rows = [];   // { file, url, el, ta }

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.multiple = true;
      fileInput.style.display = "none";
      pick.appendChild(fileInput);

      function say(text, ok) {
        msg.textContent = text || "";
        msg.classList.toggle("ok", !!ok);
      }

      function refreshHint() {
        const n = rows.length;
        okBtn.disabled = !n;
        hint.textContent = n ? `已选 ${n} 张` : "";
      }

      function addRow(file) {
        if (!file) return;
        if (!/^image\//.test(file.type || "")) return say(`跳过非图片：${file.name}`);
        const el = document.createElement("div");
        el.className = "orow";
        el.innerHTML = `
          <div class="rpic"><img alt="预览"></div>
          <div class="rmain">
            <div class="rname"><b></b><em></em></div>
            <textarea class="rprompt" placeholder="提示词（选填）：描述这张图，留空也可以保存"></textarea>
          </div>
          <button class="rdel" title="移除">✕</button>`;
        const url = URL.createObjectURL(file);
        el.querySelector("img").src = url;
        el.querySelector(".rname b").textContent = file.name;
        el.querySelector(".rname em").textContent = fmtBytes(file.size);
        const ta = el.querySelector(".rprompt");
        el.querySelector(".rdel").addEventListener("click", () => {
          URL.revokeObjectURL(url);
          const i = rows.findIndex((r) => r.el === el);
          if (i >= 0) rows.splice(i, 1);
          el.remove();
          refreshHint();
        });
        listEl.appendChild(el);
        rows.push({ file, url, el, ta });
        refreshHint();
      }

      function addFiles(files) {
        say("");
        [...files].forEach(addRow);
      }

      pick.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        addFiles(fileInput.files || []);
        fileInput.value = "";
      });
      ["dragenter", "dragover"].forEach((ev) =>
        pick.addEventListener(ev, (e) => {
          e.preventDefault();
          pick.classList.add("drag");
        })
      );
      ["dragleave", "drop"].forEach((ev) =>
        pick.addEventListener(ev, (e) => {
          e.preventDefault();
          pick.classList.remove("drag");
        })
      );
      pick.addEventListener("drop", (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) addFiles(files);
      });

      mpEl.addEventListener("input", () => {
        const v = mpEl.value.trim();
        const bad = v !== "" && (!/^\d*\.?\d*$/.test(v) || parseFloat(v) <= 0 || parseFloat(v) > 400);
        mpEl.classList.toggle("bad", bad);
      });

      chipsEl.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        catEl.value = b.dataset.cat || "";
        catEl.focus();
      });

      mask.querySelector(".ocancel").addEventListener("click", () => {
        rows.forEach((r) => URL.revokeObjectURL(r.url));
        mask.remove();
      });

      okBtn.addEventListener("click", async () => {
        if (!rows.length) return say("请先选择图片");
        const mpRaw = mpEl.value.trim();
        const mp = mpRaw ? parseFloat(mpRaw) : 0;
        if (mpRaw && (isNaN(mp) || mp <= 0 || mp > 400)) {
          return say("压缩像素请填 0.1 ~ 400 之间的数字，或留空");
        }

        okBtn.disabled = true;
        const total = rows.length;
        const okItems = [];
        const fails = [];

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          say(`正在保存 ${i + 1}/${total}…`);
          try {
            const fd = new FormData();
            fd.append("file", r.file, r.file.name);
            fd.append("cat", catEl.value.trim());
            fd.append("prompt", r.ta.value.trim());
            fd.append("name", r.file.name);
            if (mp > 0) fd.append("mp", String(mp));

            const res = await fetch(API_ADD, { method: "POST", body: fd });
            const j = await res.json().catch(() => ({}));
            if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);
            okItems.push(j.item);
          } catch (err) {
            fails.push(`${r.file.name}：${err.message}`);
          }
        }

        resetCache();
        items = await loadData();
        rows.forEach((r) => URL.revokeObjectURL(r.url));

        if (!fails.length) {
          mask.remove();
          closeModal();
          const last = okItems[okItems.length - 1];
          if (last) apply(node, last);
          console.log("[其他素材] 已新增", okItems.map((x) => x.id).join(","));
          return;
        }

        say(`已保存 ${okItems.length} 张，失败 ${fails.length} 张：${fails.slice(0, 2).join("；")}`);
        okBtn.disabled = false;
        if (okItems.length) {
          rows.length = 0;
          listEl.innerHTML = "";
          refreshHint();
        }
      });

      mask.addEventListener("mousedown", (e) => {
        if (e.target === mask) {
          rows.forEach((r) => URL.revokeObjectURL(r.url));
          mask.remove();
        }
      });

      overlay.querySelector(".osp-panel").appendChild(mask);
      refreshHint();
    }

    addBtn.addEventListener("click", openAddForm);

    overlay.querySelector(".osp-close").addEventListener("click", closeModal);
    overlay.addEventListener("mousedown", (e) => {
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
  name: "OtherAssetsManager.UI",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_NAME) return;

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
      const node = this;
      injectCSS();

      const w = getWidget(node);
      if (w) {
        w.type = "hidden";
        w.computeSize = () => [0, -6];
      }

      const wrap = document.createElement("div");
      wrap.className = "osp-node";
      wrap.innerHTML = `
        <div class="osp-thumb">
          <img alt="素材预览">
          <div class="osp-mask">点击打开素材库</div>
          <div class="osp-tag">未选择素材</div>
        </div>
        <div class="osp-actions">
          <button class="osp-btn primary">素材库</button>
          <button class="osp-btn">随机</button>
        </div>`;

      node.__ospImg = wrap.querySelector("img");
      node.__ospTag = wrap.querySelector(".osp-tag");

      wrap.querySelector(".osp-thumb").addEventListener("click", () => openPicker(node));
      wrap.querySelector(".primary").addEventListener("click", (e) => {
        e.stopPropagation();
        openPicker(node);
      });
      wrap.querySelectorAll(".osp-btn")[1].addEventListener("click", (e) => {
        e.stopPropagation();
        loadData().then((items) => {
          if (!items.length) {
            window.alert("素材库还是空的，先点「素材库」添加图片");
            return;
          }
          apply(node, items[Math.floor(Math.random() * items.length)]);
        });
      });

      const dom = node.addDOMWidget("osp_ui", "osp_ui", wrap, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 300,
        getMaxHeight: () => 460,
      });
      dom.element.style.width = "100%";

      const idx = node.widgets.indexOf(dom);
      if (idx > 0) {
        node.widgets.splice(idx, 1);
        node.widgets.unshift(dom);
        const sz = node.computeSize();
        node.setSize([node.size[0], sz[1]]);
      }

      if (node.size[0] < 260) node.setSize([260, node.size[1]]);
      // 延后一帧：configure 恢复工作流值发生在紧接着的同步流程里
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
