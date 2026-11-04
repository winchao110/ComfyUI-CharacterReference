# 示例工作流（examples）

两个把本节点包接进 **Qwen-Image 2.1** 的可直接运行工作流。用法：把 `.json` 直接拖进 ComfyUI 画布，
或放在 `ComfyUI/user/default/workflows/` 下从侧边栏工作流列表打开。

> 两个工作流都用到了 ComfyUI 的**子图（Subgraph）**，需要较新的前端版本（2025 年下半年之后的 ComfyUI）。
> 打开后如果只看到几个折叠的块，双击块即可展开。

---

## 1. `qwen-image-2.1-character-text2img.json` — 人物参考文生图

用三个选择器直接拼出一个人，出全身图。

**结构**：`人脸选择器` + `发型选择器` + `服装选择器` → 子图「Qwen-Image 2.1 文生」→ `保存图像`

| 项 | 内容 |
|---|---|
| 采样 | 20 步 / CFG 2.5 / euler / simple（非 turbo 底模口径） |
| 分辨率 | `ResolutionSelector` 默认 16:9，也可改 3:4 等；`EmptyLatentImage` 1024×1024 兜底 |
| 提示词 | 三个选择器的中文提示词经 `easy promptConcat` 拼进正向；负向内置通用水质词（低分辨率、变形、多余手指、换脸、水印…） |
| 输出 | `output/换装-QW21/换装_xxxxx_.png` |

**换人只改三处**：点三个节点的缩略图重选即可，提示词会跟着走。

---

## 2. `qwen-image-2.1-outfit-swap.json` — 人物参考换装 / 换头

四条并行的子图链路，全都在一张画布上，可以单条跑也可以一起跑：

| 分支 | 做什么 | 输入 |
|---|---|---|
| 子图 1 | **换装**（outfit swap）：保脸保人，把 A 的衣服换成 B 的整套衣服 | `LoadImage` 基础图 + `LoadImage` 服装参考图 |
| 子图 2 | 参考图直出的对照 / 试衣（无换装 LoRA） | `LoadImage` |
| 子图 3 | **人物参考文生全身图**（脸 + 发型 + 服装三选择器） | 三个选择器 |
| 子图 4 | **换头**：把基础图的头整体替换为参考图的头 | `LoadImage` ×2 + 三选择器 |

| 项 | 内容 |
|---|---|
| 采样 | 20 步 / CFG 2.5 / euler / simple |
| 换装 LoRA | `QwenImage2.1\Qwen21-换装outfit-swap-1250.safetensors` @ 1.0（子图 1、4） |
| 换头 LoRA | `QwenImage2.1\Qwen21-换头bfs_head_v1.1_qwen_2.1.safetensors` @ 1.0（子图 4） |
| 缩放 | `ImageScaleToTotalPixels` 按 lanczos 把参考图压到 1.5MP / 1.2MP，避免大图拖慢 |
| 提示词 | 换装 / 换头都写在子图的 `Note` 里，可直接改；换装那句强调「保留衣服颜色、面料纹理、图案、领口、袖长、衣长、版型」+「保持同一张脸、五官、肤色、发型」 |

**跑之前要改的**：三个 `LoadImage` 目前填的是示例图 `换装_00007_.png` / `换装_00006_.png`，
换成你自己的图（把图丢进 `ComfyUI/input/` 后在下拉里选）。

---

## 依赖

**模型**（放对应目录，示例里写的是相对路径）

| 类型 | 文件 |
|---|---|
| UNet / 扩散模型 | `Qwen-Image\qwen_image_2.1_int8_convrot.safetensors` |
| 文本编码器 | `Qwen-Image\qwen3vl_8b_int8_convrot.safetensors` |
| VAE | `Qwen-Image\qwen_image_2.1_vae_bf16.safetensors` |
| LoRA（只换装流程用） | `QwenImage2.1\Qwen21-换装outfit-swap-1250.safetensors`、`QwenImage2.1\Qwen21-换头bfs_head_v1.1_qwen_2.1.safetensors` |

**第三方节点**（本包之外，缺了会显示红色节点）

- `TextEncodeQwenImage21`、`TESpeedQwenImage21`、`QwenImage21Cache` —— Qwen-Image 2.1 相关支持节点
- `easy promptConcat`、`easy positive` —— ComfyUI-Easy-Use
- `ResolutionSelector`、`TaiYangH3FP16Turbo`、`TaiYangH3ActivationChunk` —— TaiYang 系列节点包

在 **管理器 → 安装缺失节点** 里按节点名搜一下即可；实在不想装，把对应节点删掉手工填也一样能跑。

---

## 常见问题

- **节点选中的人脸/发型/服装不是我库里的**：示例里存的是作者本机的 id（`f100`、`w46`、`spr-0016` 等），
  你库里没有的话会自动回退到第一款，重新点一下缩略图选你想要的即可，不影响其它设置。
- **换了图库之后提示词不对**：提示词是从节点库读的，重选一次会自动刷新。
- **换装结果脸变了**：把子图 1 的换装 LoRA 强度从 1.0 降到 0.8–0.9，或在提示词里加强「保持同一张脸」那段。
