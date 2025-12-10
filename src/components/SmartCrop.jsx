import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

/**
 * 智能构图裁剪
 * - 使用 COCO-SSD 检测图片主体
 * - 自动应用三分法/黄金分割裁剪
 * - 输出多个候选构图
 */
const SmartCrop = () => {
    const [image, setImage] = useState(null);
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detections, setDetections] = useState([]);
    const [cropSuggestions, setCropSuggestions] = useState([]);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    // 加载模型
    useEffect(() => {
        const loadModel = async () => {
            setIsLoading(true);
            try {
                await tf.ready();
                const loadedModel = await cocoSsd.load();
                setModel(loadedModel);
            } catch (err) {
                console.error('模型加载失败:', err);
            }
            setIsLoading(false);
        };
        loadModel();
    }, []);

    // 上传图片
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setImage({ file, url, name: file.name });
        setDetections([]);
        setCropSuggestions([]);
        setSelectedCrop(null);
    };

    // 检测主体
    const detectObjects = async () => {
        if (!model || !imageRef.current) return;

        setIsAnalyzing(true);
        try {
            const predictions = await model.detect(imageRef.current);
            setDetections(predictions);

            // 生成裁剪建议
            const suggestions = generateCropSuggestions(
                imageRef.current.naturalWidth,
                imageRef.current.naturalHeight,
                predictions
            );
            setCropSuggestions(suggestions);

            if (suggestions.length > 0) {
                setSelectedCrop(suggestions[0]);
            }
        } catch (err) {
            console.error('检测失败:', err);
        }
        setIsAnalyzing(false);
    };

    // 生成裁剪建议
    const generateCropSuggestions = (imgWidth, imgHeight, predictions) => {
        const suggestions = [];
        const GOLDEN_RATIO = 1.618;

        // 找到主要主体
        const mainSubject = predictions.length > 0
            ? predictions.reduce((a, b) => a.score > b.score ? a : b)
            : null;

        // 获取主体中心点
        let subjectCenter = { x: imgWidth / 2, y: imgHeight / 2 };
        if (mainSubject) {
            subjectCenter = {
                x: mainSubject.bbox[0] + mainSubject.bbox[2] / 2,
                y: mainSubject.bbox[1] + mainSubject.bbox[3] / 2
            };
        }

        // 1. 三分法裁剪（1:1）
        const thirdSize = Math.min(imgWidth, imgHeight) * 0.8;
        suggestions.push({
            name: '三分法 (1:1)',
            ratio: '1:1',
            x: Math.max(0, Math.min(imgWidth - thirdSize, subjectCenter.x - thirdSize * 0.33)),
            y: Math.max(0, Math.min(imgHeight - thirdSize, subjectCenter.y - thirdSize * 0.33)),
            width: thirdSize,
            height: thirdSize,
            description: '主体位于三分线交点'
        });

        // 2. 黄金分割横向 (16:9)
        const goldenWidth = imgWidth * 0.9;
        const goldenHeight = goldenWidth / (16 / 9);
        if (goldenHeight <= imgHeight) {
            suggestions.push({
                name: '黄金分割 (16:9)',
                ratio: '16:9',
                x: Math.max(0, Math.min(imgWidth - goldenWidth, subjectCenter.x - goldenWidth / GOLDEN_RATIO)),
                y: Math.max(0, Math.min(imgHeight - goldenHeight, subjectCenter.y - goldenHeight / 2)),
                width: goldenWidth,
                height: goldenHeight,
                description: '主体位于黄金分割点'
            });
        }

        // 3. 居中裁剪 (4:3)
        const centerWidth = imgWidth * 0.85;
        const centerHeight = centerWidth / (4 / 3);
        if (centerHeight <= imgHeight) {
            suggestions.push({
                name: '居中 (4:3)',
                ratio: '4:3',
                x: (imgWidth - centerWidth) / 2,
                y: Math.max(0, Math.min(imgHeight - centerHeight, subjectCenter.y - centerHeight / 2)),
                width: centerWidth,
                height: centerHeight,
                description: '主体居中构图'
            });
        }

        // 4. 竖版 (9:16) - 适合手机
        const verticalHeight = imgHeight * 0.9;
        const verticalWidth = verticalHeight * (9 / 16);
        if (verticalWidth <= imgWidth) {
            suggestions.push({
                name: '竖版 (9:16)',
                ratio: '9:16',
                x: Math.max(0, Math.min(imgWidth - verticalWidth, subjectCenter.x - verticalWidth / 2)),
                y: (imgHeight - verticalHeight) / 2,
                width: verticalWidth,
                height: verticalHeight,
                description: '适合手机壁纸/短视频'
            });
        }

        // 5. 自由裁剪 - 基于主体边界
        if (mainSubject) {
            const padding = 50;
            const subjectCrop = {
                name: '主体特写',
                ratio: 'auto',
                x: Math.max(0, mainSubject.bbox[0] - padding),
                y: Math.max(0, mainSubject.bbox[1] - padding),
                width: Math.min(imgWidth - mainSubject.bbox[0] + padding, mainSubject.bbox[2] + padding * 2),
                height: Math.min(imgHeight - mainSubject.bbox[1] + padding, mainSubject.bbox[3] + padding * 2),
                description: `聚焦 ${mainSubject.class}`
            };
            suggestions.push(subjectCrop);
        }

        return suggestions;
    };

    // 绘制预览
    useEffect(() => {
        if (!imageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;

        // 设置 canvas 尺寸
        const displayWidth = 500;
        const scale = displayWidth / img.naturalWidth;
        canvas.width = displayWidth;
        canvas.height = img.naturalHeight * scale;

        // 绘制图片
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 绘制检测框
        detections.forEach(det => {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                det.bbox[0] * scale,
                det.bbox[1] * scale,
                det.bbox[2] * scale,
                det.bbox[3] * scale
            );
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px sans-serif';
            ctx.fillText(
                `${det.class} (${Math.round(det.score * 100)}%)`,
                det.bbox[0] * scale,
                det.bbox[1] * scale - 5
            );
        });

        // 绘制选中的裁剪框
        if (selectedCrop) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                selectedCrop.x * scale,
                selectedCrop.y * scale,
                selectedCrop.width * scale,
                selectedCrop.height * scale
            );
            ctx.setLineDash([]);
        }
    }, [detections, selectedCrop, image]);

    // 下载裁剪后的图片
    const downloadCrop = () => {
        if (!selectedCrop || !imageRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = selectedCrop.width;
        canvas.height = selectedCrop.height;

        ctx.drawImage(
            imageRef.current,
            selectedCrop.x, selectedCrop.y, selectedCrop.width, selectedCrop.height,
            0, 0, selectedCrop.width, selectedCrop.height
        );

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smartcrop_${image.name}`;
            a.click();
        }, 'image/png');
    };

    return (
        <>
            {/* 控制面板 */}
            <div className="control-panel">
                <div className="control-section">
                    <div className="field">
                        <span className="field-label">
                            {isLoading ? '⏳ 加载模型中...' : '✅ 模型就绪'}
                        </span>
                        <label className="btn-secondary" style={{ display: 'inline-block' }}>
                            选择图片
                            <input type="file" accept="image/*" onChange={handleUpload} hidden disabled={isLoading} />
                        </label>
                    </div>
                    {image && (
                        <div className="field">
                            <button
                                className="btn-primary"
                                onClick={detectObjects}
                                disabled={!model || isAnalyzing}
                            >
                                {isAnalyzing ? '检测中...' : '🔍 智能分析'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="smart-crop-content">
                {/* 左侧：图片预览和检测结果 */}
                <div className="crop-preview-area">
                    {image ? (
                        <>
                            <img
                                ref={imageRef}
                                src={image.url}
                                alt="preview"
                                style={{ display: 'none' }}
                                onLoad={() => {
                                    // 触发 canvas 重绘
                                    setDetections([...detections]);
                                }}
                            />
                            <canvas ref={canvasRef} className="preview-canvas" />
                        </>
                    ) : (
                        <div className="empty-state file-zone">
                            <div className="file-zone-icon">📐</div>
                            <div className="file-zone-text">智能构图裁剪</div>
                            <div className="file-zone-hint">
                                {isLoading ? '正在加载 AI 模型...' : 'AI 自动识别主体，推荐最佳构图'}
                            </div>
                        </div>
                    )}
                </div>

                {/* 右侧：裁剪建议 */}
                {cropSuggestions.length > 0 && (
                    <div className="crop-suggestions">
                        <h4>推荐构图</h4>
                        <div className="suggestion-list">
                            {cropSuggestions.map((crop, i) => (
                                <div
                                    key={i}
                                    className={`suggestion-item ${selectedCrop === crop ? 'active' : ''}`}
                                    onClick={() => setSelectedCrop(crop)}
                                >
                                    <div className="suggestion-name">{crop.name}</div>
                                    <div className="suggestion-desc">{crop.description}</div>
                                </div>
                            ))}
                        </div>

                        {selectedCrop && (
                            <button className="btn-primary" onClick={downloadCrop} style={{ marginTop: 16 }}>
                                📥 下载此裁剪
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default SmartCrop;
