import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * 批量智能重命名
 * - 使用 MobileNet 识别图片内容
 * - 自动生成有意义的文件名
 * - 批量下载
 */
const SmartRename = () => {
    const [images, setImages] = useState([]); // { id, file, url, predictions, newName, status }
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [prefix, setPrefix] = useState('');
    const imageRefs = useRef({});

    // 加载模型
    useEffect(() => {
        const loadModel = async () => {
            setIsLoading(true);
            try {
                await tf.ready();
                const loadedModel = await mobilenet.load();
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
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const newImages = files.map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            url: URL.createObjectURL(file),
            originalName: file.name,
            predictions: null,
            newName: null,
            status: 'pending'
        }));

        setImages((prev) => [...prev, ...newImages]);
    };

    // 分类单张图片
    const classifyImage = async (imgElement) => {
        if (!model) return null;
        const predictions = await model.classify(imgElement);
        return predictions;
    };

    // 生成文件名
    const generateFileName = (predictions, originalName, index) => {
        if (!predictions || predictions.length === 0) {
            return `image_${index + 1}`;
        }

        // 取最高置信度的类别
        const topPrediction = predictions[0];
        let label = topPrediction.className.toLowerCase();

        // 清理标签（去除逗号、空格等）
        label = label.split(',')[0].trim().replace(/\s+/g, '_');

        // 获取文件扩展名
        const ext = originalName.split('.').pop();

        // 添加前缀和序号
        const prefixStr = prefix ? `${prefix}_` : '';
        return `${prefixStr}${label}_${index + 1}.${ext}`;
    };

    // 批量处理
    const processAll = async () => {
        if (!model) return;
        setIsProcessing(true);

        const updatedImages = [...images];

        for (let i = 0; i < updatedImages.length; i++) {
            const img = updatedImages[i];
            if (img.status === 'done') continue;

            // 更新状态为处理中
            updatedImages[i] = { ...img, status: 'processing' };
            setImages([...updatedImages]);

            try {
                // 等待图片加载
                const imgElement = imageRefs.current[img.id];
                if (imgElement) {
                    const predictions = await classifyImage(imgElement);
                    const newName = generateFileName(predictions, img.originalName, i);

                    updatedImages[i] = {
                        ...img,
                        predictions,
                        newName,
                        status: 'done'
                    };
                }
            } catch (err) {
                console.error('处理失败:', err);
                updatedImages[i] = { ...img, status: 'error' };
            }

            setImages([...updatedImages]);
        }

        setIsProcessing(false);
    };

    // 下载单张
    const downloadSingle = (img) => {
        const a = document.createElement('a');
        a.href = img.url;
        a.download = img.newName || img.originalName;
        a.click();
    };

    // 批量下载
    const downloadAll = async () => {
        const zip = new JSZip();
        const folder = zip.folder('renamed_images');

        for (const img of images) {
            if (!img.newName) continue;

            const response = await fetch(img.url);
            const blob = await response.blob();
            folder.file(img.newName, blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'smart_renamed_images.zip');
    };

    // 删除图片
    const handleDelete = (id) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
    };

    // 清空所有
    const clearAll = () => {
        setImages([]);
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
                            + 添加图片
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleUpload}
                                hidden
                                disabled={isLoading}
                            />
                        </label>
                    </div>

                    <div className="field">
                        <span className="field-label">文件名前缀（可选）</span>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="例如: project_a"
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value)}
                            style={{ width: 150 }}
                        />
                    </div>

                    {images.length > 0 && (
                        <div className="field" style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn-primary"
                                onClick={processAll}
                                disabled={!model || isProcessing}
                            >
                                {isProcessing ? '处理中...' : '🧠 智能识别'}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={clearAll}
                                disabled={isProcessing}
                            >
                                清空
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="rename-content">
                {images.length === 0 ? (
                    <div className="empty-state file-zone" onClick={() => document.getElementById('smartRenameInput').click()}>
                        <div className="file-zone-icon">📝</div>
                        <div className="file-zone-text">批量智能重命名</div>
                        <div className="file-zone-hint">
                            {isLoading ? '正在加载 AI 模型...' : 'AI 识别图片内容，自动生成文件名'}
                        </div>
                        <input id="smartRenameInput" type="file" accept="image/*" multiple onChange={handleUpload} hidden />
                    </div>
                ) : (
                    <>
                        {/* 图片列表 */}
                        <div className="rename-list">
                            <table className="rename-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 80 }}>预览</th>
                                        <th>原文件名</th>
                                        <th>→</th>
                                        <th>新文件名</th>
                                        <th>识别结果</th>
                                        <th style={{ width: 80 }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {images.map((img) => (
                                        <tr key={img.id}>
                                            <td>
                                                <img
                                                    ref={(el) => imageRefs.current[img.id] = el}
                                                    src={img.url}
                                                    alt="thumb"
                                                    className="rename-thumb"
                                                    crossOrigin="anonymous"
                                                />
                                            </td>
                                            <td className="filename-cell">{img.originalName}</td>
                                            <td>
                                                {img.status === 'processing' && '⏳'}
                                                {img.status === 'done' && '→'}
                                                {img.status === 'error' && '❌'}
                                            </td>
                                            <td className="filename-cell new-name">
                                                {img.newName || '-'}
                                            </td>
                                            <td className="prediction-cell">
                                                {img.predictions?.slice(0, 2).map((p, i) => (
                                                    <span key={i} className="prediction-tag">
                                                        {p.className.split(',')[0]} ({Math.round(p.probability * 100)}%)
                                                    </span>
                                                ))}
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    {img.newName && (
                                                        <button
                                                            className="icon-btn"
                                                            onClick={() => downloadSingle(img)}
                                                            title="下载"
                                                        >
                                                            📥
                                                        </button>
                                                    )}
                                                    <button
                                                        className="icon-btn delete"
                                                        onClick={() => handleDelete(img.id)}
                                                        title="删除"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 底部操作栏 */}
                        {images.some(img => img.newName) && (
                            <div className="actions" style={{ marginTop: 16 }}>
                                <button className="btn-primary" onClick={downloadAll}>
                                    📦 打包下载全部 ({images.filter(i => i.newName).length} 张)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default SmartRename;
