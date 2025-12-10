```javascript
export const config = {
  runtime: 'edge', // 使用 Edge Runtime 获得更好性能
};

export default async function handler(req) {
  const url = new URL(req.url);
  const targetUrl = 'https://adobeid-na1.services.adobe.com/ims/check/v6/token' + url.search;

  // 复制请求体
  const body = req.method === 'POST' ? await req.text() : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://quick-actions.express.adobe.com',
        'Referer': 'https://quick-actions.express.adobe.com/',
      },
      body: body,
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
```
