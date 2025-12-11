<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-light.svg" width="120">
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-dark.svg" width="120">
    <img alt="Lyra Image Logo" src="assets/logo-dark.svg" width="120">
  </picture>
</p>

<h1 align="center">Lyra Image</h1>

<p align="center">
  <strong>一站式智能图片处理平台</strong>
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> •
  <a href="https://lyra-cutout.pages.dev/" target="_blank">🌟 在线演示</a> •
  <a href="#功能特点">功能特点</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用指南">使用指南</a> •
  <a href="#许可证">许可证</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-CC--BY--NC--SA--4.0-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Vite-6.0-646cff.svg?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/TensorFlow.js-AI-FF6F00.svg?logo=tensorflow&logoColor=white" alt="TensorFlow.js">
</p>

<p align="center">
  <!-- Live Demo Badge -->
  <a href="https://lyra-cutout.pages.dev/" target="_blank">
    <img src="https://img.shields.io/website?url=https%3A%2F%2Flyra-cutout.pages.dev%2F&up_message=%E5%9C%A8%E7%BA%BF&down_message=%E7%A6%BB%E7%BA%BF&label=%E5%9C%A8%E7%BA%BF%E6%BC%94%E7%A4%BA&style=for-the-badge&logo=vercel&logoColor=white&color=success" alt="Live Demo">
  </a>
  <!-- Deploy Badge -->
  <a href="https://deploy.cloudflare.com/?url=https://github.com/petehsu/lyra-cutout" target="_blank">
    <img src="https://img.shields.io/badge/%E4%B8%80%E9%94%AE%E9%83%A8%E7%BD%B2-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Deploy to Cloudflare Pages">
  </a>
</p>

---

## ⚠️ 免责声明

**本项目仅供学习交流使用，严禁用于商业用途。**

本工具使用第三方 AI 服务（Adobe Sensei、remove.bg）。请遵守相关服务条款和使用条件。作者不对任何滥用或违反第三方条款的行为承担责任。

---

## ✨ 功能特点

### 🎨 核心工具
- **智能抠图** - 支持 Adobe Express、remove.bg、本地 rembg 三种引擎
- **批量裁剪** - 专业预设比例，关联调整
- **AI 智能构图** - TensorFlow.js 主体检测，构图建议
- **色彩和谐分析** - 提取主色调，配色评分

### 🛠️ 图片工具箱
- **长图拼接** - 将多张截图拼成一张长图
- **隐私马赛克** - 框选区域添加马赛克/模糊
- **批量水印** - 文字/图片水印，自定义位置
- **图片压缩** - 调整质量，减小文件体积
- **格式转换** - PNG/JPG/WebP 互转
- **尺寸调整** - 批量缩放，保持比例
- **EXIF 查看器** - 查看/清除图片元数据
- **图片对比** - Before/After 滑动对比
- **拼贴画** - 九宫格等多种布局
- **图片隐写** - 在像素中隐藏秘密信息，支持密码/2FA/人脸多因素认证

### ⚡ 平台特点
- 🆓 **完全免费** - 无需 API Key，无需注册
- 🔒 **隐私优先** - 所有处理都在浏览器本地完成
- 📱 **响应式设计** - 支持桌面、平板、手机
- ⚡ **极速处理** - WebAssembly/WebGL 加速的 AI
- 💰 **免费使用** - Adobe 模式无需 API 密钥或注册

## ✂️ 批量裁剪工具 (New)

Lyra Cutout 现已内置强大的**批量裁剪模块**，无需上传即可在本地快速处理图片：
- **批量管理**：支持一次性导入多张图片，列表式管理。
- **关联调整**：独创的“关联同步”功能，调整一张图片的裁剪框（比例/相对位置），所有图片自动同步，极大提升电商/证件照处理效率。
- **专业预设**：内置 1:1, 4:3, 16:9, 2.35:1 (电影感) 等多种常用比例，亦支持自由裁剪。
- **隐私安全**：基于浏览器 Canvas 技术，所有裁剪合成均在本地完成，速度极快且不消耗流量。

---

## 🚀 快速开始

### 环境要求

- Node.js 18+ 和 npm

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/petehalverson/lyra-cutout.git
cd lyra-cutout

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 http://localhost:5173

