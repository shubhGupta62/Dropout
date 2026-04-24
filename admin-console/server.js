const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3200;
const BACKEND_URL = (process.env.ADMIN_BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function proxyRequest(req, res) {
  const splat = req.params.splat;
  const targetPath = Array.isArray(splat) ? splat.join('/') : (splat || '');
  const targetUrl = `${BACKEND_URL}/api/${targetPath}`;

  try {
    const headers = {};
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: 'Admin console could not reach backend',
      data: { error: error.message },
    });
  }
}

app.all('/api/*splat', proxyRequest);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Admin console running at http://localhost:${PORT}`);
});

module.exports = server;
