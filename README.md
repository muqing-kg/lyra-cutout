<h1 align="center">MuQing Image 部署文档</h1>

<p align="center">
  <strong>使用 Docker 镜像一键部署到云服务器</strong>
</p>

---

## 简介

MuQing Image 是一站式智能图片处理平台，前端单页应用（SPA），通过 Nginx 静态托管并反向代理 Adobe 接口即可运行，无需后端服务。

---

## 新增功能概览

- 智能抠图增强
  - 本地蒙版后处理参数：阈值、边缘羽化、边缘扩展
  - 预设场景：人像柔边、商品白底、发丝毛发、Logo扁平等
  - 并发控制保持 10，自动退避重试与令牌单航班
- 预览与切换
  - 全屏预览 Lightbox：点击缩略图放大、双击/点击缩放
  - 键盘左右键、鼠标滚轮、手机滑动切换
  - 打开时锁定页面滚动，滚轮不穿透背景
- 上传体验
  - 除“智能抠图/图片对比/拼贴画”外，其他页面空态卡片均支持点击开启文件选择
  - 每页按能力限制单/多选：压缩/尺寸/水印/拼接/裁剪等支持多选，色彩分析/EXIF/隐私马赛克支持单选
- 列表管理
  - 抠图页面文件项展示缩略图 + 文件名 + 删除按钮
  - 压缩与尺寸调整列表在表格中直接提供删除按钮
- 表格与布局
  - 压缩与尺寸调整列表加入列宽分配与数值居中，列间距更合理
- 代理与部署
  - Nginx 增加 `client_max_body_size 50m`、`proxy_request_buffering off`、补充浏览器头
  - 超时提升与 SNI 打开，降低上游风控影响

---

## 快速部署（Docker Compose）

### 1. 环境准备
- Docker 20+
- Docker Compose v2+
- 云服务器开放端口 `80`

### 2. 拉取代码并构建运行

```bash
git clone https://github.com/petehalverson/lyra-cutout.git
cd lyra-cutout
docker compose up -d --build
docker compose ps
```

访问 `http://<云服务器IP>:9090/`。

---

## 镜像构建与推送（Docker Hub）

镜像仓库示例：`muqingw/image-editing`

```bash
docker build -t muqingw/image-editing:latest .
docker login
docker push muqingw/image-editing:latest
```

使用他人服务器部署时，可直接：

```bash
docker pull muqingw/image-editing:latest
docker run -d -p 9090:80 --restart=always --name image-editing muqingw/image-editing:latest
```

---

## 目录与文件

- `Dockerfile`：Node 构建 + Nginx 运行时
- `nginx.conf`：静态托管与反向代理
  - `/` → `index.html` SPA 回退
  - `/adobe-api/` → `https://sensei.adobe.io/`
  - `/adobe-token/` → `https://adobeid-na1.services.adobe.com/`
- 关键代理配置：
  - `client_max_body_size 50m`
  - `proxy_request_buffering off`（Sensei 上传走流式）
  - 透传浏览器头：`User-Agent/Accept/Accept-Language/Accept-Encoding/Sec-Fetch-*`
  - `proxy_ssl_server_name on`、超时提升（读/连/发）
- `docker-compose.yml`：镜像构建与运行
- `.dockerignore`：忽略本地运行产物（`node_modules`、`.vercel`、`dist` 等）

---

## 使用说明

### 智能抠图（Adobe）
- 参数
  - 阈值：0–80%，控制透明与保留的分界
  - 边缘羽化：0–12px，柔化边缘
  - 边缘扩展：-30～+30px，微调主体边缘
- 预设
  - 人像柔边、商品白底、发丝毛发、Logo 扁平、复杂纹理、透明玻璃、强切纯色、高对比硬边
- 并发与稳定性
  - 并发保持 10；令牌请求单航班 + 指数退避；请求含轻微随机抖动
