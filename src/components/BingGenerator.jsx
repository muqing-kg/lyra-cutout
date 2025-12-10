import React, { useState, useEffect } from 'react';
// import { saveAs } from 'file-saver'; // 复用已有的库 - Removed as per diff
// import JSZip from 'jszip'; - Removed as per diff

const BingGenerator = () => {
    // 状态管理
    const [cookie, setCookie] = useState(() => localStorage.getItem('bing_cookie') || '');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState([]); // 日志/状态信息
    const [images, setImages] = useState([]); // 生成结果 URL 列表
    const [error, setError] = useState(null);
    const [showTutorial, setShowTutorial] = useState(false); // Added as per diff

    // 持久化 Cookie
    useEffect(() => {
        localStorage.setItem('bing_cookie', cookie);
    }, [cookie]);

    const addLog = (msg) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // 智能处理 Cookie 输入：支持完整 Cookie 字符串或单独的 _U 值 - Added as per diff
    const handleCookieChange = (e) => {
        let input = e.target.value.trim();

        // 如果输入包含 "_U=" 说明是完整的 Cookie 字符串，尝试提取
        if (input.includes('_U=')) {
            const match = input.match(/_U=([^;]+)/);
            if (match) {
                input = match[1];
            }
        }
        setCookie(input);
    };

    // 核心生成逻辑
    const handleGenerate = async () => {
        if (!cookie) {
            setError('请先提供 _U Cookie');
            return;
        }
        if (!prompt) return;

        setIsGenerating(true);
        setError(null);
        setImages([]);
        setLogs([]);
        addLog('正在提交任务...');

        try {
            const baseUrl = '/bing-proxy';
            const query = new URLSearchParams({
                q: prompt,
                rt: '4',
                FORM: 'GENCRE'
            });

            // 发起创建请求
            const createRes = await fetch(`${baseUrl}/images/create?${query.toString()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Bing-Cookie': `_U=${cookie}`
                },
                body: new URLSearchParams({ q: prompt }),
                redirect: 'follow' // 让浏览器自动跟随重定向
            });

            let requestId = '';

            // 尝试多种方式获取 ID
            // 方式 1: 检查最终 URL (如果重定向被跟随)
            const finalUrl = createRes.url;
            if (finalUrl.includes('id=')) {
                const idMatch = finalUrl.match(/id=([^&]+)/);
                if (idMatch) {
                    requestId = idMatch[1];
                    addLog(`任务创建成功 (URL)，ID: ${requestId}`);
                }
            }

            // 方式 2: 检查 JSON 响应 (Cloudflare Function 模式)
            if (!requestId) {
                const contentType = createRes.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await createRes.json();
                    if (data.redirect) {
                        const match = data.redirect.match(/id=([^&]+)/) || data.redirect.match(/results\/([^?]+)/);
                        if (match) {
                            requestId = match[1];
                            addLog(`任务创建成功 (JSON)，ID: ${requestId}`);
                        }
                    } else if (data.error) {
                        throw new Error(data.error);
                    }
                }
            }

            // 方式 3: 从 HTML 响应中解析 (页面可能已经渲染了结果页)
            if (!requestId) {
                const text = await createRes.text();
                // 检查是否已经在结果页面
                const idFromHtml = text.match(/id['":\s]+['"]?([a-f0-9-]{30,})['"]?/i);
                if (idFromHtml) {
                    requestId = idFromHtml[1];
                    addLog(`任务创建成功 (HTML)，ID: ${requestId}`);
                } else if (text.includes('Sign in') || text.includes('login')) {
                    throw new Error('Cookie 无效或已过期，请重新获取');
                } else {
                    // 最后检查 URL 是否有结果页面特征
                    addLog(`无法提取 ID，最终 URL: ${finalUrl.substring(0, 100)}...`);
                    throw new Error('无法从响应中提取任务 ID');
                }
            }

            // 开始轮询
            if (requestId) {
                await pollResults(requestId, baseUrl);
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            addLog(`错误: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 轮询函数
    const pollResults = async (id, baseUrl) => {
        const maxAttempts = 30; // 30次 * 2秒 = 60秒超时
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            addLog(`轮询中... (${attempts}/${maxAttempts})`);

            // 构造轮询 URL
            // https://www.bing.com/images/create/async/results/{id}?{query}
            const pollUrl = `${baseUrl}/images/create/async/results/${id}?q=${encodeURIComponent(prompt)}`;

            const res = await fetch(pollUrl, {
                headers: {
                    'X-Bing-Cookie': `_U=${cookie}`
                }
            });

            const html = await res.text();


            // 调试：检查返回内容长度
            if (attempts === 1 || attempts % 10 === 0) {
                addLog(`响应长度: ${html.length} 字符`);
            }

            // 多种图片匹配模式
            const foundImages = [];

            // 模式 1: OIG 格式 (DALL-E 3 标准格式)
            const oigRegex = /src="(https:\/\/[^"]*bing\.com\/th\/id\/OIG[^"]*)"/gi;
            let match;
            while ((match = oigRegex.exec(html)) !== null) {
                const cleanUrl = match[1].replace(/&amp;/g, '&');
                if (!foundImages.includes(cleanUrl)) foundImages.push(cleanUrl);
            }

            // 模式 2: tse/dalleblob 格式
            const tseRegex = /src="(https:\/\/tse[^"]*\.mm\.bing\.net\/th\/id\/[^"]*)"/gi;
            while ((match = tseRegex.exec(html)) !== null) {
                const cleanUrl = match[1].replace(/&amp;/g, '&');
                if (!foundImages.includes(cleanUrl)) foundImages.push(cleanUrl);
            }

            // 模式 3: 通用 bing 图片格式
            const genericRegex = /src="(https:\/\/[^"]*\.bing\.[^"]*\/th[^"]*)"/gi;
            while ((match = genericRegex.exec(html)) !== null) {
                const cleanUrl = match[1].replace(/&amp;/g, '&');
                if (!foundImages.includes(cleanUrl)) foundImages.push(cleanUrl);
            }

            // 模式 4: href 链接中的图片 (有时图片在 a 标签的 href 里)
            const hrefRegex = /href="(https:\/\/[^"]*\.bing\.[^"]*\/th\/id\/[^"]*)"/gi;
            while ((match = hrefRegex.exec(html)) !== null) {
                const cleanUrl = match[1].replace(/&amp;/g, '&');
                if (!foundImages.includes(cleanUrl)) foundImages.push(cleanUrl);
            }

            if (foundImages.length > 0) {
                addLog(`✅ 获取到 ${foundImages.length} 张图片！`);
                setImages(foundImages);
                return;
            }

            // 检查是否仍在生成中
            if (html.includes('正在创建') || html.includes('generating') || html.includes('Please wait')) {
                // 继续等待
            } else if (html.includes('errorMessage') || html.includes('blocked') || html.includes('unsafe')) {
                throw new Error('Bing 拒绝生成（可能包含敏感内容）');
            } else if (html.length < 100) {
                // 空响应，继续等待
            }

            // 等待 2 秒
            await new Promise(r => setTimeout(r, 2000));
        }

        throw new Error('生成超时，请稍后重试');
    };

    return (
        <div className="crop-workspace" style={{ display: 'flex', flexDirection: 'column', padding: '20px', maxWidth: '1000px', margin: '0 auto', height: 'auto' }}>
            <div className="control-panel notebook-lines" style={{ marginBottom: '20px', width: '100%' }}>
                <h2 className="section-title">🧪 Bing Image Creator (Beta)</h2>

                <div className="control-section">
                    {/* Cookie 输入区 - Updated as per diff */}
                    <div className="control-row">
                        <label className="input-label">Cookie (_U):</label>
                        <input
                            type="password"
                            className="text-input"
                            placeholder="粘贴 _U 值或完整 Cookie 字符串"
                            value={cookie}
                            onChange={handleCookieChange} // Changed to new handler
                        />
                        <button
                            className="btn-secondary"
                            style={{ marginTop: '8px', fontSize: '12px' }}
                            onClick={() => setShowTutorial(!showTutorial)}
                        >
                            {showTutorial ? '📖 收起教程' : '❓ 如何获取 Cookie？'}
                        </button>
                    </div>

                    {/* 可折叠的详细教程 - Added as per diff */}
                    {showTutorial && (
                        <div className="tutorial-box" style={{
                            background: 'var(--paper-2)',
                            padding: '16px',
                            borderRadius: '12px',
                            marginTop: '12px',
                            marginBottom: '16px',
                            fontSize: '14px',
                            lineHeight: '1.8'
                        }}>
                            <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--accent-strong)' }}>📝 获取 Bing Cookie 步骤</h4>

                            <div style={{ marginBottom: '16px' }}>
                                <strong>步骤 1：登录 Bing</strong>
                                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
                                    打开 <a href="https://www.bing.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-strong)' }}>www.bing.com</a>，
                                    点击右上角登录你的 <strong>Microsoft 账号</strong>。
                                </p>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <strong>步骤 2：打开开发者工具</strong>
                                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
                                    按下 <code style={{ background: '#e0d9c8', padding: '2px 6px', borderRadius: '4px' }}>F12</code> 或
                                    <code style={{ background: '#e0d9c8', padding: '2px 6px', borderRadius: '4px' }}>Ctrl + Shift + I</code> (Mac: <code style={{ background: '#e0d9c8', padding: '2px 6px', borderRadius: '4px' }}>Cmd + Option + I</code>)
                                </p>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <strong>步骤 3：找到 Cookie</strong>
                                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
                                    方法 A (推荐)：点击顶部的 <strong>「Application」</strong> 标签 → 左侧 <strong>「Cookies」</strong> → <strong>「www.bing.com」</strong> → 找到 <code style={{ background: '#e0d9c8', padding: '2px 6px', borderRadius: '4px' }}>_U</code>，复制它的 <strong>Value</strong>。
                                </p>
                                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
                                    方法 B：点击 <strong>「Network」</strong> 标签 → 刷新页面 → 点击任意请求 → 找到 <strong>「Request Headers」</strong> 中的 <code style={{ background: '#e0d9c8', padding: '2px 6px', borderRadius: '4px' }}>Cookie</code>，复制整行（本工具会自动提取 _U）。
                                </p>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <strong>步骤 4：粘贴到上方输入框</strong>
                                <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
                                    将复制的内容粘贴到上方输入框。Cookie 会自动保存，下次访问无需重复操作。
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(211, 178, 96, 0.2)',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                marginTop: '12px',
                                borderLeft: '3px solid var(--accent)'
                            }}>
                                <strong>⚠️ 注意事项</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: 'var(--muted)' }}>
                                    <li>Cookie 有效期约 1-2 周，过期后需重新获取</li>
                                    <li>请勿分享你的 Cookie，它等同于登录凭证</li>
                                    <li>如遇到"验证码"提示，请在 Bing 官网完成验证后重试</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Prompt 输入区 - Updated as per diff */}
                    <div className="control-row">
                        <label className="input-label">Prompt:</label>
                        <textarea
                            className="text-input"
                            rows={3}
                            placeholder="描述你想生成的画面... (英文效果更佳)" // Updated placeholder
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className="actions">
                        <button
                            className="btn-primary"
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt || !cookie}
                        >
                            {isGenerating ? '创造中...' : '🎨 开始生成'}
                        </button>
                    </div>

                    {error && (
                        <div className="error-message" style={{ color: 'var(--error)', marginTop: '10px' }}>
                            ❌ {error} {/* Added ❌ as per diff */}
                        </div>
                    )}
                </div>
            </div>

            {/* 状态日志区 - Updated as per diff */}
            {logs.length > 0 && ( // Changed condition from isGenerating to logs.length > 0
                <div className="status-log" style={{
                    background: 'var(--paper-2)',
                    padding: '12px', // Updated padding
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    maxHeight: '150px', // Added maxHeight
                    overflowY: 'auto' // Added overflowY
                }}>
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            )}

            {/* 结果展示区 - Updated as per diff */}
            {images.length > 0 && (
                <div className="results-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', // Updated minmax
                    gap: '20px'
                }}>
                    {images.map((url, idx) => (
                        <div key={idx} className="result-card" style={{
                            background: 'white',
                            padding: '12px', // Updated padding
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)' // Updated boxShadow
                        }}>
                            <img
                                src={url}
                                alt={`Result ${idx + 1}`} // Updated alt text
                                style={{
                                    width: '100%',
                                    borderRadius: '8px',
                                    aspectRatio: '1/1',
                                    objectFit: 'cover'
                                }}
                            />
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer" // Added rel
                                className="btn-secondary"
                                style={{
                                    display: 'block',
                                    marginTop: '10px',
                                    textAlign: 'center',
                                    textDecoration: 'none'
                                }}
                            >
                                🔍 查看原图 {/* Updated text */}
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BingGenerator;
