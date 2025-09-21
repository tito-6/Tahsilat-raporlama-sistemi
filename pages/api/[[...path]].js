import { createProxyMiddleware } from 'http-proxy-middleware';

// Create proxy middleware
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8000', // Your FastAPI server
  changeOrigin: true,
  pathRewrite: {
    '^/api/': '/api/' // Keep the /api prefix
  },
});

// Export the config
export const config = {
  api: {
    bodyParser: false,
  },
};

// Export the handler
export default function handler(req, res) {
  apiProxy(req, res, (result) => {
    if (result instanceof Error) {
      throw result;
    }
    throw new Error(`Request '${req.url}' is not proxied! Check your proxy configuration.`);
  });
}