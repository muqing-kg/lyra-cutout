import { createProxyMiddleware } from 'http-proxy-middleware';

// Disable Vercel's default body parsing to handle multipart/form-data streaming directly
export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

const proxy = createProxyMiddleware({
    target: 'https://sensei.adobe.io',
    changeOrigin: true,
    pathRewrite: {
        '^/api/adobe-predict': '',
        '^/adobe-api': ''
    },
    onProxyReq: (proxyReq) => {
        // Inject headers to spoof origin
        proxyReq.setHeader('Origin', 'https://quick-actions.express.adobe.com');
        proxyReq.setHeader('Referer', 'https://quick-actions.express.adobe.com/');
        // Ensure host header is correct for the target
        proxyReq.setHeader('Host', 'sensei.adobe.io');
    },
});

export default function handler(req, res) {
    return proxy(req, res);
}