- 操作
  - 上传后在结果网格点击缩略图预览；支持左右键/滚轮/滑动切换

### 批量水印
- 文本/图片水印一行控件：文字/字号/颜色/透明度/位置或图片/缩放/透明度/位置
- 处理完成后可在网格点击预览，支持序列切换与打包下载

### 长图拼接
- 拼接方向/间距/背景色为同一行控件
- 预览图点击全屏查看

### 图片压缩与尺寸调整
- 列表在表格首列展示缩略图与文件名，并提供删除按钮
- 压缩列表列宽与对齐优化；提供节省总量汇总

### 其他页面
- 色彩分析、EXIF、隐私马赛克：空态卡片点击即可选择图片（单选）
- 批量裁剪：空态卡片点击选择图片（多选）

---

## 常见问题

- 无法调用 Adobe 抠图接口
  - 确认容器使用了仓库提供的 `nginx.conf`，并保持前端请求路径为 `/adobe-api` 与 `/adobe-token`
  - 云服务器需允许外网访问 Adobe 域名（无需额外端口）
- 403 风控或偶发失败
  - 代理需透传浏览器关键头；已启用 SNI 与超时；前端请求包含退避与随机抖动
  - 避免同时重复触发；令牌已缓存与并发合并
- 变更端口
  - 修改 `docker-compose.yml` 中 `ports` 映射，例如 `- "8080:80"`，并访问 `http://<IP>:8080/`
- 静态托管而不反代
  - 如果不使用 Adobe 抠图，可删除 `nginx.conf` 中的两段 `location` 代理，前端仍可使用其它本地工具模块

---

## 升级与回滚

```bash
docker pull muqingw/image-editing:latest
docker compose up -d
docker compose logs -f
docker run -d -p 9090:80 --restart=always muqingw/image-editing:<tag>
```

---

## 许可

仅用于学习与研究，禁止用于商业用途。使用第三方服务需遵守相应条款。

---

## 🏗️ 项目结构

```
lyra-cutout/
├── src/
│   ├── App.jsx           # 主入口组件
│   ├── adobeService.js   # Adobe 接口集成
│   ├── theme.css         # 全站样式
│   ├── logo.svg          # 应用 Logo
│   └── main.jsx          # 挂载入口
├── assets/
│   ├── logo-light.svg    # Logo for dark mode
│   └── logo-dark.svg     # Logo for light mode
├── index.html            # HTML 模板
├── vite.config.js        # 开发代理与构建配置
└── package.json
```

---

## 🔧 开发与构建

### 开发代理（Vite）

开发服务器包含 Adobe 接口代理：

```javascript
// vite.config.js
proxy: {
  '/adobe-api': {
    target: 'https://sensei.adobe.io',
    changeOrigin: true,
    // ... headers for Adobe Express
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

> ⚠️ 注意：线上已通过 `nginx.conf` 配置反向代理，无需在浏览器中设置跨域。

### 本地开发

```bash
npm i
npm run dev
# 如需局域网访问
npm run dev -- --host
```

---

## 📄 许可证（License）

本项目采用 **CC BY-NC-SA 4.0** 许可。

### 你可以：

- **共享** — 复制与再分发
- **改作** — 混合、转换或在其基础上创作

### 需遵守：

- **署名** — 标注来源
- **非商业** — 不得用于商业用途
- **相同方式共享** — 改作需使用相同许可

详见 [LICENSE](LICENSE)。

---

## 🙏 鸣谢

- Adobe Sensei / remove.bg / rembg
- React & Vite

---

## 🤝 贡献

欢迎提交 Issue 与 PR：

1. Fork 仓库
2. 创建分支（`feature/xxx`）
3. 提交并推送
4. 发起 Pull Request

---

<p align="center">
  Made with ❤️ for the open source community
</p>

<p align="center">
  <strong>⚠️ 仅用于学习与研究，禁止商业用途 ⚠️</strong>
</p>
