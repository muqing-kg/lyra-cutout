<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-light.svg" width="120">
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-dark.svg" width="120">
    <img alt="Lyra Image Logo" src="assets/logo-dark.svg" width="120">
  </picture>
</p>

<h1 align="center">Lyra Image</h1>

<p align="center">
  <strong>All-in-One AI-Powered Image Processing Platform</strong>
</p>

<p align="center">
  <a href="README_CN.md">🇨🇳 中文文档</a> •
  <a href="https://lyra-cutout.pages.dev/" target="_blank">🌟 Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage-guide">Usage Guide</a> •
  <a href="#license">License</a>
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
    <img src="https://img.shields.io/website?url=https%3A%2F%2Flyra-cutout.pages.dev%2F&up_message=online&down_message=offline&label=Live%20Demo&style=for-the-badge&logo=vercel&logoColor=white&color=success" alt="Live Demo">
  </a>
  <!-- Deploy Badge -->
  <a href="https://deploy.cloudflare.com/?url=https://github.com/petehsu/lyra-cutout" target="_blank">
    <img src="https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Deploy to Cloudflare Pages">
  </a>
</p>

---

## ⚠️ Disclaimer

**This project is for educational and learning purposes only. Commercial use is strictly prohibited.**

This tool leverages third-party AI services (Adobe Sensei, remove.bg). Please comply with the respective service terms and conditions. The author assumes no responsibility for any misuse or violation of third-party terms.

---

## ✨ Features

### 🎨 Core Tools
- **Smart Background Removal** - Adobe Express, remove.bg, Local rembg
- **Batch Cropping** - Professional aspect ratios, linked editing
- **AI Smart Crop** - TensorFlow.js subject detection, composition suggestions
- **Color Harmony Analyzer** - Extract palettes, harmony scoring

### 🛠️ Image Utilities
- **Image Stitcher** - Combine screenshots into long images
- **Privacy Mosaic** - Blur/pixelate sensitive areas
- **Batch Watermark** - Text/image watermarks with positioning
- **Image Compressor** - Reduce file size with quality control
- **Format Converter** - PNG/JPG/WebP conversion
- **Image Resizer** - Batch resize with aspect ratio lock
- **EXIF Viewer** - View and strip metadata
- **Before/After Slider** - Compare two images
- **Collage Maker** - Grid layouts (2x2, 3x3, etc.)
- **Steganography** - Hide secret messages in images with multi-factor authentication

### ⚡ Platform Highlights
- 🆓 **100% Free** - No API keys, no registration required
- 🔒 **Privacy-First** - All processing in browser, no uploads
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- ⚡ **Fast** - WebAssembly/WebGL accelerated AI

## ✂️ Batch Cropping Tool (New)

Lyra Cutout now features a powerful **Batch Cropping Module**, allowing you to process images locally without uploading:
- **Batch Management**: Import multiple images at once and manage them in a list.
- **Synced Adjustment**: Unique "Sync" feature—adjust one image's crop box (ratio/relative position), and all other images sync automatically. Perfect for e-commerce/ID photos.
- **Professional Presets**: Built-in 1:1, 4:3, 16:9, 2.35:1 (Cinematic), and more.
- **Privacy First**: Powered by browser Canvas technology, all cropping is done locally. Fast and data-saving.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/petehalverson/lyra-cutout.git
cd lyra-cutout

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 📖 Usage Guide

Lyra Cutout supports three background removal engines. Choose the one that best fits your needs:

### Option 1: Adobe Express (Recommended) ⭐

**Best for:** Free, high-quality results without any setup

1. Select **"⭐ Adobe (Free)"** mode
2. Upload your images (supports multiple selection)
3. Click **"🚀 Start Batch Processing"**
4. Download individual results or ZIP all

**Pros:**
- ✅ Completely free
- ✅ No API key required
- ✅ No registration needed
- ✅ High-quality Adobe Sensei AI
- ✅ Up to 10 concurrent processing

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ May have rate limits

---

### Option 2: remove.bg API

**Best for:** Professional use with paid API access

