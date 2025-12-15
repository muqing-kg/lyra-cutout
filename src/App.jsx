import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { removeBackgroundWithAdobe } from './adobeService.js';
import BatchCrop from './components/BatchCrop';
import ColorAnalyzer from './components/ColorAnalyzer';
import SmartCrop from './components/SmartCrop';
import SmartRename from './components/SmartRename';
import ImageStitcher from './components/ImageStitcher';
import PrivacyMosaic from './components/PrivacyMosaic';
import Watermark from './components/Watermark';
import ImageCompressor from './components/ImageCompressor';
import FormatConverter from './components/FormatConverter';
import ImageResizer from './components/ImageResizer';
import ExifViewer from './components/ExifViewer';
import BeforeAfter from './components/BeforeAfter';
import Collage from './components/Collage';
import Steganography from './components/Steganography';
import logoSvg from './logo.svg';
import Lightbox from './components/Lightbox.jsx';

const BRAND = 'MuQing Image';
const BRAND_TAGLINE = '一站式智能图片处理平台';
const BACKENDS = {
  adobe: { key: 'adobe', label: 'Adobe Express（免费）' },
  removebg: { key: 'removebg', label: 'remove.bg 云端' },
};

function ensurePngName(name) {
  const dot = name.lastIndexOf('.');
  const base = dot >= 0 ? name.slice(0, dot) : name;
  return `${base}.png`;
}

function formatStatus(processing, files, doneCount) {
  if (processing) {
    return `处理中：${doneCount}/${files.length} 张`;
  }
  if (!files.length) return '就绪';
  if (doneCount === files.length && files.length > 0) return '完成';
  return '等待开始';
}

