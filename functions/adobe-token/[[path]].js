export async function onRequest(context) {
    const { request, params } = context;
    const url = new URL(request.url);

    // 拼接目标 URL: https://adobeid-na1.services.adobe.com/ims/check/v6/token?...
    // 注意：params.path 是一个数组，例如 ['ims', 'check', 'v6', 'token']
    const pathStr = Array.isArray(params.path) ? params.path.join('/') : params.path;
    const targetUrl = `https://adobeid-na1.services.adobe.com/${pathStr}${url.search}`;

    // 复制 Body
    let body = null;
    if (request.method === 'POST') {
        body = await request.text();
    }

    // 伪装 Headers
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://quick-actions.express.adobe.com',
        'Referer': 'https://quick-actions.express.adobe.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: body,
        });

        // 创建新 Response 避免 Immutable Header 问题
        const newResponse = new Response(response.body, response);

        // 设置 CORS
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', '*');

        return newResponse;

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
