import { app } from "../../scripts/app.js";

/* ============================================================
   人脸选择器 · 前端
   节点上显示当前人脸缩略图，点击弹出选择面板（女性 99 张 / 男性 40 张）
   ============================================================ */

const API_LIST = "/face_picker/list";
const API_ADD = "/face_picker/add";
const API_DEL = "/face_picker/delete";
const NODE_NAME = "FacePicker";
const LIB_SIZE = 768;

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
      console.error("[人脸选择器] 人脸库加载失败", e);
      DATA = [];
      return DATA;
    });
  return LOADING;
}

const CSS = `
.fsp-node{display:flex;flex-direction:column;gap:6px;width:100%;height:100%;box-sizing:border-box;padding:2px}
.fsp-thumb{position:relative;flex:1;min-height:0;border-radius:10px;overflow:hidden;
  background:rgba(0,0,0,.25);cursor:pointer;border:1px solid rgba(255,255,255,.12)}
.fsp-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.fsp-thumb:hover{border-color:#4a9eff}
.fsp-thumb .fsp-mask{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.45);color:#fff;font-size:13px;letter-spacing:2px;opacity:0;transition:.15s}
.fsp-thumb:hover .fsp-mask{opacity:1}
.fsp-tag{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:12px;color:#fff;
  background:linear-gradient(transparent,rgba(0,0,0,.75));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fsp-actions{display:flex;gap:6px}
.fsp-btn{flex:1;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.07);color:#e8e8e8;font-size:12px;cursor:pointer;transition:.15s}
.fsp-btn:hover{background:rgba(255,255,255,.16)}
.fsp-btn.primary{background:#2f76d2;border-color:#2f76d2;color:#fff}
.fsp-btn.primary:hover{background:#3a8be8}

/* ---------- 弹窗 ---------- */
.fsp-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.62);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);
  animation:fsp-fade .16s ease}
@keyframes fsp-fade{from{opacity:0}to{opacity:1}}
.fsp-panel{position:relative;width:min(1560px,96vw);height:95vh;display:flex;flex-direction:column;
  background:#1b1d22;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9e9ea;
  font-family:system-ui,"Microsoft YaHei",sans-serif}
.fsp-note{flex:none;padding:7px 18px;font-size:11.5px;line-height:1.5;text-align:center;
  color:#8e96a3;background:rgba(255,255,255,.035);border-bottom:1px solid rgba(255,255,255,.06);
  letter-spacing:.3px;user-select:none}
.fsp-head{display:flex;align-items:center;gap:12px;padding:14px 16px;
  border-bottom:1px solid rgba(255,255,255,.09);flex-wrap:wrap}
.fsp-title{font-size:15px;font-weight:600;letter-spacing:1px;margin-right:4px}
.fsp-title span{font-size:12px;font-weight:400;color:#8b93a0;margin-left:8px}
.fsp-tabs{display:flex;gap:4px;background:rgba(255,255,255,.06);padding:3px;border-radius:8px}
.fsp-tabs button{border:0;background:transparent;color:#aeb6c2;font-size:13px;padding:5px 14px;
  border-radius:6px;cursor:pointer;transition:.15s}
.fsp-tabs button.on{background:#2f76d2;color:#fff}
.fsp-search{flex:1;min-width:160px;height:30px;border-radius:8px;padding:0 10px;font-size:13px;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9e9ea;outline:none}
.fsp-search:focus{border-color:#2f76d2}
.fsp-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);
  background:transparent;color:#c7ccd4;font-size:15px;cursor:pointer}
.fsp-close:hover{background:rgba(255,255,255,.1)}
.fsp-add{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(74,158,255,.5);
  background:rgba(74,158,255,.12);color:#8fc2ff;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.fsp-add:hover{background:rgba(74,158,255,.26);color:#fff;border-color:#4a9eff}
.fsp-add.off{display:none}

/* ---------- 新增人脸表单 ---------- */
.fsp-form-mask{position:absolute;inset:0;z-index:6;background:rgba(10,11,14,.74);
  display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.fsp-form{width:min(700px,90%);background:#21242a;border:1px solid rgba(255,255,255,.14);
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

/* ---------- 卡片网格 ---------- */
.fsp-grid{flex:1;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;gap:14px;
  padding:16px 18px;align-content:flex-start}
.fsp-grid::-webkit-scrollbar{width:9px}
.fsp-grid::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:5px}
.fsp-card{width:calc((100% - 70px)/6 - 1px);flex:none;box-sizing:border-box;border-radius:10px;overflow:hidden;cursor:pointer;background:#23262c;
  border:2px solid transparent;transition:transform .12s,border-color .12s;position:relative}
.fsp-card:hover{transform:translateY(-3px);border-color:rgba(74,158,255,.6)}
.fsp-card.on{border-color:#2f76d2;box-shadow:0 0 0 2px rgba(47,118,210,.35)}
.fsp-card .pic{position:relative;width:100%;padding-top:100%;overflow:hidden;background:#111}
.fsp-card .pic img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
.fsp-card .nm{padding:8px 9px;font-size:12.5px;line-height:1.38;color:#d8dde4;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  min-height:35px;box-sizing:border-box}
.fsp-card .gd{position:absolute;top:6px;left:6px;font-size:10px;padding:1px 6px;border-radius:20px;
  background:rgba(0,0,0,.6);color:#cfd6e0}
.fsp-foot{padding:9px 16px;border-top:1px solid rgba(255,255,255,.09);font-size:12px;
  color:#8b93a0;display:flex;justify-content:space-between;gap:16px}
.fsp-foot .fsp-tip{flex:none}
.fsp-foot .fsp-cur{flex:1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fsp-del{height:30px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,120,120,.45);
  background:rgba(255,90,90,.1);color:#ffa8a8;font-size:13px;cursor:pointer;white-space:nowrap;
  transition:.15s;flex:none}
.fsp-del:hover{background:rgba(255,90,90,.24);color:#fff;border-color:#ff6b6b}
.fsp-del.armed{background:#c0392b;border-color:#c0392b;color:#fff}
.fsp-del.armed:hover{background:#d9463a;border-color:#d9463a}
.fsp-del:disabled{opacity:.5;cursor:default;background:rgba(255,90,90,.1);
  border-color:rgba(255,120,120,.3);color:#b98a8a}
.fsp-delcancel{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.16);
  background:transparent;color:#aeb6c2;font-size:13px;cursor:pointer;flex:none;display:none}
.fsp-delcancel.on{display:inline-block}
.fsp-delcancel:hover{background:rgba(255,255,255,.1);color:#fff}

/* ---------- 删除模式 ---------- */
.fsp-card .fsp-ck{display:none;position:absolute;top:7px;right:7px;width:20px;height:20px;
  border-radius:6px;border:2px solid rgba(255,255,255,.8);background:rgba(0,0,0,.45);
  color:#fff;font-size:13px;line-height:16px;text-align:center;box-sizing:border-box;z-index:3;
  font-weight:700}
.fsp-del-mode .fsp-card .fsp-ck{display:block}
.fsp-del-mode .fsp-card{cursor:pointer}
.fsp-del-mode .fsp-card:hover{transform:none;border-color:rgba(255,255,255,.22)}
.fsp-del-mode .fsp-card.on{border-color:transparent;box-shadow:none}
.fsp-card.sel{border-color:#e05a4f !important;box-shadow:0 0 0 2px rgba(224,90,79,.35) !important}
.fsp-card.sel .fsp-ck{background:#e05a4f;border-color:#e05a4f}
.fsp-card.sel .pic:after{content:"";position:absolute;inset:0;background:rgba(224,90,79,.22)}
.fsp-del-mode .fsp-foot{color:#ffa8a8}
.fsp-empty{width:100%;text-align:center;color:#8b93a0;padding:40px 0;font-size:13px}
`;