export default function App() {
  const [activeTab, setActiveTab] = useState('remove');
  const [apiKey, setApiKey] = useState('');
  const [backend, setBackend] = useState(BACKENDS.adobe.key);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [feather, setFeather] = useState(2);
  const [threshold, setThreshold] = useState(0.12);
  const [expand, setExpand] = useState(0);
  const PRESETS = [
    { name: '人像柔边', feather: 4, threshold: 0.12, expand: 2 },
    { name: '商品白底', feather: 1, threshold: 0.30, expand: -2 },
    { name: '发丝毛发', feather: 3, threshold: 0.08, expand: 4 },
    { name: 'Logo扁平', feather: 0, threshold: 0.40, expand: 0 },
    { name: '复杂纹理服饰', feather: 2, threshold: 0.18, expand: 3 },
    { name: '透明玻璃/瓶', feather: 2, threshold: 0.06, expand: 1 },
    { name: '纯色背景强切', feather: 1, threshold: 0.60, expand: -4 },
    { name: '高对比硬边', feather: 0, threshold: 0.50, expand: 0 },
  ];
  const applyPreset = (p) => {
    setFeather(p.feather);
    setThreshold(p.threshold);
    setExpand(p.expand);
  };
  const resetParams = () => {
    setFeather(0);
    setThreshold(0);
    setExpand(0);
  };

  const doneCount = useMemo(
    () => results.filter((r) => r.status === 'done').length,
    [results],
  );

  const statusText = useMemo(
    () => formatStatus(processing, files, doneCount),
    [processing, files, doneCount],
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerImages = useMemo(() => results.filter(r => r.url).map(r => r.url), [results]);
  const openViewer = (idx) => {
    const filteredIndex = results.slice(0, idx).filter(r => r.url).length;
    setViewerIndex(filteredIndex);
    setViewerOpen(true);
  };
  const filePreviews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  const removeFile = (idx) => {
    const removed = files[idx];
    // 释放预览 URL
    try { URL.revokeObjectURL(filePreviews[idx]); } catch {}
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setResults((prev) => prev.filter((r) => r.name !== removed.name));
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setResults(
      list.map((file) => ({
        name: file.name,
        status: 'pending',
        url: '',
        blob: null,
        error: '',
      })),
    );
  };

  // 并发控制：限制同时处理的最大数量
  const MAX_CONCURRENCY = 10;

  const start = async () => {
    if (!files.length) return;
    if (backend === BACKENDS.removebg.key && !apiKey.trim()) return;
    setProcessing(true);

    // 选择处理函数
    const processFunc = backend === BACKENDS.adobe.key
      ? processWithAdobe
      : (file) => processRemoveBg(file, apiKey.trim());

    // 并发处理：将文件分成多个批次
    const concurrency = Math.min(MAX_CONCURRENCY, files.length);
    const chunks = [];

    // 使用 Promise 池实现并发限制
    const processPool = async () => {
      const executing = new Set();

      for (const file of files) {
        const promise = processFunc(file).finally(() => {
          executing.delete(promise);
        });
        executing.add(promise);

        // 当达到最大并发数时，等待任意一个完成
        if (executing.size >= concurrency) {
          await Promise.race(executing);
        }
      }

      // 等待所有剩余的任务完成
      await Promise.all(executing);
    };

    await processPool();
    setProcessing(false);
  };

  // Adobe Express 处理
  const processWithAdobe = async (file) => {
    setResults((prev) =>
      prev.map((r) =>
        r.name === file.name ? { ...r, status: 'uploading', error: '' } : r,
      ),
    );

    try {
      const blob = await removeBackgroundWithAdobe(file, { threshold, feather, expand });
      const objectUrl = URL.createObjectURL(blob);
      setResults((prev) =>
        prev.map((r) =>
          r.name === file.name
            ? {
              ...r,
              status: 'done',
              url: objectUrl,
              blob,
              downloadName: ensurePngName(file.name),
            }
            : r,
        ),
      );
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.name === file.name
            ? { ...r, status: 'error', error: err.message || '处理失败' }
            : r,
        ),
      );
    }
  };

  const processRemoveBg = async (file, key) => {
    setResults((prev) =>
      prev.map((r) =>
        r.name === file.name ? { ...r, status: 'uploading', error: '' } : r,
      ),
    );

    const formData = new FormData();
    const url = 'https://api.remove.bg/v1.0/removebg';
    const headers = {};
    formData.append('image_file', file, file.name);
    headers['X-Api-Key'] = key;
    formData.append('size', 'full');
    formData.append('type', 'auto');

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (err) {
      setResults((prev) =>
        prev.map((r) =>
          r.name === file.name
            ? { ...r, status: 'error', error: `网络错误：${err.message}` }
            : r,
        ),
      );
      return;
    }

    if (!res.ok) {
      const msg = await safeText(res);
      setResults((prev) =>
        prev.map((r) =>
          r.name === file.name
            ? { ...r, status: 'error', error: `失败 (${res.status}): ${msg || '未知错误'}` }
            : r,
        ),
      );
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    setResults((prev) =>
      prev.map((r) =>
        r.name === file.name
          ? {
            ...r,
            status: 'done',
            url: objectUrl,
            blob,
            downloadName: ensurePngName(file.name),
          }
          : r,
      ),
    );
  };

  const canZipDownload = useMemo(
    () => results.some((r) => r.status === 'done'),
    [results],
  );

  const downloadAll = async () => {
    if (!canZipDownload) return;
    const zip = new JSZip();
    const doneItems = results.filter((r) => r.status === 'done' && r.blob);
    if (!doneItems.length) return;

    doneItems.forEach((item) => {
      zip.file(item.downloadName || ensurePngName(item.name), item.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'lyra-outputs.zip');
  };


  return (
    <div className="app-shell">
      <aside className="brand-panel">
        <div className="brand-hero">
          <div className="brand-logo">
            <img src={logoSvg} alt="MuQing Image Logo" />
          </div>
          <h2 className="brand-title">{BRAND}</h2>
          <p className="brand-tagline">
            {activeTab === 'remove' && <>{BRAND_TAGLINE}<br />批量移除图片背景</>}
            {activeTab === 'crop' && <>批量裁剪工具<br />统一比例，高效处理</>}
            {activeTab === 'color' && <>色彩和谐分析器<br />提取主色调</>}
            {activeTab === 'smartcrop' && <>AI 智能构图<br />自动识别主体</>}
            {activeTab === 'rename' && <>智能重命名<br />AI 识别内容</>}
            {activeTab === 'stitch' && <>长图拼接<br />截图拼接神器</>}
            {activeTab === 'mosaic' && <>隐私马赛克<br />保护敏感信息</>}
            {activeTab === 'watermark' && <>批量水印<br />版权保护利器</>}
            {activeTab === 'compress' && <>图片压缩<br />减小文件体积</>}
            {activeTab === 'convert' && <>格式转换<br />PNG/JPG/WebP</>}
            {activeTab === 'resize' && <>尺寸调整<br />批量缩放图片</>}
            {activeTab === 'exif' && <>EXIF 查看器<br />查看/清除元数据</>}
            {activeTab === 'compare' && <>图片对比<br />Before/After 滑块</>}
            {activeTab === 'collage' && <>拼贴画<br />九宫格/多布局</>}
            {activeTab === 'stego' && <>图片隐写术<br />隐藏秘密信息</>}
          </p>
        </div>
        <div className="brand-features">
          <div className="brand-feature"><span className="brand-feature-icon">🆓</span><span>完全免费</span></div>
          <div className="brand-feature"><span className="brand-feature-icon">🔒</span><span>本地处理</span></div>
          <div className="brand-feature"><span className="brand-feature-icon">📦</span><span>批量操作</span></div>
          <div className="brand-feature"><span className="brand-feature-icon">⚡</span><span>极速处理</span></div>
        </div>
      </aside>
      {/* 左侧：主功能区 */}
      <div className="main-content">
        {/* 页头 */}
        <div className="page-header">
          <h1 className="page-title">一站式智能图片处理平台</h1>
          
        </div>

        {/* Tab 导航 */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'remove' ? 'active' : ''}`} onClick={() => setActiveTab('remove')}>
            🎨 智能抠图
          </button>
          <button className={`tab-btn ${activeTab === 'crop' ? 'active' : ''}`} onClick={() => setActiveTab('crop')}>
            ✂️ 批量裁剪
          </button>
          <button className={`tab-btn ${activeTab === 'color' ? 'active' : ''}`} onClick={() => setActiveTab('color')}>
            🎨 色彩分析
          </button>
          <button className={`tab-btn ${activeTab === 'smartcrop' ? 'active' : ''}`} onClick={() => setActiveTab('smartcrop')}>
            📐 智能构图
          </button>
          <button className={`tab-btn ${activeTab === 'rename' ? 'active' : ''}`} onClick={() => setActiveTab('rename')}>
            📝 智能重命名
          </button>
          <button className={`tab-btn ${activeTab === 'stitch' ? 'active' : ''}`} onClick={() => setActiveTab('stitch')}>
            📸 长图拼接
          </button>
          <button className={`tab-btn ${activeTab === 'mosaic' ? 'active' : ''}`} onClick={() => setActiveTab('mosaic')}>
            🔲 隐私马赛克
          </button>
          <button className={`tab-btn ${activeTab === 'watermark' ? 'active' : ''}`} onClick={() => setActiveTab('watermark')}>
            💧 批量水印
          </button>
          <button className={`tab-btn ${activeTab === 'compress' ? 'active' : ''}`} onClick={() => setActiveTab('compress')}>
            📊 图片压缩
          </button>
          <button className={`tab-btn ${activeTab === 'convert' ? 'active' : ''}`} onClick={() => setActiveTab('convert')}>
            🔄 格式转换
          </button>
          <button className={`tab-btn ${activeTab === 'resize' ? 'active' : ''}`} onClick={() => setActiveTab('resize')}>
            📏 尺寸调整
          </button>
          <button className={`tab-btn ${activeTab === 'exif' ? 'active' : ''}`} onClick={() => setActiveTab('exif')}>
            🔍 EXIF查看
          </button>
          <button className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
            🎭 图片对比
          </button>
          <button className={`tab-btn ${activeTab === 'collage' ? 'active' : ''}`} onClick={() => setActiveTab('collage')}>
            🧩 拼贴画
          </button>
          <button className={`tab-btn ${activeTab === 'stego' ? 'active' : ''}`} onClick={() => setActiveTab('stego')}>
            🔐 图片隐写
          </button>
        </div>

        {/* 智能抠图模块 */}
        {activeTab === 'remove' && (
          <>
            {/* 控制面板 */}
            <div className="control-panel">
              <div className="control-section">
                {/* 模式选择 */}
                <div className="field">
                  <span className="field-label">处理引擎</span>
                  <div className="mode-selector">
                    <button
                      type="button"
                      className={`mode-btn ${backend === BACKENDS.adobe.key ? 'active' : ''}`}
                      onClick={() => setBackend(BACKENDS.adobe.key)}
                    >
                      ⭐ Adobe（免费）
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${backend === BACKENDS.removebg.key ? 'active' : ''}`}
                      onClick={() => setBackend(BACKENDS.removebg.key)}
                    >
                      remove.bg
                    </button>
                  </div>
                </div>

                {/* 模式提示/配置 */}
                <div className="control-row">
                  {backend === BACKENDS.adobe.key && (
                    <>
                      <div className="hint-card success">
                        <span className="hint-icon">✨</span>
                        <span>Adobe Sensei AI · 免费高质量 · 无需 API Key</span>
                      </div>
                      <div className="inline-controls">
                        <div className="field">
                          <span className="field-label">边缘羽化</span>
                          <input
                            type="range"
                            min="0"
                            max="12"
                            step="1"
                            value={feather}
                            onChange={(e) => setFeather(parseInt(e.target.value))}
                          />
                          <span>{feather}px</span>
                        </div>
                        <div className="field">
                          <span className="field-label">阈值</span>
                          <input
                            type="range"
                            min="0"
                            max="0.8"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                          />
                          <span>{Math.round(threshold * 100)}%</span>
                        </div>
                        <div className="field">
                          <span className="field-label">边缘扩展</span>
                          <input
                            type="range"
                            min="-30"
                            max="30"
                            step="1"
                            value={expand}
                            onChange={(e) => setExpand(parseInt(e.target.value))}
                          />
                          <span>{expand >= 0 ? `+${expand}px` : `${expand}px`}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={resetParams}
                        >
                          重置参数
                        </button>
                      </div>
                      <div className="field">
                        <span className="field-label">预设</span>
                        <div className="mode-selector">
                          {PRESETS.map((p) => (
                            <button
                              key={p.name}
                              type="button"
                              className="mode-btn"
                              onClick={() => applyPreset(p)}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {backend === BACKENDS.removebg.key && (
                    <div className="field">
                      <span className="field-label">API Key</span>
                      <input
                        id="apiKey"
                        type="password"
                        placeholder="输入 remove.bg API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  )}

                  
                </div>
              </div>
            </div>

            {/* 文件选择区 */}
            <div className="file-zone" onClick={() => document.getElementById('fileInput').click()}>
              <div className="file-zone-icon">📁</div>
              <div className="file-zone-text">点击选择图片或拖拽至此</div>
              <div className="file-zone-hint">支持 PNG、JPG、WebP 等格式，可多选</div>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* 已选文件列表 */}
            {files.length > 0 && (
              <div className="file-list">
                {files.map((f, idx) => (
                  <div className="file-card" key={`${f.name}-${idx}`}>
                    <img className="file-thumb" src={filePreviews[idx]} alt={f.name} />
                    <div className="file-meta">
                      <div className="file-name">{f.name}</div>
                      <button className="del-btn" onClick={() => removeFile(idx)} title="删除">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="action-bar">
              <button
                className="btn-primary"
                onClick={start}
                disabled={
                  processing ||
                  !files.length ||
                  (backend === BACKENDS.removebg.key && !apiKey.trim())
                }
              >
                {processing ? '⏳ 处理中…' : '🚀 开始批处理'}
              </button>
              <button
                className="btn-secondary"
                onClick={downloadAll}
                disabled={!canZipDownload}
              >
                📦 下载全部 ZIP
              </button>
              <div className={`status-badge ${processing ? 'processing' : doneCount === files.length && files.length > 0 ? 'done' : ''}`}>
                {statusText}
              </div>
            </div>

            {/* 结果网格 */}
            {results.length > 0 && (
              <div className="results-grid">
                {results.map((item, idx) => (
                  <ResultCard key={item.name} item={item} onPreview={() => openViewer(idx)} />
                ))}
              </div>
            )}

            {/* 提示区 */}
            <div className="tips-section">
              · 输出为 <strong>PNG 透明背景</strong>，文件名保持原名<br />
              · 最多 <strong>10 张并发</strong> 处理，高效快速<br />
              {backend === BACKENDS.adobe.key && (
                <>· Adobe Express 使用 <strong>Adobe Sensei AI</strong>，免费且高质量<br /></>
              )}
              {backend === BACKENDS.removebg.key && (
                <>· remove.bg 免费额度有限，付费可获原始分辨率<br /></>
              )}
            </div>
          </>
        )}

        {/* 批量裁剪模块 */}
        {activeTab === 'crop' && <BatchCrop />}

        {/* 色彩分析模块 */}
        {activeTab === 'color' && <ColorAnalyzer />}

        {/* 智能构图模块 */}
        {activeTab === 'smartcrop' && <SmartCrop />}

        {/* 智能重命名模块 */}
        {activeTab === 'rename' && <SmartRename />}

        {/* 长图拼接模块 */}
        {activeTab === 'stitch' && <ImageStitcher />}

        {/* 隐私马赛克模块 */}
        {activeTab === 'mosaic' && <PrivacyMosaic />}

        {/* 批量水印模块 */}
        {activeTab === 'watermark' && <Watermark />}

        {/* 图片压缩模块 */}
        {activeTab === 'compress' && <ImageCompressor />}

        {/* 格式转换模块 */}
        {activeTab === 'convert' && <FormatConverter />}

        {/* 尺寸调整模块 */}
        {activeTab === 'resize' && <ImageResizer />}

        {/* EXIF 查看模块 */}
        {activeTab === 'exif' && <ExifViewer />}

        {/* 图片对比模块 */}
        {activeTab === 'compare' && <BeforeAfter />}

        {/* 拼贴画模块 */}
        {activeTab === 'collage' && <Collage />}

        {/* 图片隐写模块 */}
        {activeTab === 'stego' && <Steganography />}
      </div>
      <Lightbox
        open={viewerOpen}
        images={viewerImages}
        index={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </div>
  );
}

function ResultCard({ item, onPreview }) {
  return (
    <div className="result-card">
      {item.url ? (
        <img className="result-thumb" src={item.url} alt={item.name} onClick={onPreview} />
      ) : (
        <div className="result-thumb-placeholder">
          {item.status === 'uploading'
            ? '⏳ 上传中…'
            : item.status === 'pending'
              ? '⏸️ 等待处理'
              : item.status === 'error'
                ? '❌ 处理失败'
                : '⚙️ 处理中…'}
        </div>
      )}
      <div className="result-info">
        <div className="result-name">{ensurePngName(item.name || '')}</div>
        {item.url && (
          <div className="result-actions">
            <a href={item.url} download={item.downloadName} className="result-btn">
              📥 下载
            </a>
          </div>
        )}
        {item.error && <div className="result-error">{item.error}</div>}
      </div>
    </div>
  );
}

async function safeText(res) {
  try {
    return await res.text();
  } catch (err) {
    return err.message || '';
  }
}
