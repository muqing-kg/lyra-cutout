import React, { useState, useRef } from 'react';

/**
 * 图片隐写术
 * - 在图片像素中隐藏文字
 * - 支持中文 (UTF-8)
 * - 可用于版权保护
 */
const Steganography = () => {
    const [mode, setMode] = useState('encode'); // encode | decode
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState('');
    const [decodedMessage, setDecodedMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const canvasRef = useRef(null);

    // 魔数标记：用于识别隐写数据的开始
    const MAGIC = [0x4C, 0x59, 0x52, 0x41]; // "LYRA"

    // 将 UTF-8 字符串转换为字节数组
    const stringToBytes = (str) => {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    };

    // 将字节数组转换为 UTF-8 字符串
    const bytesToString = (bytes) => {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(new Uint8Array(bytes));
    };

    // 将字节转换为 8 位二进制字符串
    const byteToBinary = (byte) => {
        return byte.toString(2).padStart(8, '0');
    };

    // 上传图片
    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImage({ url: URL.createObjectURL(file), name: file.name });
        setResult(null);
        setDecodedMessage('');
    };

    // 编码（隐藏信息）
    const encodeMessage = () => {
        if (!image || !message) return;
        setIsProcessing(true);

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // 将消息转换为字节
            const messageBytes = stringToBytes(message);

            // 构建数据包: [魔数 4字节] + [长度 4字节] + [消息内容]
            const length = messageBytes.length;
            const lengthBytes = [
                (length >> 24) & 0xFF,
                (length >> 16) & 0xFF,
                (length >> 8) & 0xFF,
                length & 0xFF
            ];

            const allBytes = [...MAGIC, ...lengthBytes, ...messageBytes];

            // 将字节转换为二进制位
            let binaryData = '';
            for (const byte of allBytes) {
                binaryData += byteToBinary(byte);
            }

            // 检查图片容量
            const maxBits = Math.floor(data.length / 4); // 每个像素用 R 通道 1 位
            if (binaryData.length > maxBits) {
                alert(`消息太长！当前图片最多可隐藏 ${Math.floor(maxBits / 8 - 8)} 字节`);
                setIsProcessing(false);
                return;
            }

            // 在每个像素的 R 通道最低位隐藏数据
            for (let i = 0; i < binaryData.length; i++) {
                const bit = parseInt(binaryData[i]);
                const pixelIndex = i * 4; // RGBA
                data[pixelIndex] = (data[pixelIndex] & 0xFE) | bit;
            }

            ctx.putImageData(imageData, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setResult(dataUrl);
            setIsProcessing(false);
        };
        img.src = image.url;
    };

    // 解码（提取信息）
    const decodeMessage = () => {
        if (!image) return;
        setIsProcessing(true);

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // 提取所有 R 通道的最低位
            const extractBits = (count) => {
                let bits = '';
                for (let i = 0; i < count && i * 4 < data.length; i++) {
                    bits += (data[i * 4] & 1).toString();
                }
                return bits;
            };

            // 将二进制位转换为字节数组
            const bitsToBytes = (bits) => {
                const bytes = [];
                for (let i = 0; i < bits.length; i += 8) {
                    bytes.push(parseInt(bits.substr(i, 8), 2));
                }
                return bytes;
            };

            // 读取魔数 + 长度 (8 字节 = 64 位)
            const headerBits = extractBits(64);
            const headerBytes = bitsToBytes(headerBits);

            // 验证魔数
            const magic = headerBytes.slice(0, 4);
            if (magic[0] !== MAGIC[0] || magic[1] !== MAGIC[1] ||
                magic[2] !== MAGIC[2] || magic[3] !== MAGIC[3]) {
                setDecodedMessage('❌ 未发现隐藏信息（魔数不匹配）');
                setIsProcessing(false);
                return;
            }

            // 读取消息长度
            const length = (headerBytes[4] << 24) | (headerBytes[5] << 16) |
                (headerBytes[6] << 8) | headerBytes[7];

            if (length <= 0 || length > 1000000) {
                setDecodedMessage('❌ 数据损坏或无效');
                setIsProcessing(false);
                return;
            }

            // 读取消息内容
            const totalBits = (8 + length) * 8; // 头部 + 消息
            const allBits = extractBits(totalBits);
            const allBytes = bitsToBytes(allBits);
            const messageBytes = allBytes.slice(8, 8 + length);

            try {
                const decoded = bytesToString(messageBytes);
                setDecodedMessage(decoded || '（空消息）');
            } catch (e) {
                setDecodedMessage('❌ 解码失败：' + e.message);
            }

            setIsProcessing(false);
        };
        img.src = image.url;
    };

    // 下载结果
    const downloadResult = () => {
        if (!result) return;
        const link = document.createElement('a');
        link.href = result;
        link.download = `hidden_${image.name}`;
        link.click();
    };

    return (
        <>
            {/* 控制面板 */}
            <div className="control-panel">
                <div className="control-section">
                    <div className="field">
                        <span className="field-label">模式</span>
                        <div className="mode-selector">
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'encode' ? 'active' : ''}`}
                                onClick={() => { setMode('encode'); setResult(null); setDecodedMessage(''); }}
                            >
                                🔒 隐藏信息
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
                                onClick={() => { setMode('decode'); setResult(null); setDecodedMessage(''); }}
                            >
                                🔓 提取信息
                            </button>
                        </div>
                    </div>

                    <div className="field">
                        <label className="btn-secondary" style={{ display: 'inline-block' }}>
                            选择图片
                            <input type="file" accept="image/png" onChange={handleUpload} hidden />
                        </label>
                        {image && <span style={{ marginLeft: 8, color: 'var(--ink-2)' }}>✓ {image.name}</span>}
                    </div>

                    {mode === 'encode' && (
                        <div className="field">
                            <span className="field-label">要隐藏的信息</span>
                            <textarea
                                className="input-field"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="输入要隐藏的文字..."
                                rows={3}
                                style={{ width: 300, resize: 'vertical' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="stego-content">
                {!image ? (
                    <div className="empty-state file-zone">
                        <div className="file-zone-icon">🔐</div>
                        <div className="file-zone-text">图片隐写术</div>
                        <div className="file-zone-hint">在图片像素中隐藏秘密信息（需使用 PNG 格式）</div>
                    </div>
                ) : (
                    <div className="stego-layout">
                        {/* 图片预览 */}
                        <div className="stego-preview">
                            <img src={result || image.url} alt="preview" />
                            {result && <div className="stego-badge">✓ 已隐藏信息</div>}
                        </div>

                        {/* 解码结果 */}
                        {mode === 'decode' && decodedMessage && (
                            <div className="stego-result">
                                <h4>📝 提取到的信息：</h4>
                                <div className="stego-message">{decodedMessage}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 隐藏画布 */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* 操作按钮 */}
            {image && (
                <div className="actions" style={{ marginTop: 16 }}>
                    {mode === 'encode' ? (
                        <>
                            <button
                                className="btn-primary"
                                onClick={encodeMessage}
                                disabled={isProcessing || !message}
                            >
                                {isProcessing ? '处理中...' : '🔒 隐藏信息'}
                            </button>
                            {result && (
                                <button className="btn-secondary" onClick={downloadResult} style={{ marginLeft: 8 }}>
                                    📥 下载图片
                                </button>
                            )}
                        </>
                    ) : (
                        <button className="btn-primary" onClick={decodeMessage} disabled={isProcessing}>
                            {isProcessing ? '解析中...' : '🔓 提取信息'}
                        </button>
                    )}
                </div>
            )}

            {/* 说明 */}
            <div className="stego-info" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--ink-2)' }}>
                <p>💡 <strong>原理：</strong>在图片像素的最低有效位 (LSB) 中隐藏二进制数据，肉眼完全看不出区别。</p>
                <p>⚠️ <strong>注意：</strong>必须使用 PNG 格式保存，JPG 压缩会破坏隐藏的信息。</p>
            </div>
        </>
    );
};

export default Steganography;
