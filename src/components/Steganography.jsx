import React, { useState, useRef } from 'react';

/**
 * 图片隐写术 + AES-256-GCM 加密 + TOTP 2FA
 * - 在图片像素中隐藏文字
 * - 支持中文 (UTF-8)
 * - 可选 AES-256 加密 + 2FA 验证
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
    const [enable2FA, setEnable2FA] = useState(false);
    const [password, setPassword] = useState('');
    const [decryptPassword, setDecryptPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);

    // 2FA 设置显示
    const [totpSecret, setTotpSecret] = useState('');
    const [showSetup, setShowSetup] = useState(false);

    const canvasRef = useRef(null);

    // 魔数标记
    const MAGIC_PLAIN = [0x4C, 0x59, 0x52, 0x41]; // "LYRA" - 未加密
    const MAGIC_CRYPT = [0x4C, 0x59, 0x43, 0x52]; // "LYCR" - 加密无2FA
    const MAGIC_2FA = [0x4C, 0x59, 0x32, 0x46]; // "LY2F" - 加密+2FA

    // ==================== TOTP 实现 ====================

    // Base32 编解码
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    const base32Encode = (buffer) => {
        let bits = '';
        for (const byte of buffer) {
            bits += byte.toString(2).padStart(8, '0');
        }
        let result = '';
        for (let i = 0; i < bits.length; i += 5) {
            const chunk = bits.substr(i, 5).padEnd(5, '0');
            result += base32Chars[parseInt(chunk, 2)];
        }
        return result;
    };

    const base32Decode = (str) => {
        let bits = '';
        for (const char of str.toUpperCase()) {
            const idx = base32Chars.indexOf(char);
            if (idx === -1) continue;
            bits += idx.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        return new Uint8Array(bytes);
    };

    // 生成随机 TOTP 密钥 (20 bytes = 160 bits)
    const generateTotpSecret = () => {
        const bytes = crypto.getRandomValues(new Uint8Array(20));
        return base32Encode(bytes);
    };

    // HMAC-SHA1 实现 (用于 TOTP)
    const hmacSha1 = async (key, message) => {
        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, message);
        return new Uint8Array(sig);
    };

    // 生成 TOTP 验证码
    const generateTotp = async (secret, timeStep = 30) => {
        const key = base32Decode(secret);
        const time = Math.floor(Date.now() / 1000 / timeStep);

        // 将时间转为 8 字节大端序
        const timeBytes = new Uint8Array(8);
        let t = time;
        for (let i = 7; i >= 0; i--) {
            timeBytes[i] = t & 0xff;
            t = Math.floor(t / 256);
        }

        const hmac = await hmacSha1(key, timeBytes);

        // 动态截断
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code = (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        ) % 1000000;

        return code.toString().padStart(6, '0');
    };

    // 验证 TOTP 码 (允许前后各一个时间窗口)
    const verifyTotp = async (secret, code) => {
        for (let i = -1; i <= 1; i++) {
            const timeStep = 30;
            const time = Math.floor(Date.now() / 1000 / timeStep) + i;

            const key = base32Decode(secret);
            const timeBytes = new Uint8Array(8);
            let t = time;
            for (let j = 7; j >= 0; j--) {
                timeBytes[j] = t & 0xff;
                t = Math.floor(t / 256);
            }

            const hmac = await hmacSha1(key, timeBytes);
            const offset = hmac[hmac.length - 1] & 0x0f;
            const expected = (
                ((hmac[offset] & 0x7f) << 24) |
                ((hmac[offset + 1] & 0xff) << 16) |
                ((hmac[offset + 2] & 0xff) << 8) |
                (hmac[offset + 3] & 0xff)
            ) % 1000000;

            if (code === expected.toString().padStart(6, '0')) {
                return true;
            }
        }
        return false;
    };

    // ==================== 加密工具函数 ====================

    const deriveKey = async (password, salt) => {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    };

    const encryptData = async (data, password) => {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        return result;
    };

    const decryptData = async (encryptedData, password) => {
        const salt = encryptedData.slice(0, 16);
        const iv = encryptedData.slice(16, 28);
        const ciphertext = encryptedData.slice(28);
        const key = await deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
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
        setNeeds2FA(false);
        setDecryptPassword('');
        setTotpCode('');
    };

    // ==================== 编码 ====================
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

                let messageBytes = stringToBytes(message);
                let magic = MAGIC_PLAIN;

                if (enableEncrypt) {
                    let dataToEncrypt;

                    if (enable2FA) {
                        // 生成 TOTP 密钥并存储在数据中
                        const secret = generateTotpSecret();
                        setTotpSecret(secret);
                        setShowSetup(true);

                        // 数据格式: [secret长度 1字节] + [secret] + [消息]
                        const secretBytes = stringToBytes(secret);
                        dataToEncrypt = new Uint8Array(1 + secretBytes.length + messageBytes.length);
                        dataToEncrypt[0] = secretBytes.length;
                        dataToEncrypt.set(secretBytes, 1);
                        dataToEncrypt.set(messageBytes, 1 + secretBytes.length);

                        magic = MAGIC_2FA;
                    } else {
                        dataToEncrypt = messageBytes;
                        magic = MAGIC_CRYPT;
                    }

                    messageBytes = await encryptData(dataToEncrypt, password);
                }

                const length = messageBytes.length;
                const lengthBytes = [
                    (length >> 24) & 0xFF,
                    (length >> 16) & 0xFF,
                    (length >> 8) & 0xFF,
                    length & 0xFF
                ];

                const allBytes = new Uint8Array([...magic, ...lengthBytes, ...messageBytes]);

                let binaryData = '';
                for (const byte of allBytes) {
                    binaryData += byteToBinary(byte);
                }

                const maxBits = Math.floor(data.length / 4);
                if (binaryData.length > maxBits) {
                    alert(`消息太长！`);
                    setIsProcessing(false);
                    return;
                }

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

    // ==================== 解码 ====================
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

                const headerBits = extractBits(64);
                const headerBytes = bitsToBytes(headerBits);
                const magic = headerBytes.slice(0, 4);

                // 检测加密类型
                const is2FA = magic.join(',') === MAGIC_2FA.join(',');
                const isCrypt = magic.join(',') === MAGIC_CRYPT.join(',');
                const isPlain = magic.join(',') === MAGIC_PLAIN.join(',');

                if (!is2FA && !isCrypt && !isPlain) {
                    setDecodedMessage('❌ 未发现隐藏信息');
                    setNeedsPassword(false);
                    setNeeds2FA(false);
                    setIsProcessing(false);
                    return;
                }

                // 需要密码但未提供
                if ((is2FA || isCrypt) && !decryptPassword) {
                    setNeedsPassword(true);
                    setNeeds2FA(is2FA);
                    setDecodedMessage('');
                    setIsProcessing(false);
                    return;
                }

                // 需要 2FA 码但未提供
                if (is2FA && !totpCode) {
                    setNeedsPassword(true);
                    setNeeds2FA(true);
                    setDecodedMessage('');
                    setIsProcessing(false);
                    return;
                }

                const length = (headerBytes[4] << 24) | (headerBytes[5] << 16) |
                    (headerBytes[6] << 8) | headerBytes[7];

                if (length <= 0 || length > 10000000) {
                    setDecodedMessage('❌ 数据损坏');
                    setIsProcessing(false);
                    return;
                }

                const totalBits = (8 + length) * 8;
                const allBits = extractBits(totalBits);
                const allBytes = bitsToBytes(allBits);
                let messageBytes = new Uint8Array(allBytes.slice(8, 8 + length));

                if (is2FA || isCrypt) {
                    try {
                        messageBytes = await decryptData(messageBytes, decryptPassword);
                    } catch (e) {
                        setDecodedMessage('❌ 密码错误');
                        setIsProcessing(false);
                        return;
                    }
                }

                // 如果是 2FA，验证 TOTP 码
                if (is2FA) {
                    const secretLen = messageBytes[0];
                    const secret = bytesToString(messageBytes.slice(1, 1 + secretLen));
                    const actualMessage = messageBytes.slice(1 + secretLen);

                    const valid = await verifyTotp(secret, totpCode);
                    if (!valid) {
                        setDecodedMessage('❌ 2FA 验证码错误');
                        setIsProcessing(false);
                        return;
                    }

                    messageBytes = actualMessage;
                }

                const decoded = bytesToString(messageBytes);
                setDecodedMessage(decoded || '（空消息）');
                setNeedsPassword(false);
                setNeeds2FA(false);
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
        link.download = `hidden_${enable2FA ? '2fa_' : enableEncrypt ? 'enc_' : ''}${image.name}`;
        link.click();
    };

    // 生成 otpauth:// URI
    const getTotpUri = () => {
        return `otpauth://totp/LyraImage:Secret?secret=${totpSecret}&issuer=LyraImage&algorithm=SHA1&digits=6&period=30`;
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
                                onClick={() => { setMode('encode'); setResult(null); setDecodedMessage(''); setNeedsPassword(false); setNeeds2FA(false); setShowSetup(false); }}
                            >
                                🔒 隐藏信息
                            </button>
                            <button
                                type="button"
                                className={`mode-btn ${mode === 'decode' ? 'active' : ''}`}
                                onClick={() => { setMode('decode'); setResult(null); setDecodedMessage(''); setNeedsPassword(false); setNeeds2FA(false); setShowSetup(false); }}
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
                                        onChange={(e) => { setEnableEncrypt(e.target.checked); if (!e.target.checked) setEnable2FA(false); }}
                                    />
                                    <span className="field-label" style={{ margin: 0 }}>🔐 AES-256 加密</span>
                                </label>
                            </div>

                            {enableEncrypt && (
                                <>
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

                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={enable2FA}
                                                onChange={(e) => setEnable2FA(e.target.checked)}
                                            />
                                            <span className="field-label" style={{ margin: 0 }}>📱 启用 2FA 验证</span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {mode === 'decode' && needsPassword && (
                        <>
                            <div className="field">
                                <span className="field-label">🔐 需要密码</span>
                                <input
                                    type="password"
                                    className="input-field"
                                    value={decryptPassword}
                                    onChange={(e) => setDecryptPassword(e.target.value)}
                                    placeholder="输入解密密码..."
                                    style={{ width: 200 }}
                                />
                            </div>

                            {needs2FA && (
                                <div className="field">
                                    <span className="field-label">📱 2FA 验证码</span>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="6 位验证码"
                                        style={{ width: 120, letterSpacing: '0.2em', fontFamily: 'monospace' }}
                                        maxLength={6}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 2FA 设置弹窗 */}
            {showSetup && totpSecret && (
                <div style={{
                    background: 'var(--paper-2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                    marginBottom: 16,
                    border: '2px solid var(--accent-strong)'
                }}>
                    <h4 style={{ marginBottom: 12, color: 'var(--accent-strong)' }}>📱 设置 2FA 验证器</h4>
                    <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>
                        请使用 Google Authenticator、Microsoft Authenticator 或其他 TOTP 应用扫描此二维码，或手动输入密钥：
                    </p>

                    {/* QR Code (使用 Google Chart API) */}
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getTotpUri())}`}
                            alt="2FA QR Code"
                            style={{ borderRadius: 8, border: '4px solid white' }}
                        />
                    </div>

                    <div style={{
                        background: 'var(--paper)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                        textAlign: 'center'
                    }}>
                        <strong>密钥：</strong>{totpSecret}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: 12 }}>
                        ⚠️ 请务必保存此密钥！关闭后无法恢复，丢失将无法解密图片。
                    </p>

                    <button
                        className="btn-secondary"
                        onClick={() => setShowSetup(false)}
                        style={{ marginTop: 12 }}
                    >
                        ✓ 我已保存密钥
                    </button>
                </div>
            )}

            {/* 主内容区 */}
            <div className="stego-content">
                {!image ? (
                    <div className="empty-state file-zone">
                        <div className="file-zone-icon">🔐</div>
                        <div className="file-zone-text">图片隐写术 + 2FA</div>
                        <div className="file-zone-hint">军事级加密 + 双因素认证</div>
                    </div>
                ) : (
                    <div className="stego-layout">
                        <div className="stego-preview">
                            <img src={result || image.url} alt="preview" />
                            {result && (
                                <div className="stego-badge" style={{
                                    background: enable2FA ? '#7c3aed' : enableEncrypt ? '#dc2626' : '#22c55e'
                                }}>
                                    {enable2FA ? '🔐📱 2FA加密' : enableEncrypt ? '🔐 已加密' : '✓ 已隐藏'}
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
                                {isProcessing ? '处理中...' : enable2FA ? '🔐📱 2FA加密隐藏' : enableEncrypt ? '🔐 加密隐藏' : '🔒 隐藏信息'}
                            </button>
                            {result && (
                                <button className="btn-secondary" onClick={downloadResult} style={{ marginLeft: 8 }}>
                                    📥 下载图片
                                </button>
                            )}
                        </>
                    ) : (
                        <button className="btn-primary" onClick={decodeMessage} disabled={isProcessing}>
                            {isProcessing ? '解析中...' : needs2FA ? '🔓📱 2FA解密' : needsPassword ? '🔓 解密提取' : '🔓 提取信息'}
                        </button>
                    )}
                </div>
            )}

            <div className="stego-info" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--ink-2)' }}>
                <p>💡 <strong>LSB 隐写：</strong>在像素最低位隐藏数据，肉眼不可见。</p>
                <p>🔐 <strong>AES-256：</strong>军事级加密，PBKDF2 10万次迭代。</p>
                <p>📱 <strong>2FA：</strong>TOTP 标准，兼容 Google Authenticator。</p>
                <p>⚠️ <strong>注意：</strong>必须使用 PNG 格式，JPG 会破坏数据。</p>
            </div>
        </>
    );
};

export default Steganography;
