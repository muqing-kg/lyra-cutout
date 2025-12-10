import React, { useState, useRef, useCallback } from 'react';

/**
 * 色彩和谐分析器
 * - 提取图片主色调
 * - 色轮可视化
 * - 配色和谐度分析
 * - 调色板导出
 */
const ColorAnalyzer = () => {
    const [image, setImage] = useState(null);
    const [colors, setColors] = useState([]);
    const [harmony, setHarmony] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const canvasRef = useRef(null);

    // 上传图片
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImage({ file, url });
        setColors([]);
        setHarmony(null);
    };

    // 分析颜色
    const analyzeColors = useCallback(async () => {
        if (!image) return;
        setIsAnalyzing(true);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // 缩小尺寸以提高性能
            const maxSize = 200;
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 获取像素数据
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            // 使用颜色量化提取主色调 (简化的 Median Cut 算法)
            const extractedColors = extractDominantColors(pixels, 6);
            setColors(extractedColors);

            // 分析配色和谐性
            const harmonyResult = analyzeHarmony(extractedColors);
            setHarmony(harmonyResult);
            setIsAnalyzing(false);
        };
        img.src = image.url;
    }, [image]);

    // 颜色量化 - 提取主色调
    const extractDominantColors = (pixels, numColors) => {
        const colorMap = new Map();

        // 统计颜色（量化到较小的色彩空间）
        for (let i = 0; i < pixels.length; i += 4) {
            const r = Math.round(pixels[i] / 32) * 32;
            const g = Math.round(pixels[i + 1] / 32) * 32;
            const b = Math.round(pixels[i + 2] / 32) * 32;
            const key = `${r},${g},${b}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }

        // 排序并取前 N 个
        const sorted = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, numColors);

        return sorted.map(([key, count]) => {
            const [r, g, b] = key.split(',').map(Number);
            const hex = rgbToHex(r, g, b);
            const hsl = rgbToHsl(r, g, b);
            return { r, g, b, hex, hsl, count };
        });
    };

    // 分析配色和谐性
    const analyzeHarmony = (colors) => {
        if (colors.length < 2) return { type: 'unknown', score: 0 };

        const hues = colors.map(c => c.hsl.h);
        const avgSaturation = colors.reduce((sum, c) => sum + c.hsl.s, 0) / colors.length;
        const avgLightness = colors.reduce((sum, c) => sum + c.hsl.l, 0) / colors.length;

        // 计算色相差异
        const hueDiffs = [];
        for (let i = 0; i < hues.length; i++) {
            for (let j = i + 1; j < hues.length; j++) {
                let diff = Math.abs(hues[i] - hues[j]);
                if (diff > 180) diff = 360 - diff;
                hueDiffs.push(diff);
            }
        }

        const avgHueDiff = hueDiffs.reduce((a, b) => a + b, 0) / hueDiffs.length;
        const maxHueDiff = Math.max(...hueDiffs);

        // 判断和谐类型
        let type = 'custom';
        let score = 50;
        let description = '';

        if (maxHueDiff < 30) {
            type = 'analogous';
            score = 85;
            description = '类似色配色 - 柔和统一，视觉舒适';
        } else if (hueDiffs.some(d => d >= 150 && d <= 180)) {
            type = 'complementary';
            score = 80;
            description = '互补色配色 - 对比强烈，视觉冲击力强';
        } else if (hueDiffs.some(d => d >= 110 && d <= 130)) {
            type = 'triadic';
            score = 75;
            description = '三角配色 - 丰富多彩，活泼生动';
        } else if (avgHueDiff < 60) {
            type = 'warm' in colors.some(c => c.hsl.h < 60 || c.hsl.h > 300) ? 'warm' : 'cool';
            score = 70;
            description = type === 'warm' ? '暖色调为主' : '冷色调为主';
        } else {
            type = 'mixed';
            score = 60;
            description = '混合配色 - 建议精简色彩数量';
        }

        // 根据饱和度和明度调整分数
        if (avgSaturation < 0.2) {
            score -= 5;
            description += '，饱和度较低';
        }
        if (avgLightness < 0.2 || avgLightness > 0.8) {
            score -= 5;
            description += '，明度分布不均';
        }

        return { type, score, description, avgHueDiff, avgSaturation, avgLightness };
    };

    // RGB 转 Hex
    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    };

    // RGB 转 HSL
    const rgbToHsl = (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100) / 100, l: Math.round(l * 100) / 100 };
    };

    // 复制颜色到剪贴板
    const copyColor = (hex) => {
        navigator.clipboard.writeText(hex);
    };

    // 导出调色板
    const exportPalette = () => {
        const text = colors.map(c => `${c.hex} | RGB(${c.r}, ${c.g}, ${c.b}) | HSL(${c.hsl.h}°, ${Math.round(c.hsl.s * 100)}%, ${Math.round(c.hsl.l * 100)}%)`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lyra_palette.txt';
        a.click();
    };

    return (
        <>
            {/* 控制面板 */}
            <div className="control-panel">
                <div className="control-section">
                    <div className="field">
                        <span className="field-label">上传图片</span>
                        <label className="btn-secondary" style={{ display: 'inline-block' }}>
                            选择图片
                            <input type="file" accept="image/*" onChange={handleUpload} hidden />
                        </label>
                    </div>
                    {image && (
                        <div className="field">
                            <button
                                className="btn-primary"
                                onClick={analyzeColors}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? '分析中...' : '🎨 分析色彩'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="analyzer-content">
                {/* 左侧：图片预览 */}
                <div className="analyzer-preview">
                    {image ? (
                        <img src={image.url} alt="preview" className="preview-image" />
                    ) : (
                        <div className="empty-state file-zone">
                            <div className="file-zone-icon">🎨</div>
                            <div className="file-zone-text">色彩和谐分析</div>
                            <div className="file-zone-hint">上传图片，分析配色方案</div>
                        </div>
                    )}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>

                {/* 右侧：分析结果 */}
                {colors.length > 0 && (
                    <div className="analyzer-results">
                        {/* 和谐度评分 */}
                        {harmony && (
                            <div className="harmony-card">
                                <div className="harmony-score">
                                    <span className="score-value">{harmony.score}</span>
                                    <span className="score-label">和谐度</span>
                                </div>
                                <div className="harmony-info">
                                    <div className="harmony-type">{harmony.type}</div>
                                    <div className="harmony-desc">{harmony.description}</div>
                                </div>
                            </div>
                        )}

                        {/* 主色调 */}
                        <div className="palette-section">
                            <h4>主色调</h4>
                            <div className="color-palette">
                                {colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="color-swatch"
                                        style={{ backgroundColor: c.hex }}
                                        onClick={() => copyColor(c.hex)}
                                        title={`点击复制 ${c.hex}`}
                                    >
                                        <span className="swatch-label">{c.hex}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 色彩详情 */}
                        <div className="color-details">
                            <h4>色彩详情</h4>
                            <table className="color-table">
                                <thead>
                                    <tr>
                                        <th>颜色</th>
                                        <th>Hex</th>
                                        <th>HSL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {colors.map((c, i) => (
                                        <tr key={i}>
                                            <td>
                                                <span
                                                    className="color-dot"
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            </td>
                                            <td>{c.hex}</td>
                                            <td>{c.hsl.h}°, {Math.round(c.hsl.s * 100)}%, {Math.round(c.hsl.l * 100)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 导出按钮 */}
                        <button className="btn-secondary" onClick={exportPalette} style={{ marginTop: 16 }}>
                            📤 导出调色板
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default ColorAnalyzer;
