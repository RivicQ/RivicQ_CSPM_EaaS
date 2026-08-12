const { createProxyMiddleware } = require('http-proxy-middleware');

// Only proxy API calls — never forward SPA routes like /platform/login to the Go backend.
module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_PROXY || 'http://localhost:9090',
      changeOrigin: true,
    })
  );
};
