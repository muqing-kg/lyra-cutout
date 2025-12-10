/**
 * Adobe Sensei 抠图服务
 * 使用 Adobe Express 的公开 API 进行背景移除
 * 
 * 流程：
 * 1. 获取 Guest Token（匿名访客令牌）
 * 2. 使用 Token 调用 Sensei API
 * 3. 解析 mask 响应并合成透明 PNG
 */

// 通过 Vite 代理访问，绕过 CORS 限制
const SENSEI_ENDPOINT = '/adobe-api/services/v2/predict';
const TOKEN_ENDPOINT = '/adobe-token/ims/check/v6/token';
const API_KEY = 'projectx_webapp';
const CLIENT_ID = 'quickactions_hz_webapp';

// 缓存 token，避免重复请求
let cachedToken = null;
let tokenExpiry = 0;

/**
 * 获取 Adobe Guest Token（匿名访客令牌）
 * @returns {Promise<string>} access_token
 */
async function getGuestToken() {
    // 检查缓存的 token 是否仍然有效（预留 5 分钟缓冲）
    if (cachedToken && Date.now() < tokenExpiry - 300000) {
        return cachedToken;
    }

    const params = new URLSearchParams({
        guest_allowed: 'true',
        client_id: CLIENT_ID,
        scope: [
            'ab.manage',
            'AdobeID',
            'openid',
            'read_organizations',
            'creative_cloud',
            'creative_sdk',
            'tk_platform',
            'tk_platform_sync',
            'af_byof',
            'DCAPI',
            'tk_platform_grant_free_subscription',
            'pps.read',
            'firefly_api',
            'uds_read',
            'uds_write',
            'additional_info.ownerOrg',
            'additional_info.roles',
        ].join(','),
    });

    const response = await fetch(`${TOKEN_ENDPOINT}?jslVersion=v2-v0.48.0-1-g1e322cb`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        throw new Error(`获取 Adobe Token 失败 (${response.status})`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    // expires_in 是毫秒
    tokenExpiry = Date.now() + (data.expires_in || 3600000);

    return cachedToken;
}

/**
 * 构建 Adobe Sensei 请求的 JSON 配置
 * @param {string} mimeType - 图片 MIME 类型
 */
function buildContentAnalyzerRequest(mimeType) {
    return JSON.stringify({
        'sensei:name': 'CPF Image Cutout',
        'sensei:invocation_mode': 'synchronous',
        'sensei:invocation_batch': false,
        'sensei:in_response': false,
        'sensei:engines': [
            {
                'sensei:execution_info': {
                    'sensei:engine': 'Feature:autocrop:Service-e4c2aec8002943a797840574eab514eb',
                },
                'sensei:inputs': {
                    image_in: {
                        'dc:format': mimeType,
                        'sensei:multipart_field_name': 'infile',
                    },
                },
                'sensei:params': {
                    include_bbox: true,
                    mode: 'mask',
                },
                'sensei:outputs': {
                    masks_out: {
                        'dc:format': 'image/jpeg',
                        'sensei:multipart_field_name': 'outfile0',
                    },
                    metadata_out: {
                        'dc:format': 'application/json',
                        'sensei:multipart_field_name': 'metadata',
                    },
                },
            },
        ],
    });
}

/**
 * 生成唯一的 transaction ID
 */
function generateTransactionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 解析 multipart/form-data 响应
 * @param {ArrayBuffer} buffer - 响应数据
 * @param {string} boundary - multipart 边界
 * @returns {Object} 解析后的各部分数据
 */
function parseMultipartResponse(buffer, boundary) {
    const decoder = new TextDecoder('utf-8');
    const uint8 = new Uint8Array(buffer);
    const boundaryBytes = new TextEncoder().encode('--' + boundary);

    const parts = {};
    let searchStart = 0;

    // 查找 boundary 位置
    function findBoundary(start) {
        for (let i = start; i < uint8.length - boundaryBytes.length; i++) {
            let match = true;
            for (let j = 0; j < boundaryBytes.length; j++) {
                if (uint8[i + j] !== boundaryBytes[j]) {
                    match = false;
                    break;
                }
            }
            if (match) return i;
        }
        return -1;
    }

    // 查找 \r\n\r\n (headers 结束)
    function findHeaderEnd(start) {
        for (let i = start; i < uint8.length - 3; i++) {
            if (uint8[i] === 13 && uint8[i + 1] === 10 && uint8[i + 2] === 13 && uint8[i + 3] === 10) {
                return i;
            }
        }
        return -1;
    }

    while (searchStart < uint8.length) {
        const boundaryStart = findBoundary(searchStart);
        if (boundaryStart === -1) break;

        const headerStart = boundaryStart + boundaryBytes.length + 2; // 跳过 boundary 和 \r\n
        const headerEnd = findHeaderEnd(headerStart);
        if (headerEnd === -1) break;

        const headerText = decoder.decode(uint8.slice(headerStart, headerEnd));
        const contentStart = headerEnd + 4; // 跳过 \r\n\r\n

        // 找下一个 boundary
        const nextBoundary = findBoundary(contentStart);
        const contentEnd = nextBoundary === -1 ? uint8.length : nextBoundary - 2; // 减去 \r\n

        // 解析 header 获取 name
        const nameMatch = headerText.match(/name="([^"]+)"/);
        const contentTypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

        if (nameMatch) {
            const name = nameMatch[1];
            const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : '';
            const content = uint8.slice(contentStart, contentEnd);

            if (contentType.includes('application/json')) {
                parts[name] = JSON.parse(decoder.decode(content));
            } else if (contentType.includes('image/')) {
                parts[name] = new Blob([content], { type: contentType });
            } else {
                parts[name] = content;
            }
        }

        searchStart = nextBoundary === -1 ? uint8.length : nextBoundary;
    }

    return parts;
}

/**
 * 使用 Canvas 将原图和 mask 合成透明 PNG
 * @param {File|Blob} originalImage - 原始图片
 * @param {Blob} maskBlob - mask 蒙版图片
 * @returns {Promise<Blob>} 透明背景的 PNG
 */
async function applyMaskToImage(originalImage, maskBlob) {
    // 加载原图
    const originalBitmap = await createImageBitmap(originalImage);
    // 加载 mask
    const maskBitmap = await createImageBitmap(maskBlob);

    const width = originalBitmap.width;
    const height = originalBitmap.height;

    // 创建 canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制原图
    ctx.drawImage(originalBitmap, 0, 0, width, height);

    // 获取原图像素数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // 创建临时 canvas 用于读取 mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskBitmap, 0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);
    const maskPixels = maskData.data;

    // 应用 mask：mask 白色区域保留，黑色区域透明
    for (let i = 0; i < pixels.length; i += 4) {
        // 使用 mask 的灰度值作为 alpha
        const maskValue = maskPixels[i]; // R 通道（灰度图 R=G=B）
        pixels[i + 3] = maskValue; // 设置 alpha
    }

    ctx.putImageData(imageData, 0, 0);

    // 导出为 PNG
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
    });
}

