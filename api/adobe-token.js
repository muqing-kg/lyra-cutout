import { createProxyMiddleware } from 'http-proxy-middleware';

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    },
};

const proxy = createProxyMiddleware({
    target: 'https://adobeid-na1.services.adobe.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/adobe-token': '', // Remove /api/adobe-token prefix
        '^/adobe-token': ''      // Also handle /adobe-token prefix just in case
    },
    onProxyReq: (proxyReq) => {
        // Inject headers to bypass CORS and Referer checks
        proxyReq.setHeader('Origin', 'https://quick-actions.express.adobe.com');
        proxyReq.setHeader('Referer', 'https://quick-actions.express.adobe.com/');
    },
});

export default function handler(req, res) {
    // If request comes as /adobe-token/..., strip it manually for the middleware matching if needed
    // Vercel rewrites should handle this, but let's be safe.
    return proxy(req, res);
}
