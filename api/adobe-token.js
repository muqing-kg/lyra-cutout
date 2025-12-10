// 使用 Vercel 默认的 Node.js Serverless Function (通常是 AWS Lambda)
// 相比 Edge Runtime，Node 环境更稳定，且 IP段不同
export const config = {
  maxDuration: 10,
};

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = 'https://adobeid-na1.services.adobe.com/ims/check/v6/token' + url.search;

  // 1. 更加逼真的 Chrome 头部伪装
  const headers = {
    'Host': 'adobeid-na1.services.adobe.com', // 必须显式指定目标 Host
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://quick-actions.express.adobe.com',
    'Referer': 'https://quick-actions.express.adobe.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
  };

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method === 'POST' ? req.body : undefined,
    });

    const data = await response.text();

    if (!response.ok) {
      console.error('Adobe Token Proxy Error:', response.status, data);
      // 将上游错误透传给前端，而不是直接 500
      return res.status(response.status).send(data);
    }

    // 设置跨域头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(data);

  } catch (error) {
    console.error('Vercel Proxy Internal Error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
