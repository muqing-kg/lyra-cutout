export async function onRequest(context) {
    const { request, params } = context;
    const url = new URL(request.url);

    // 目标: https://sensei.adobe.io/services/v2/predict
    const pathStr = Array.isArray(params.path) ? params.path.join('/') : params.path;
    const targetUrl = `https://sensei.adobe.io/${pathStr}${url.search}`;

    // 构建 Request Init
    const init = {
        method: request.method,
        headers: new Headers(request.headers),
        // Cloudflare Workers 允许直接透传 request.body stream，这是核心优势！
        body: request.body,
        duplex: 'half', // 某些环境下 fetch 需要这个参数来支持流式上传
    };

    // 覆盖/注入关键 Headers
    init.headers.set('Host', 'sensei.adobe.io');
    init.headers.set('Origin', 'https://quick-actions.express.adobe.com');
    init.headers.set('Referer', 'https://quick-actions.express.adobe.com/');
    init.headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 清理可能导致问题的 Headers
    init.headers.delete('cf-connecting-ip');
    init.headers.delete('cf-ipcountry');
    init.headers.delete('x-forwarded-proto');
    init.headers.delete('x-real-ip');

    try {
        const response = await fetch(targetUrl, init);

        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers),
        });

        // CORS
        newResponse.headers.set('Access-Control-Allow-Origin', '*');

        return newResponse;
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