/**
 * 调用 Adobe Sensei API 进行抠图
 * @param {File} file - 要处理的图片文件
 * @returns {Promise<Blob>} 透明背景的 PNG blob
 */
export async function removeBackgroundWithAdobe(file) {
    // 1. 获取 Guest Token
    const token = await getGuestToken();

    const mimeType = file.type || 'image/png';

    // 2. 构建 FormData
    const formData = new FormData();
    formData.append('contentAnalyzerRequests', buildContentAnalyzerRequest(mimeType));
    formData.append('infile', file, file.name);

    // 3. 发送请求
    const response = await fetch(SENSEI_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY,
            'x-transaction-id': generateTransactionId(),
            'prefer': 'respond-sync, wait=100',
            'accept': 'multipart/form-data',
        },
        body: formData,
    });

    if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text().catch(() => '');
        if (contentType.includes('application/json')) {
            console.error('[Adobe] API JSON 错误:', text);
            try {
                const errData = JSON.parse(text);
                throw new Error(`Adobe API 错误 (${response.status}): ${errData.message || errData.title || text}`);
            } catch (e) {
                if (e.message.includes('Adobe API')) throw e;
            }
        }
        throw new Error(`Adobe API 错误 (${response.status}): ${text || '未知错误'}`);
    }

    // 4. 解析 multipart 响应
    const contentType = response.headers.get('content-type') || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
        throw new Error('无法解析响应边界');
    }
    const boundary = boundaryMatch[1];

    const buffer = await response.arrayBuffer();
    const parts = parseMultipartResponse(buffer, boundary);

    // 调试：打印解析到的所有字段
    console.log('[Adobe] 解析到的字段:', Object.keys(parts));
    console.log('[Adobe] contentAnalyzerResponse:', parts.contentAnalyzerResponse);

    // 5. 检查响应状态
    const analyzerResponse = parts.contentAnalyzerResponse;
    if (analyzerResponse?.statuses?.[0]?.invocations?.[0]?.status !== '200') {
        console.error('[Adobe] 处理状态异常:', analyzerResponse);
        throw new Error('Adobe 处理失败');
    }

    // 6. 获取 mask 图片
    // Adobe 返回的字段名可能不一致，直接查找 Blob 类型的字段
    let maskBlob = null;
    let maskFieldName = null;

    for (const [key, value] of Object.entries(parts)) {
        // 跳过 JSON 数据
        if (key === 'contentAnalyzerResponse' || key === 'metadata') continue;

        // 找到 Blob 类型的字段（图片）
        if (value instanceof Blob) {
            maskBlob = value;
            maskFieldName = key;
            console.log('[Adobe] 找到 mask 图片字段:', key, 'size:', value.size);
            break;
        }
    }

    if (!maskBlob) {
        console.error('[Adobe] 未找到 mask 图片，所有字段:', Object.keys(parts));
        throw new Error('未收到 mask 图片');
    }

    // 7. 用 mask 合成透明图片
    const resultBlob = await applyMaskToImage(file, maskBlob);
    return resultBlob;
}