1. Get your API key from [remove.bg](https://www.remove.bg/api)
2. Select **"remove.bg"** mode
3. Enter your API key
4. Upload and process images

**Pros:**
- ✅ Consistent quality
- ✅ Full resolution output (with paid plan)
- ✅ Professional API support

**Cons:**
- ⚠️ Requires API key
- ⚠️ Free tier has limited credits
- ⚠️ API key exposed in browser (use backend proxy for production)

---

### Option 3: Local rembg Server

**Best for:** Offline processing, privacy-sensitive workflows, unlimited usage

This option requires setting up a local rembg server. Here's how:

#### Step 1: Install rembg

```bash
# Using pip
pip install rembg[gpu]  # For GPU support
# or
pip install rembg        # CPU only

# Using Docker (recommended)
docker pull danielgatis/rembg
```

#### Step 2: Start the Server

**Using Python:**

```bash
# Start rembg server on port 7000
rembg s --host 0.0.0.0 --port 7000
```

**Using Docker:**

```bash
docker run -d -p 7000:5000 danielgatis/rembg s
```

#### Step 3: Configure in Lyra Cutout

1. Select **"Local rembg"** mode
2. Enter server address: `http://localhost:7000` (or `/rembg` if using dev proxy)
3. Upload and process images

**Pros:**
- ✅ No internet required
- ✅ Complete privacy
- ✅ Unlimited processing
- ✅ No API keys needed

**Cons:**
- ⚠️ Requires local setup
- ⚠️ GPU recommended for speed
- ⚠️ Quality depends on model

#### Advanced: Using GPU Acceleration

For faster processing, use CUDA GPU:

```bash
# Install with ONNX GPU support
pip install rembg[gpu] onnxruntime-gpu

# Verify GPU detection
python -c "import onnxruntime; print(onnxruntime.get_device())"
```

---

## 🔬 Technical Implementation (Adobe Method)

A key feature of this project is the integration of the Adobe Express free background removal API via reverse engineering.

### 1. Anonymous Authentication (Guest Token)

Adobe Express allows guest usage. By analyzing network traffic, we identified an OAuth guest flow:
- **Endpoint**: `POST /ims/check/v6/token`
- **Params**: `guest_allowed=true`, `client_id=quickactions_hz_webapp`
- **Result**: Obtains a temporary `access_token`.

### 2. CORS & Request Forgery (Vite Proxy)

Direct browser calls to Adobe APIs fail due to CORS. The project uses Vite's proxy (`vite.config.js`) to:
- Forward frontend requests from `/adobe-api` to `https://sensei.adobe.io`.
- Inject necessary headers to spoof the origin:
  - `Origin: https://quick-actions.express.adobe.com`
  - `Referer: https://quick-actions.express.adobe.com/`

### 3. Sensei API Interaction

The Adobe Sensei API returns a **Mask** (black & white image) instead of a transparent PNG.
- **Request**: `multipart/form-data` with JSON config and the source image.
- **Response**: A multipart response containing the mask as a JPEG.

### 4. Client-Side Composition

The final transparent image is composited entirely in the browser using the Canvas API:
1. Draw original image to Canvas.
2. Fetch the Mask image pixel data.
3. Update the Alpha channel of the original image based on the Mask's grayscale values (Black = Transparent, White = Opaque).
4. Export as PNG Blob.

This approach leverages Adobe's powerful AI while keeping image processing client-side (via proxy), ensuring privacy and speed.

---

## 🔐 Steganography Technical Implementation

The steganography module implements a multi-layered security system for hiding secret messages within PNG images.

### 1. LSB (Least Significant Bit) Encoding

The core hiding technique uses LSB steganography:

```
Original Pixel:  RGB(150, 200, 100) = Binary: 10010110, 11001000, 01100100
Hidden Bit:      1
Modified Pixel:  RGB(151, 200, 100) = Binary: 10010111, 11001000, 01100100
                                              ^^^^^^^^ (1 bit changed)
```

- Only the **Red channel's least significant bit** is modified
- Human eye cannot detect a 1/256 color change
- Each pixel stores 1 bit; 8 pixels = 1 byte
- Capacity: ~10KB text per 1MP image

### 2. Data Structure

```
┌──────────────┬───────────┬──────────────┬─────────────┐
│  Magic (4B)  │ Flags (1B)│ Length (4B)  │  Payload    │
│    "LYRA"    │  0b00000  │   N bytes    │   N bytes   │
└──────────────┴───────────┴──────────────┴─────────────┘
```

**Authentication Flags (Bitmask):**
| Bit | Flag | Description |
|-----|------|-------------|
| 0 | `AUTH_PASSWORD` | AES-256-GCM encryption enabled |
| 1 | `AUTH_2FA` | TOTP verification required |
| 2 | `AUTH_FACE` | Face recognition required |

### 3. AES-256-GCM Encryption

When password protection is enabled:

```javascript
// Key Derivation (PBKDF2)
Salt: 16 random bytes
Iterations: 100,000
Hash: SHA-256
Output: 256-bit AES key

// Encryption
Algorithm: AES-256-GCM
IV: 12 random bytes
Auth Tag: 16 bytes (built into ciphertext)

// Stored Format:
[Salt 16B][IV 12B][Ciphertext + AuthTag]
```

**Security Properties:**
- ✅ Authenticated encryption (tamper detection)
- ✅ Unique key per encryption (random salt)
- ✅ Brute-force resistant (100K PBKDF2 iterations)

### 4. TOTP Two-Factor Authentication

Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.

```
TOTP Generation (RFC 6238):
1. Secret: 160-bit random → Base32 encoded (32 chars)
2. Time Step: floor(Unix_Time / 30)
3. HMAC: HMAC-SHA1(secret, time_step)
4. Truncation: Dynamic offset extraction
5. Output: 6-digit code (modulo 1,000,000)
```

**Verification Window:** ±30 seconds (allows 1 step drift)

**Data Storage:**
```
[Secret Length 1B][Base32 Secret ~32B][Encrypted Message]
```

### 5. Face Recognition Authentication

A lightweight client-side face verification using histogram-based features.

**Feature Extraction:**
```
Image (160×120 grayscale)
       ↓
Split into 4×4 = 16 regions
       ↓
Each region: 8-bin grayscale histogram
       ↓
Normalize to 0-255
       ↓
Output: 128-dimensional feature vector
```

**Comparison (Cosine Similarity):**
```
similarity = (A · B) / (||A|| × ||B||)

Threshold: 0.70 (70% similarity required)
```

**Security Notes:**
- 🔒 Face template stored encrypted within image
- 🔒 No cloud upload, all processing in browser
- ⚠️ Not as secure as professional face recognition
- ⚠️ Sensitive to lighting/angle changes

### 6. Combined Authentication Modes

All three factors can be combined:

| Mode | Security | Use Case |
|------|----------|----------|
| Password only | ⭐⭐ | Quick protection |
| 2FA only | ⭐⭐ | Mobile-based auth |
| Face only | ⭐⭐ | Biometric only |
| Password + 2FA | ⭐⭐⭐ | Standard 2FA |
| Password + Face | ⭐⭐⭐ | Biometric + password |
| 2FA + Face | ⭐⭐⭐ | Passwordless 2FA |
| All three | ⭐⭐⭐⭐ | Maximum security |

### 7. Decryption Flow

```
Read Magic Header → Validate "LYRA"
Read Flags → Determine required auth factors
Read Length → Extract payload

If PASSWORD flag:
  └→ Prompt for password → PBKDF2 → AES-GCM Decrypt

If 2FA flag:
  └→ Extract TOTP secret from payload
  └→ Prompt for 6-digit code → Verify TOTP

If FACE flag:
  └→ Extract face template from payload
  └→ Capture live face → Compare similarity

All verified → Display hidden message
```

---

## 🏗️ Project Structure

```
lyra-cutout/
├── src/
│   ├── App.jsx           # Main React component
│   ├── adobeService.js   # Adobe Sensei API integration
│   ├── theme.css         # Styling (notepad aesthetic)
│   ├── logo.svg          # App logo
│   └── main.jsx          # Entry point
├── assets/
│   ├── logo-light.svg    # Logo for dark mode
│   └── logo-dark.svg     # Logo for light mode
├── index.html            # HTML template
├── vite.config.js        # Vite configuration with proxies
└── package.json
```

---

## 🔧 Development

### Vite Proxy Configuration

The development server includes proxies for Adobe API and local rembg:

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

### Build for Production

```bash
npm run build
npm run preview
```

> ⚠️ **Note:** Production deployment requires a backend proxy to handle Adobe API requests, as CORS headers cannot be set from the browser.

---

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**.

### You are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:

- **Attribution** — You must give appropriate credit
- **NonCommercial** — You may not use the material for commercial purposes
- **ShareAlike** — If you remix, you must distribute under the same license

See [LICENSE](LICENSE) for the full license text.

---

## 🙏 Acknowledgments

- [Adobe Sensei](https://www.adobe.com/sensei.html) - AI background removal technology
- [remove.bg](https://www.remove.bg) - Professional background removal API
- [rembg](https://github.com/danielgatis/rembg) - Open source background removal tool
- [React](https://reactjs.org) & [Vite](https://vitejs.dev) - Frontend framework and build tool

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  Made with ❤️ for the open source community
</p>

<p align="center">
  <strong>⚠️ For Educational Use Only - Not for Commercial Use ⚠️</strong>
</p>
