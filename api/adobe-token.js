```javascript
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // 确保目标 URL 正确
  const targetUrl = 'https://adobeid-na1.services.adobe.com/ims/check/v6/token' + url.search;

  const body = req.method === 'POST' ? await req.text() : undefined;

  // 伪装成我们本地开发时的 Chrome 浏览器
  const FAKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://quick-actions.express.adobe.com',
        'Referer': 'https://quick-actions.express.adobe.com/',
        'User-Agent': FAKE_UA, // 关键：欺骗服务器这不是爬虫
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: body,
    });

    // 如果上游返回错误，不要直接 500，而是把上游的错误透传回去调试
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Adobe API Error:', response.status, errorText);
      return new Response(errorText, { status: response.status });
    }

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 });
  }
}
```
