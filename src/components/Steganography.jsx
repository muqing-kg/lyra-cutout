import React, { useState, useRef } from 'react';

/**
 * 图片隐写术 + AES-256-GCM 加密
 * - 在图片像素中隐藏文字
 * - 支持中文 (UTF-8)
 * - 可选 AES-256 加密（不可破解）
 */
const Steganography = () => {
    const [mode, setMode] = useState('encode'); // encode | decode
    const [image, setImage] = useState(null);
    const [message, setMessage] = useState('');
    const [decodedMessage, setDecodedMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);

    // 加密相关状态
    const [enableEncrypt, setEnableEncrypt] = useState(false);
    const [password, setPassword] = useState('');
    const [decryptPassword, setDecryptPassword] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);

    const canvasRef = useRef(null);

    // 魔数标记
    const MAGIC_PLAIN = [0x4C, 0x59, 0x52, 0x41]; // "LYRA" - 未加密
    const MAGIC_CRYPT = [0x4C, 0x59, 0x43, 0x52]; // "LYCR" - 已加密

    // ==================== 加密工具函数 ====================

    // 从密码派生 AES 密钥 (PBKDF2)
    const deriveKey = async (password, salt) => {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000, // 高迭代次数防暴力破解
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    };

    // AES-256-GCM 加密
    const encryptData = async (data, password) => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );

        // 返回: salt(16) + iv(12) + ciphertext
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        return result;
    };

    // AES-256-GCM 解密
    const decryptData = async (encryptedData, password) => {
        const salt = encryptedData.slice(0, 16);
        const iv = encryptedData.slice(16, 28);
        const ciphertext = encryptedData.slice(28);

        const key = await deriveKey(password, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        return new Uint8Array(decrypted);
    };

    // ==================== 编解码工具函数 ====================

    const stringToBytes = (str) => new TextEncoder().encode(str);
    const bytesToString = (bytes) => new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    const byteToBinary = (byte) => byte.toString(2).padStart(8, '0');

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImage({ url: URL.createObjectURL(file), name: file.name });
        setResult(null);
        setDecodedMessage('');
        setNeedsPassword(false);
        setDecryptPassword('');
    };

    // ==================== 编码（隐藏信息）====================
    const encodeMessage = async () => {
        if (!image || !message) return;
        if (enableEncrypt && !password) {
            alert('请输入加密密码');
            return;
        }

        setIsProcessing(true);

        try {
            const img = new Image();
            img.onload = async () => {
                const canvas = canvasRef.current;
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 将消息转换为字节
                let messageBytes = stringToBytes(message);

                // 如果启用加密，加密数据
                if (enableEncrypt) {
                    messageBytes = await encryptData(messageBytes, password);
                }

                // 选择魔数
                const magic = enableEncrypt ? MAGIC_CRYPT : MAGIC_PLAIN;

                // 构建数据包: [魔数 4字节] + [长度 4字节] + [消息/密文]
                const length = messageBytes.length;
                const lengthBytes = [
                    (length >> 24) & 0xFF,
                    (length >> 16) & 0xFF,
                    (length >> 8) & 0xFF,
                    length & 0xFF
                ];

                const allBytes = new Uint8Array([...magic, ...lengthBytes, ...messageBytes]);

                // 将字节转换为二进制位
                let binaryData = '';
                for (const byte of allBytes) {
                    binaryData += byteToBinary(byte);
                }

                // 检查图片容量
                const maxBits = Math.floor(data.length / 4);
                if (binaryData.length > maxBits) {
                    alert(`消息太长！当前图片最多可隐藏 ${Math.floor(maxBits / 8 - 8)} 字节`);
                    setIsProcessing(false);
                    return;
                }

                // 在每个像素的 R 通道最低位隐藏数据
                for (let i = 0; i < binaryData.length; i++) {
                    const bit = parseInt(binaryData[i]);
                    const pixelIndex = i * 4;
                    data[pixelIndex] = (data[pixelIndex] & 0xFE) | bit;
                }

                ctx.putImageData(imageData, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                setResult(dataUrl);
                setIsProcessing(false);
            };
            img.src = image.url;
        } catch (err) {
            alert('加密失败: ' + err.message);
            setIsProcessing(false);
        }
    };

    // ==================== 解码（提取信息）====================
    const decodeMessage = async () => {
        if (!image) return;
        setIsProcessing(true);

        try {
            const img = new Image();
            img.onload = async () => {
                const canvas = canvasRef.current;
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 提取二进制位
                const extractBits = (count) => {
                    let bits = '';
                    for (let i = 0; i < count && i * 4 < data.length; i++) {
                        bits += (data[i * 4] & 1).toString();
                    }
                    return bits;
                };

                const bitsToBytes = (bits) => {
                    const bytes = [];
                    for (let i = 0; i < bits.length; i += 8) {
                        bytes.push(parseInt(bits.substr(i, 8), 2));
                    }
                    return bytes;
                };

                // 读取头部 (8 字节 = 64 位)
                const headerBits = extractBits(64);
                const headerBytes = bitsToBytes(headerBits);
                const magic = headerBytes.slice(0, 4);

                // 检查是否为加密数据
                const isEncrypted = (
                    magic[0] === MAGIC_CRYPT[0] && magic[1] === MAGIC_CRYPT[1] &&
                    magic[2] === MAGIC_CRYPT[2] && magic[3] === MAGIC_CRYPT[3]
                );

                const isPlain = (
                    magic[0] === MAGIC_PLAIN[0] && magic[1] === MAGIC_PLAIN[1] &&
                    magic[2] === MAGIC_PLAIN[2] && magic[3] === MAGIC_PLAIN[3]
                );

                if (!isEncrypted && !isPlain) {
                    setDecodedMessage('❌ 未发现隐藏信息');
                    setNeedsPassword(false);
                    setIsProcessing(false);
                    return;
                }

                // 如果是加密数据且没有提供密码
                if (isEncrypted && !decryptPassword) {
                    setNeedsPassword(true);
                    setDecodedMessage('');
                    setIsProcessing(false);
                    return;
                }

                // 读取消息长度
                const length = (headerBytes[4] << 24) | (headerBytes[5] << 16) |
                    (headerBytes[6] << 8) | headerBytes[7];

                if (length <= 0 || length > 10000000) {
                    setDecodedMessage('❌ 数据损坏或无效');
                    setIsProcessing(false);
                    return;
                }

                // 读取消息内容
                const totalBits = (8 + length) * 8;
                const allBits = extractBits(totalBits);
                const allBytes = bitsToBytes(allBits);
                let messageBytes = new Uint8Array(allBytes.slice(8, 8 + length));

                // 如果是加密数据，解密
                if (isEncrypted) {
                    try {
                        messageBytes = await decryptData(messageBytes, decryptPassword);
                    } catch (e) {
                        setDecodedMessage('❌ 密码错误，解密失败');
                        setIsProcessing(false);
                        return;
                    }
                }

                const decoded = bytesToString(messageBytes);
                setDecodedMessage(decoded || '（空消息）');
                setNeedsPassword(false);
                setIsProcessing(false);
            };
            img.src = image.url;
        } catch (err) {
            setDecodedMessage('❌ 解码失败: ' + err.message);
            setIsProcessing(false);
        }
    };

    const downloadResult = () => {
        if (!result) return;
        const link = document.createElement('a');
        link.href = result;
        link.download = `hidden_${enableEncrypt ? 'encrypted_' : ''}${image.name}`;
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
                                onClick={() => { setMode('encode'); setResult(null); setDecodedMessage(''); setNeedsPassword(false); }}
                            >
                                🔒 隐藏信息
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
                                onClick={() => { setMode('decode'); setResult(null); setDecodedMessage(''); setNeedsPassword(false); }}
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
                        <>
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

                            <div className="field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={enableEncrypt}
                                        onChange={(e) => setEnableEncrypt(e.target.checked)}
                                    />
                                    <span className="field-label" style={{ margin: 0 }}>🔐 AES-256 加密</span>
                                </label>
                            </div>

                            {enableEncrypt && (
                                <div className="field">
                                    <span className="field-label">加密密码</span>
                                    <input
                                        type="password"
                                        className="input-field"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="输入加密密码..."
                                        style={{ width: 200 }}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {mode === 'decode' && needsPassword && (
                        <div className="field">
                            <span className="field-label">🔐 此图片已加密，请输入密码</span>
                            <input
                                type="password"
                                className="input-field"
                                value={decryptPassword}
                                onChange={(e) => setDecryptPassword(e.target.value)}
                                placeholder="输入解密密码..."
                                style={{ width: 200 }}
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
                        <div className="file-zone-text">图片隐写术 + AES-256 加密</div>
                        <div className="file-zone-hint">在图片像素中隐藏秘密信息，可选军事级加密</div>
                    </div>
                ) : (
                    <div className="stego-layout">
                        <div className="stego-preview">
                            <img src={result || image.url} alt="preview" />
                            {result && (
                                <div className="stego-badge" style={{ background: enableEncrypt ? '#dc2626' : '#22c55e' }}>
                                    {enableEncrypt ? '🔐 已加密隐藏' : '✓ 已隐藏信息'}
                                </div>
                            )}
                        </div>

                        {mode === 'decode' && decodedMessage && (
                            <div className="stego-result">
                                <h4>📝 提取到的信息：</h4>
                                <div className="stego-message">{decodedMessage}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {image && (
                <div className="actions" style={{ marginTop: 16 }}>
                    {mode === 'encode' ? (
                        <>
                            <button
                                className="btn-primary"
                                onClick={encodeMessage}
                                disabled={isProcessing || !message}
                            >
                                {isProcessing ? '处理中...' : enableEncrypt ? '🔐 加密并隐藏' : '🔒 隐藏信息'}
                            </button>
                            {result && (
                                <button className="btn-secondary" onClick={downloadResult} style={{ marginLeft: 8 }}>
                                    📥 下载图片
                                </button>
                            )}
                        </>
                    ) : (
                        <button className="btn-primary" onClick={decodeMessage} disabled={isProcessing}>
                            {isProcessing ? '解析中...' : needsPassword ? '🔓 解密提取' : '🔓 提取信息'}
                        </button>
                    )}
                </div>
            )}

            <div className="stego-info" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--ink-2)' }}>
                <p>💡 <strong>原理：</strong>在图片像素的最低有效位 (LSB) 中隐藏二进制数据。</p>
                <p>🔐 <strong>加密：</strong>AES-256-GCM + PBKDF2 (10万次迭代)，理论上不可破解。</p>
                <p>⚠️ <strong>注意：</strong>必须使用 PNG 格式保存，JPG 会破坏数据。</p>
            </div>
        </>
    );
};

export default Steganography;