function injectCSS() {
  if (document.getElementById("fsp-style")) return;
  const s = document.createElement("style");
  s.id = "fsp-style";
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

/** 本地图片 -> 768×768 方形 JPEG（中心裁剪，浏览器端先压一次，省上传体积） */
function fileToBlob(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      try {
        const s = Math.min(im.naturalWidth, im.naturalHeight);
        if (!s) throw new Error("图片尺寸异常");
        const cv = document.createElement("canvas");
        cv.width = cv.height = LIB_SIZE;
        const ctx = cv.getContext("2d");
        ctx.drawImage(
          im,
          (im.naturalWidth - s) / 2,
          (im.naturalHeight - s) / 2,
          s,
          s,
          0,
          0,
          LIB_SIZE,
          LIB_SIZE
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
  return node.widgets ? node.widgets.find((w) => w.name === "face_id") : null;
}

function paint(node, item) {
  const img = node.__fspImg;
  const tag = node.__fspTag;
  if (!img) return;
  if (item) {
    img.src = item.url;
    img.style.visibility = "visible";
    tag.textContent =
      (item.gender === "male" ? "男" : "女") + " · " + item.name_cn;
  } else {
    img.removeAttribute("src");
    img.style.visibility = "hidden";
    tag.textContent = "未选择人脸";
  }
}

function syncFromValue(node) {
  // 序号守卫：只让最后发起的那次同步生效（节点创建早于工作流值恢复，会读到空串）
  const seq = (node.__fspSeq = (node.__fspSeq || 0) + 1);
  const w = getWidget(node);
  const id = w ? w.value : "";
  loadData().then((items) => {
    if (seq !== node.__fspSeq) return;
    if (!items.length) {
      node.__fspItem = null;
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
    node.__fspItem = it;
    paint(node, it);
  });
}

function apply(node, item) {
  const w = getWidget(node);
  if (w) w.value = item.id;
  node.__fspItem = item;
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
    const cur = node.__fspItem;
    let gender = cur ? cur.gender : "female";
    let keyword = "";

    const countLabel = (list) =>
      `女性 ${list.filter((x) => x.gender === "female").length} 张 · 男性 ${
        list.filter((x) => x.gender === "male").length
      } 张`;

    const overlay = document.createElement("div");
    overlay.className = "fsp-overlay";
    overlay.innerHTML = `
      <div class="fsp-panel">
        <div class="fsp-note">素材来源于网络和用户自添加，未授权，只用于研究和学习</div>
        <div class="fsp-head">
          <div class="fsp-title">人脸选择器<span>${countLabel(items)}</span></div>
          <div class="fsp-tabs">
            <button data-g="female">女性</button>
            <button data-g="male">男性</button>
          </div>
          <input class="fsp-search" placeholder="搜索面部特征（如：鹅蛋脸 / 单眼皮 / 清冷）">
          <button class="fsp-add" title="上传新人脸图并保存到人脸库">＋ 添加人脸</button>
          <button class="fsp-del" title="勾选要删除的人脸">🗑 删除人脸</button>
          <button class="fsp-delcancel" title="退出删除模式">取消</button>
          <button class="fsp-close" title="关闭">✕</button>
        </div>
        <div class="fsp-grid"></div>
        <div class="fsp-foot">
          <span class="fsp-tip">点击卡片即选中并写入节点</span>
          <span class="fsp-cur"></span>
        </div>
      </div>`;

    const panel = overlay.querySelector(".fsp-panel");
    const grid = overlay.querySelector(".fsp-grid");
    const search = overlay.querySelector(".fsp-search");
    const curLabel = overlay.querySelector(".fsp-cur");
    const tip = overlay.querySelector(".fsp-tip");
    const addBtn = overlay.querySelector(".fsp-add");
    const delBtn = overlay.querySelector(".fsp-del");
    const cancelBtn = overlay.querySelector(".fsp-delcancel");

    let delMode = false;
    let busy = false;
    const checked = new Set();

    function refreshDelBtn() {
      panel.classList.toggle("fsp-del-mode", delMode);
      addBtn.classList.toggle("off", delMode);
      cancelBtn.classList.toggle("on", delMode);
      if (!delMode) {
        delBtn.textContent = "🗑 删除人脸";
        delBtn.classList.remove("armed");
        delBtn.disabled = false;
        tip.textContent = "点击卡片即选中并写入节点";
        return;
      }
      const n = checked.size;
      delBtn.textContent = n ? `删除选中 (${n})` : "删除选中";
      delBtn.classList.add("armed");
      delBtn.disabled = n === 0 || busy;
      tip.textContent = "勾选要删除的人脸，可多选";
    }

    function render() {
      overlay.querySelector(".fsp-title span").textContent = countLabel(items);
      overlay.querySelectorAll(".fsp-tabs button").forEach((b) => {
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
        grid.innerHTML = '<div class="fsp-empty">没有匹配的人脸</div>';
        curLabel.textContent = "";
        return;
      }
      const curId = (getWidget(node) || {}).value;
      grid.innerHTML = list
        .map((it) => {
          const sel = checked.has(it.id);
          return `<div class="fsp-card${it.id === curId && !delMode ? " on" : ""}${
            sel ? " sel" : ""
          }" data-id="${esc(it.id)}" title="${esc(it.prompt_cn)}">
            <div class="pic"><img loading="lazy" src="${esc(it.url)}" alt="${esc(it.name_cn)}"></div>
            <span class="gd">${it.gender === "male" ? "男" : "女"}</span>
            <div class="nm">${esc(it.name_cn)}</div>
            <span class="fsp-ck">${sel ? "✓" : ""}</span>
          </div>`;
        })
        .join("");
      const c = items.find((x) => x.id === curId);
      curLabel.textContent = c ? "当前：" + c.name_cn : "";
    }

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".fsp-card");
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

    /* ---------- 删除人脸 ---------- */
    async function doDelete() {
      const ids = [...checked];
      if (!ids.length || busy) return;

      const names = ids.map((id) => (items.find((x) => x.id === id) || {}).name_cn || id);
      const preview = names.slice(0, 6).join("、") + (names.length > 6 ? " 等" : "");
      const ok = window.confirm(
        `确定删除这 ${ids.length} 张人脸？\n\n${preview}\n\n图片文件会一并删除，无法撤销。`
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

        DATA = null;
        LOADING = null;
        items = await loadData();
        checked.clear();
        delMode = false;

        const curW = getWidget(node);
        if (curW && ids.includes(curW.value)) {
          const fb =
            items.find((x) => x.gender === gender) ||
            items.find((x) => x.gender === "female") ||
            items[0];
          if (fb) {
            apply(node, fb);
          } else {
            node.__fspItem = null;
            curW.value = "";
            paint(node, null);
            app.graph.setDirtyCanvas(true, true);
          }
        }
        console.log("[人脸选择器] 已删除", ids.join(","), "剩余", items.length);
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

    overlay.querySelector(".fsp-tabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      gender = b.dataset.g;
      render();
    });

    search.addEventListener("input", () => {
      keyword = search.value;
      render();
    });

    /* ---------- 新增人脸 ---------- */
    function openAddForm() {
      const mask = document.createElement("div");
      mask.className = "fsp-form-mask";
      mask.innerHTML = `
        <div class="fsp-form">
          <div class="fhd">添加新面孔</div>
          <div class="fbody">
            <div class="fpick">
              <img alt="预览">
              <div class="fhint">点击或拖入图片<br><i>jpg / png · 自动裁成 768 方形</i></div>
            </div>
            <div class="fright">
              <label>面部特征<em>*</em><i>（脸型，五官，气质）</i></label>
              <input class="fname" maxlength="60" placeholder="如：鹅蛋脸，细眉杏眼，温柔恬静">
              <label>分类</label>
              <div class="fgender">
                <button data-g="female">女性</button>
                <button data-g="male">男性</button>
              </div>
              <label>提示词<i>（选填）</i></label>
              <textarea class="fdesc" maxlength="400"
                placeholder="留空自动生成「中国女性面部，你的特征描述。」；填写则整句覆盖"></textarea>
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

      let g = gender;
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
        if (!blob) return say("请先选择一张人脸图片");
        if (!name) return say("请填写面部特征");

        okBtn.disabled = true;
        say("正在保存…");
        try {
          const fd = new FormData();
          fd.append("file", blob, "face.jpg");
          fd.append("gender", g);
          fd.append("name_cn", name);
          fd.append("prompt_zh", descEl.value.trim());

          const res = await fetch(API_ADD, { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.ok) throw new Error(j.error || "HTTP " + res.status);

          DATA = null;
          LOADING = null;

          mask.remove();
          closeModal();
          apply(node, j.item);
          console.log("[人脸选择器] 已新增人脸", j.item.id, j.item.name_cn);
        } catch (err) {
          say("保存失败：" + err.message);
          okBtn.disabled = false;
        }
      });

      mask.addEventListener("mousedown", (e) => {
        if (e.target === mask) mask.remove();
      });

      overlay.querySelector(".fsp-panel").appendChild(mask);
      setTimeout(() => nameEl.focus(), 30);
    }

    addBtn.addEventListener("click", openAddForm);

    overlay.querySelector(".fsp-close").addEventListener("click", closeModal);
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
  name: "FacePicker.UI",
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
      wrap.className = "fsp-node";
      wrap.innerHTML = `
        <div class="fsp-thumb">
          <img alt="人脸预览">
          <div class="fsp-mask">点击选择人脸</div>
          <div class="fsp-tag">未选择人脸</div>
        </div>
        <div class="fsp-actions">
          <button class="fsp-btn primary">选择人脸</button>
          <button class="fsp-btn">随机</button>
        </div>`;

      node.__fspImg = wrap.querySelector("img");
      node.__fspTag = wrap.querySelector(".fsp-tag");

      wrap.querySelector(".fsp-thumb").addEventListener("click", () => openPicker(node));
      wrap.querySelector(".primary").addEventListener("click", (e) => {
        e.stopPropagation();
        openPicker(node);
      });
      wrap.querySelectorAll(".fsp-btn")[1].addEventListener("click", (e) => {
        e.stopPropagation();
        loadData().then((items) => {
          if (!items.length) return;
          apply(node, items[Math.floor(Math.random() * items.length)]);
        });
      });

      const dom = node.addDOMWidget("fsp_ui", "fsp_ui", wrap, {
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