---

## 📖 使用指南

Lyra Cutout 支持三种背景移除引擎。根据您的需求选择最适合的：

### 方案一：Adobe Express（推荐）⭐

**适用场景：** 免费、高质量，无需任何设置

1. 选择 **"⭐ Adobe（免费）"** 模式
2. 上传图片（支持多选）
3. 点击 **"🚀 开始批处理"**
4. 下载单个结果或打包下载

**优点：**
- ✅ 完全免费
- ✅ 无需 API 密钥
- ✅ 无需注册账号
- ✅ Adobe Sensei AI 高质量输出
- ✅ 最多 10 张并发处理

**缺点：**
- ⚠️ 需要网络连接
- ⚠️ 可能存在速率限制

---

### 方案二：remove.bg API

**适用场景：** 专业用途，需付费 API 访问

1. 从 [remove.bg](https://www.remove.bg/api) 获取 API 密钥
2. 选择 **"remove.bg"** 模式
3. 输入 API 密钥
4. 上传并处理图片

**优点：**
- ✅ 质量稳定
- ✅ 原始分辨率输出（付费计划）
- ✅ 专业 API 支持

**缺点：**
- ⚠️ 需要 API 密钥
- ⚠️ 免费额度有限
- ⚠️ 浏览器中会暴露 API 密钥（生产环境建议使用后端代理）

---

### 方案三：本地 rembg 服务器

**适用场景：** 离线处理、注重隐私、无限量使用

此选项需要设置本地 rembg 服务器。以下是详细步骤：

#### 步骤一：安装 rembg

```bash
# 使用 pip 安装
pip install rembg[gpu]  # GPU 支持
# 或者
pip install rembg        # 仅 CPU

# 使用 Docker（推荐）
docker pull danielgatis/rembg
```

#### 步骤二：启动服务

**使用 Python：**

```bash
# 在 7000 端口启动 rembg 服务器
rembg s --host 0.0.0.0 --port 7000
```

**使用 Docker：**

```bash
docker run -d -p 7000:5000 danielgatis/rembg s
```

#### 步骤三：在 Lyra Cutout 中配置

1. 选择 **"本地 rembg"** 模式
2. 输入服务地址：`http://localhost:7000`（或开发代理使用 `/rembg`）
3. 上传并处理图片

**优点：**
- ✅ 无需网络
- ✅ 完全隐私
- ✅ 无限量处理
- ✅ 无需 API 密钥

**缺点：**
- ⚠️ 需要本地部署
- ⚠️ 建议使用 GPU 加速
- ⚠️ 质量取决于模型

#### 进阶：使用 GPU 加速

为获得更快的处理速度，使用 CUDA GPU：

```bash
# 安装带 ONNX GPU 支持的版本
pip install rembg[gpu] onnxruntime-gpu

# 验证 GPU 检测
python -c "import onnxruntime; print(onnxruntime.get_device())"
```

---

## 🔬 技术实现原理 (Adobe 方案)

本项目的一个核心亮点是逆向并集成了 Adobe Express 的免费抠图 API。实现流程如下：

### 1. 匿名认证 (Guest Token)

Adobe Express 允许未登录用户试用。通过分析网络请求，发现其使用 OAuth 访客模式：

- **端点**: `POST /ims/check/v6/token`
- **参数**: `guest_allowed=true`, `client_id=quickactions_hz_webapp`
- **结果**: 获取一个临时的 `access_token`，有效期通常为 24 小时。

### 2. CORS 与请求伪造 (Vite Proxy)

直接在浏览器调用 Adobe API 会触发 CORS 错误，且无法修改 `Origin` 和 `Referer` 头。
项目利用 Vite 的代理功能 (`vite.config.js`)：

- 前端请求 `/adobe-api` → 代理转发至 `https://sensei.adobe.io`
- 代理服务器自动注入以下 Headers 欺骗服务器：
  - `Origin: https://quick-actions.express.adobe.com`
  - `Referer: https://quick-actions.express.adobe.com/`

### 3. Sensei API 交互

Adobe Sensei API 不直接返回透明 PNG，而是返回原图的 **Mask（遮罩层）**。

- **请求**: `multipart/form-data`，包含 JSON 配置 (`contentAnalyzerRequests`) 和图片文件。
- **响应**: 一个多部分响应，其中一部分是 JPEG 格式的黑白 Mask 图片。

### 4. 前端图像合成

最终的透明图片完全在浏览器端通过 Canvas API 合成：

1. 创建 `<canvas>`，尺寸与原图一致。
2. 绘制原图到 Canvas。
3. 获取 Mask 图片的像素数据。
4. 遍历像素，将原图 Alpha 通道根据 Mask 的灰度值进行更新（黑色=透明，白色=保留）。
5. 导出为 PNG Blob。

这种方式既利用了 Adobe 强大的 AI 能力，又避免了将原图暴露给非官方的后端服务，最大程度保证了隐私和速度。

---

## 🔐 图片隐写技术实现

隐写模块实现了一个多层次的安全系统，用于在 PNG 图片中隐藏秘密信息。

### 1. LSB（最低有效位）编码

核心隐藏技术使用 LSB 隐写术：

```
原始像素:     RGB(150, 200, 100) = 二进制: 10010110, 11001000, 01100100
隐藏位:       1
修改后像素:   RGB(151, 200, 100) = 二进制: 10010111, 11001000, 01100100
                                           ^^^^^^^^ (仅改变1位)
```

- 仅修改**红色通道的最低有效位**
- 人眼无法察觉 1/256 的颜色变化
- 每个像素存储 1 位；8 个像素 = 1 字节
- 容量：每 100 万像素约可存储 10KB 文字

### 2. 数据结构

```
┌──────────────┬───────────┬──────────────┬─────────────┐
│  魔数 (4B)   │ 标志 (1B) │  长度 (4B)   │   载荷      │
│   "LYRA"     │  0b00000  │   N 字节     │   N 字节    │
└──────────────┴───────────┴──────────────┴─────────────┘
```

**认证标志（位掩码）：**
| 位 | 标志 | 描述 |
|-----|------|------|
| 0 | `AUTH_PASSWORD` | 启用 AES-256-GCM 加密 |
| 1 | `AUTH_2FA` | 需要 TOTP 验证 |
| 2 | `AUTH_FACE` | 需要人脸验证 |

### 3. AES-256-GCM 加密

启用密码保护时：

```javascript
// 密钥派生 (PBKDF2)
盐值: 16 随机字节
迭代次数: 100,000
哈希: SHA-256
输出: 256 位 AES 密钥

// 加密
算法: AES-256-GCM
IV: 12 随机字节
认证标签: 16 字节（内置于密文中）

// 存储格式:
[盐值 16B][IV 12B][密文 + 认证标签]
```

**安全特性：**
- ✅ 认证加密（防篡改检测）
- ✅ 每次加密使用唯一密钥（随机盐值）
- ✅ 抗暴力破解（10 万次 PBKDF2 迭代）

### 4. TOTP 双因素认证

兼容 Google Authenticator、Microsoft Authenticator、Authy 等。

```
TOTP 生成 (RFC 6238):
1. 密钥: 160 位随机 → Base32 编码 (32 字符)
2. 时间步长: floor(Unix_Time / 30)
3. HMAC: HMAC-SHA1(密钥, 时间步长)
4. 截断: 动态偏移提取
5. 输出: 6 位数字码 (模 1,000,000)
```

**验证窗口：** ±30 秒（允许 1 步偏差）

**数据存储：**
```
[密钥长度 1B][Base32 密钥 ~32B][加密消息]
```

### 5. 人脸识别认证

基于直方图特征的轻量级客户端人脸验证。

**特征提取：**
```
图像 (160×120 灰度)
       ↓
分割为 4×4 = 16 个区域
       ↓
每个区域: 8-bin 灰度直方图
       ↓
归一化到 0-255
       ↓
输出: 128 维特征向量
```

**比较（余弦相似度）：**
```
相似度 = (A · B) / (||A|| × ||B||)

阈值: 0.70 (需要 70% 相似度)
```

**安全说明：**
- 🔒 人脸模板加密存储在图片中
- 🔒 无云端上传，所有处理在浏览器完成
- ⚠️ 安全性不如专业人脸识别系统
- ⚠️ 对光线/角度变化敏感

### 6. 组合认证模式

三种因素可任意组合：

| 模式 | 安全等级 | 使用场景 |
|------|----------|----------|
| 仅密码 | ⭐⭐ | 快速保护 |
| 仅 2FA | ⭐⭐ | 手机验证 |
| 仅人脸 | ⭐⭐ | 生物识别 |
| 密码 + 2FA | ⭐⭐⭐ | 标准双因素 |
| 密码 + 人脸 | ⭐⭐⭐ | 密码 + 生物 |
| 2FA + 人脸 | ⭐⭐⭐ | 无密码双因素 |
| 三者全选 | ⭐⭐⭐⭐ | 最高安全 |

### 7. 解密流程

```
读取魔数头 → 验证 "LYRA"
读取标志 → 确定所需认证因素
读取长度 → 提取载荷

如果 PASSWORD 标志:
  └→ 提示输入密码 → PBKDF2 → AES-GCM 解密

如果 2FA 标志:
  └→ 从载荷提取 TOTP 密钥
  └→ 提示输入 6 位验证码 → 验证 TOTP

如果 FACE 标志:
  └→ 从载荷提取人脸模板
  └→ 实时拍照 → 比较相似度

全部验证通过 → 显示隐藏信息
```

---

#### 常见问题

**Q: rembg 服务器启动失败？**
```bash
# 检查端口是否被占用
lsof -i :7000

# 使用其他端口
rembg s --port 8000
```

**Q: 处理速度很慢？**
- 确保安装了 GPU 版本
- 检查 CUDA 是否正确配置
- 考虑使用更快的模型：`rembg s -m u2netp`

**Q: 内存不足？**
- 使用轻量模型：`rembg s -m u2netp`
- 降低图片分辨率后处理

---

## 🏗️ 项目结构

```
lyra-cutout/
├── src/
│   ├── App.jsx           # 主 React 组件
│   ├── adobeService.js   # Adobe Sensei API 集成
│   ├── theme.css         # 样式（本子风格）
│   ├── logo.svg          # 应用图标
│   └── main.jsx          # 入口文件
├── assets/
│   ├── logo-light.svg    # 深色模式 Logo
│   └── logo-dark.svg     # 浅色模式 Logo
├── index.html            # HTML 模板
├── vite.config.js        # Vite 配置（含代理）
└── package.json
```

---

## 🔧 开发指南

### Vite 代理配置

开发服务器包含 Adobe API 和本地 rembg 的代理：

```javascript
// vite.config.js
proxy: {
  '/adobe-api': {
    target: 'https://sensei.adobe.io',
    changeOrigin: true,
    // ... Adobe Express 所需的 headers
  },
  '/rembg': {
    target: 'http://localhost:7000',
    changeOrigin: true,
  }
}
```

### 生产构建

```bash
npm run build
npm run preview
```

> ⚠️ **注意：** 生产部署需要后端代理来处理 Adobe API 请求，因为浏览器无法设置 CORS headers。

---

## 📄 许可证

本项目采用 **知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议 (CC BY-NC-SA 4.0)**。

### 您可以自由地：

- **共享** — 在任何媒介或格式中复制、发行本作品
- **演绎** — 修改、转换或以本作品为基础进行创作

### 须遵循以下条款：

- **署名** — 您必须给出适当的署名
- **非商业性使用** — 您不得将本作品用于商业目的
- **相同方式共享** — 如果您再混合、转换或者基于本作品进行创作，必须基于相同的许可协议发布

完整许可证文本请查看 [LICENSE](LICENSE)。

---

## 🙏 致谢

- [Adobe Sensei](https://www.adobe.com/sensei.html) - AI 背景移除技术
- [remove.bg](https://www.remove.bg) - 专业背景移除 API
- [rembg](https://github.com/danielgatis/rembg) - 开源背景移除工具
- [React](https://reactjs.org) & [Vite](https://vitejs.dev) - 前端框架和构建工具

---

## 🤝 参与贡献

欢迎贡献！请随时提交 Issues 和 Pull Requests。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

<p align="center">
  用 ❤️ 为开源社区制作
</p>

<p align="center">
  <strong>⚠️ 仅供学习交流，禁止商业使用 ⚠️</strong>
</p>
