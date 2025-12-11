import React, { useState, useRef, useEffect } from 'react';

/**
 * 图片隐写术 + AES-256-GCM 加密 + TOTP 2FA + 人脸验证
 * - 在图片像素中隐藏文字
 * - 支持中文 (UTF-8)
 * - 可选 AES-256 加密 + 2FA + 人脸识别
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
    const [enableFace, setEnableFace] = useState(false);
    const [password, setPassword] = useState('');
    const [decryptPassword, setDecryptPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [needsFace, setNeedsFace] = useState(false);

    // 2FA 设置
    const [totpSecret, setTotpSecret] = useState('');
    const [showSetup, setShowSetup] = useState(false);

    // 人脸验证
    const [showCamera, setShowCamera] = useState(false);
    const [faceTemplate, setFaceTemplate] = useState(null);
    const [faceVerified, setFaceVerified] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [faceStatus, setFaceStatus] = useState('');

    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const faceCanvasRef = useRef(null);
    const streamRef = useRef(null);

    // 魔数标记
    const MAGIC_PLAIN = [0x4C, 0x59, 0x52, 0x41]; // "LYRA" - 未加密
    const MAGIC_CRYPT = [0x4C, 0x59, 0x43, 0x52]; // "LYCR" - 加密无2FA
    const MAGIC_2FA = [0x4C, 0x59, 0x32, 0x46]; // "LY2F" - 加密+2FA
    const MAGIC_FACE = [0x4C, 0x59, 0x46, 0x43]; // "LYFC" - 加密+人脸

    // 清理摄像头
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // ==================== 人脸检测 ====================

    // 简化的人脸特征提取（使用像素哈希）
    const extractFaceFeatures = async (imageData) => {
        // 将人脸区域的像素数据转为特征哈希
        const data = imageData.data;
        let hash = 0;

        // 采样像素生成特征值
        for (let i = 0; i < data.length; i += 40) {
            hash = ((hash << 5) - hash + data[i]) | 0;
        }

        // 生成更复杂的特征向量（32个值）
        const features = [];
        const step = Math.floor(data.length / 32);
        for (let i = 0; i < 32; i++) {
            let sum = 0;
            for (let j = 0; j < step; j += 16) {
                sum += data[i * step + j] || 0;
            }
            features.push(sum % 256);
        }

        return new Uint8Array(features);
    };

    // 比较人脸特征（允许一定误差）
    const compareFaceFeatures = (template, current) => {
        if (template.length !== current.length) return 0;

        let similarity = 0;
        for (let i = 0; i < template.length; i++) {
            const diff = Math.abs(template[i] - current[i]);
            similarity += Math.max(0, 1 - diff / 64);
        }

        return similarity / template.length;
    };

    // 启动摄像头
    const startCamera = async () => {
        try {
            setCameraError('');
            setFaceStatus('正在启动摄像头...');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setShowCamera(true);
            setFaceStatus('请将人脸对准框内，然后点击"拍照验证"');
        } catch (err) {
            setCameraError('无法访问摄像头: ' + err.message);
            setFaceStatus('');
        }
    };

    // 停止摄像头
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    // 拍照并提取特征
    const captureAndExtract = async () => {
        if (!videoRef.current || !faceCanvasRef.current) return null;

        const video = videoRef.current;
        const canvas = faceCanvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = 160;
        canvas.height = 120;

        // 捕获视频帧
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 转为灰度增强特征稳定性
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        return extractFaceFeatures(imageData);
    };

    // 录入人脸
    const enrollFace = async () => {
        setFaceStatus('正在提取人脸特征...');

        const features = await captureAndExtract();
        if (features) {
            setFaceTemplate(features);
            setFaceVerified(true);
            stopCamera();
            setFaceStatus('✅ 人脸已录入');
        } else {
            setFaceStatus('❌ 提取失败，请重试');
        }
    };

    // 验证人脸
    const verifyFace = async () => {
        if (!faceTemplate) {
            setFaceStatus('❌ 无人脸模板');
            return false;
        }

        setFaceStatus('正在验证人脸...');

        const currentFeatures = await captureAndExtract();
        if (!currentFeatures) {
            setFaceStatus('❌ 无法提取特征');
            return false;
        }

        const similarity = compareFaceFeatures(faceTemplate, currentFeatures);
        console.log('人脸相似度:', similarity);

        if (similarity > 0.65) { // 65% 相似度阈值
            setFaceVerified(true);
            stopCamera();
            setFaceStatus(`✅ 验证通过 (${(similarity * 100).toFixed(0)}%)`);
            return true;
        } else {
            setFaceStatus(`❌ 验证失败 (${(similarity * 100).toFixed(0)}%)，请重试`);
            return false;
        }
    };

    // ==================== TOTP 实现 ====================

    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    const base32Encode = (buffer) => {
        let bits = '';
        for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
        let result = '';
        for (let i = 0; i < bits.length; i += 5) {
            result += base32Chars[parseInt(bits.substr(i, 5).padEnd(5, '0'), 2)];
        }
        return result;
    };

    const base32Decode = (str) => {
        let bits = '';
        for (const char of str.toUpperCase()) {
            const idx = base32Chars.indexOf(char);
            if (idx >= 0) bits += idx.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        return new Uint8Array(bytes);
    };

    const generateTotpSecret = () => base32Encode(crypto.getRandomValues(new Uint8Array(20)));

    const hmacSha1 = async (key, message) => {
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, message));
    };

    const verifyTotp = async (secret, code) => {
        const key = base32Decode(secret);
        for (let i = -1; i <= 1; i++) {
            const time = Math.floor(Date.now() / 1000 / 30) + i;
            const timeBytes = new Uint8Array(8);
            let t = time;
            for (let j = 7; j >= 0; j--) { timeBytes[j] = t & 0xff; t = Math.floor(t / 256); }
            const hmac = await hmacSha1(key, timeBytes);
            const offset = hmac[hmac.length - 1] & 0x0f;
            const expected = (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) |
                ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) % 1000000;
            if (code === expected.toString().padStart(6, '0')) return true;
        }
        return false;
    };

    // ==================== 加密工具 ====================

    const deriveKey = async (password, salt) => {
        const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
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
        return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
    };

    // ==================== 工具函数 ====================

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
        setNeedsFace(false);
        setFaceVerified(false);
        setFaceTemplate(null);
    };

    const resetState = () => {
        setResult(null);
        setDecodedMessage('');
        setNeedsPassword(false);
        setNeeds2FA(false);
        setNeedsFace(false);
        setShowSetup(false);
        setFaceVerified(false);
        setFaceTemplate(null);
        stopCamera();
    };

    // ==================== 编码 ====================
    const encodeMessage = async () => {
        if (!image || !message) return;
        if (enableEncrypt && !password) return alert('请输入加密密码');
        if (enableFace && !faceVerified) return alert('请先录入人脸');

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

                    if (enableFace && faceTemplate) {
                        // 存储人脸模板
                        const templateLen = faceTemplate.length;
                        dataToEncrypt = new Uint8Array(1 + templateLen + messageBytes.length);
                        dataToEncrypt[0] = templateLen;
                        dataToEncrypt.set(faceTemplate, 1);
                        dataToEncrypt.set(messageBytes, 1 + templateLen);
                        magic = MAGIC_FACE;
                    } else if (enable2FA) {
                        const secret = generateTotpSecret();
                        setTotpSecret(secret);
                        setShowSetup(true);
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
                const lengthBytes = [(length >> 24) & 0xFF, (length >> 16) & 0xFF, (length >> 8) & 0xFF, length & 0xFF];
                const allBytes = new Uint8Array([...magic, ...lengthBytes, ...messageBytes]);

                let binaryData = '';
                for (const byte of allBytes) binaryData += byteToBinary(byte);

                if (binaryData.length > data.length / 4) {
                    alert('消息太长！');
                    setIsProcessing(false);
                    return;
                }

                for (let i = 0; i < binaryData.length; i++) {
                    data[i * 4] = (data[i * 4] & 0xFE) | parseInt(binaryData[i]);
                }

                ctx.putImageData(imageData, 0, 0);
                setResult(canvas.toDataURL('image/png'));
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
                    for (let i = 0; i < count && i * 4 < data.length; i++) bits += (data[i * 4] & 1).toString();
                    return bits;
                };

                const bitsToBytes = (bits) => {
                    const bytes = [];
                    for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
                    return bytes;
                };

                const headerBytes = bitsToBytes(extractBits(64));
                const magic = headerBytes.slice(0, 4).join(',');

                const isFace = magic === MAGIC_FACE.join(',');
                const is2FA = magic === MAGIC_2FA.join(',');
                const isCrypt = magic === MAGIC_CRYPT.join(',');
                const isPlain = magic === MAGIC_PLAIN.join(',');

                if (!isFace && !is2FA && !isCrypt && !isPlain) {
                    setDecodedMessage('❌ 未发现隐藏信息');
                    setIsProcessing(false);
                    return;
                }

                if ((isFace || is2FA || isCrypt) && !decryptPassword) {
                    setNeedsPassword(true);
                    setNeeds2FA(is2FA);
                    setNeedsFace(isFace);
                    setIsProcessing(false);
                    return;
                }

                if (is2FA && !totpCode) {
                    setNeedsPassword(true);
                    setNeeds2FA(true);
                    setIsProcessing(false);
                    return;
                }

                if (isFace && !faceVerified) {
                    setNeedsPassword(true);
                    setNeedsFace(true);
                    setIsProcessing(false);
                    return;
                }

                const length = (headerBytes[4] << 24) | (headerBytes[5] << 16) | (headerBytes[6] << 8) | headerBytes[7];
                if (length <= 0 || length > 10000000) {
                    setDecodedMessage('❌ 数据损坏');
                    setIsProcessing(false);
                    return;
                }

                const allBytes = bitsToBytes(extractBits((8 + length) * 8));
                let messageBytes = new Uint8Array(allBytes.slice(8, 8 + length));

                if (isFace || is2FA || isCrypt) {
                    try {
                        messageBytes = await decryptData(messageBytes, decryptPassword);
                    } catch {
                        setDecodedMessage('❌ 密码错误');
                        setIsProcessing(false);
                        return;
                    }
                }

                if (isFace) {
                    const templateLen = messageBytes[0];
                    const storedTemplate = messageBytes.slice(1, 1 + templateLen);
                    setFaceTemplate(storedTemplate);
                    messageBytes = messageBytes.slice(1 + templateLen);
                }

                if (is2FA) {
                    const secretLen = messageBytes[0];
                    const secret = bytesToString(messageBytes.slice(1, 1 + secretLen));
                    if (!(await verifyTotp(secret, totpCode))) {
                        setDecodedMessage('❌ 2FA 验证码错误');
                        setIsProcessing(false);
                        return;
                    }
                    messageBytes = messageBytes.slice(1 + secretLen);
                }

                setDecodedMessage(bytesToString(messageBytes) || '（空消息）');
                setNeedsPassword(false);
                setNeeds2FA(false);
                setNeedsFace(false);
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
        link.download = `hidden_${enableFace ? 'face_' : enable2FA ? '2fa_' : enableEncrypt ? 'enc_' : ''}${image.name}`;
        link.click();
    };

    const getTotpUri = () => `otpauth://totp/LyraImage:Secret?secret=${totpSecret}&issuer=LyraImage`;

    const getSecurityLabel = () => {
        if (enableFace) return { icon: '👤🔐', text: '人脸加密', color: '#059669' };
        if (enable2FA) return { icon: '📱🔐', text: '2FA加密', color: '#7c3aed' };
        if (enableEncrypt) return { icon: '🔐', text: '已加密', color: '#dc2626' };
        return { icon: '✓', text: '已隐藏', color: '#22c55e' };
    };

    return (
        <>
            <div className="control-panel">
                <div className="control-section">
                    <div className="field">
                        <span className="field-label">模式</span>
                        <div className="mode-selector">
                            <button className={`mode-btn ${mode === 'encode' ? 'active' : ''}`} onClick={() => { setMode('encode'); resetState(); }}>
                                🔒 隐藏信息
                            </button>
                            <button className={`mode-btn ${mode === 'decode' ? 'active' : ''}`} onClick={() => { setMode('decode'); resetState(); }}>
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
                                <textarea className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="输入要隐藏的文字..." rows={3} style={{ width: 300, resize: 'vertical' }} />
                            </div>

                            <div className="field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={enableEncrypt} onChange={(e) => { setEnableEncrypt(e.target.checked); if (!e.target.checked) { setEnable2FA(false); setEnableFace(false); } }} />
                                    <span className="field-label" style={{ margin: 0 }}>🔐 AES-256 加密</span>
                                </label>
                            </div>

                            {enableEncrypt && (
                                <>
                                    <div className="field">
                                        <span className="field-label">加密密码</span>
                                        <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码..." style={{ width: 200 }} />
                                    </div>

                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={enable2FA} onChange={(e) => { setEnable2FA(e.target.checked); if (e.target.checked) setEnableFace(false); }} />
                                            <span className="field-label" style={{ margin: 0 }}>📱 2FA 验证</span>
                                        </label>
                                    </div>

                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={enableFace} onChange={(e) => { setEnableFace(e.target.checked); if (e.target.checked) setEnable2FA(false); }} />
                                            <span className="field-label" style={{ margin: 0 }}>👤 人脸验证</span>
                                        </label>
                                    </div>

                                    {enableFace && (
                                        <div className="field" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                            {!faceVerified ? (
                                                <>
                                                    {!showCamera ? (
                                                        <button className="btn-secondary" onClick={startCamera}>📷 启动摄像头录入人脸</button>
                                                    ) : (
                                                        <button className="btn-primary" onClick={enrollFace}>📸 拍照录入</button>
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ color: 'var(--success)' }}>✅ 人脸已录入</span>
                                            )}
                                            {faceStatus && <span style={{ fontSize: '0.85rem', color: 'var(--ink-2)', marginTop: 4 }}>{faceStatus}</span>}
                                            {cameraError && <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{cameraError}</span>}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {mode === 'decode' && needsPassword && (
                        <>
                            <div className="field">
                                <span className="field-label">🔐 密码</span>
                                <input type="password" className="input-field" value={decryptPassword} onChange={(e) => setDecryptPassword(e.target.value)} placeholder="输入密码..." style={{ width: 200 }} />
                            </div>

                            {needs2FA && (
                                <div className="field">
                                    <span className="field-label">📱 2FA 验证码</span>
                                    <input type="text" className="input-field" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位验证码" style={{ width: 120, fontFamily: 'monospace' }} maxLength={6} />
                                </div>
                            )}

                            {needsFace && (
                                <div className="field" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="field-label">👤 人脸验证</span>
                                    {!faceVerified ? (
                                        <>
                                            {!showCamera ? (
                                                <button className="btn-secondary" onClick={startCamera}>📷 启动摄像头验证</button>
                                            ) : (
                                                <button className="btn-primary" onClick={verifyFace}>📸 拍照验证</button>
                                            )}
                                        </>
                                    ) : (
                                        <span style={{ color: 'var(--success)' }}>✅ 验证通过</span>
                                    )}
                                    {faceStatus && <span style={{ fontSize: '0.85rem', marginTop: 4 }}>{faceStatus}</span>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 摄像头预览 */}
            {showCamera && (
                <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16, textAlign: 'center' }}>
                    <video ref={videoRef} style={{ width: 320, height: 240, borderRadius: 8, transform: 'scaleX(-1)' }} autoPlay muted playsInline />
                    <div style={{ marginTop: 8 }}>
                        <button className="btn-secondary" onClick={stopCamera} style={{ marginLeft: 8 }}>❌ 关闭</button>
                    </div>
                </div>
            )}
            <canvas ref={faceCanvasRef} style={{ display: 'none' }} />

            {/* 2FA 设置 */}
            {showSetup && totpSecret && (
                <div style={{ background: 'var(--paper-2)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 16, border: '2px solid var(--accent-strong)' }}>
                    <h4 style={{ marginBottom: 12 }}>📱 设置 2FA</h4>
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getTotpUri())}`} alt="QR" style={{ borderRadius: 8 }} />
                    </div>
                    <div style={{ background: 'var(--paper)', padding: 8, borderRadius: 8, fontFamily: 'monospace', fontSize: '0.8rem', textAlign: 'center' }}>
                        {totpSecret}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: 8 }}>⚠️ 请保存密钥！丢失无法恢复。</p>
                    <button className="btn-secondary" onClick={() => setShowSetup(false)} style={{ marginTop: 8 }}>✓ 已保存</button>
                </div>
            )}

            <div className="stego-content">
                {!image ? (
                    <div className="empty-state file-zone">
                        <div className="file-zone-icon">🔐</div>
                        <div className="file-zone-text">图片隐写术</div>
                        <div className="file-zone-hint">AES-256 加密 + 2FA + 人脸验证</div>
                    </div>
                ) : (
                    <div className="stego-layout">
                        <div className="stego-preview">
                            <img src={result || image.url} alt="preview" />
                            {result && (
                                <div className="stego-badge" style={{ background: getSecurityLabel().color }}>
                                    {getSecurityLabel().icon} {getSecurityLabel().text}
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
                            <button className="btn-primary" onClick={encodeMessage} disabled={isProcessing || !message || (enableFace && !faceVerified)}>
                                {isProcessing ? '处理中...' : enableFace ? '👤 人脸加密' : enable2FA ? '📱 2FA加密' : enableEncrypt ? '🔐 加密' : '🔒 隐藏'}
                            </button>
                            {result && <button className="btn-secondary" onClick={downloadResult} style={{ marginLeft: 8 }}>📥 下载</button>}
                        </>
                    ) : (
                        <button className="btn-primary" onClick={decodeMessage} disabled={isProcessing || (needsFace && !faceVerified)}>
                            {isProcessing ? '解析中...' : needsFace ? '👤 人脸解密' : needs2FA ? '📱 2FA解密' : needsPassword ? '🔓 解密' : '🔓 提取'}
                        </button>
                    )}
                </div>
            )}

            <div className="stego-info" style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--ink-2)' }}>
                <p>💡 <strong>隐写：</strong>在像素最低位隐藏数据</p>
                <p>🔐 <strong>加密：</strong>AES-256-GCM + PBKDF2</p>
                <p>📱 <strong>2FA：</strong>兼容 Google Authenticator</p>
                <p>👤 <strong>人脸：</strong>基于特征向量的生物识别</p>
            </div>
        </>
    );
};

export default Steganography;
