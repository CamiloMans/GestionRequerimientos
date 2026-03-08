import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ACREDITACION_LEGACY_API_BASE_URL =
  process.env.ACREDITACION_LEGACY_API_BASE_URL || 'http://34.74.6.124';
const ICSARA_API_BASE_URL =
  process.env.ICSARA_API_BASE_URL || 'http://34.74.6.124:8080';
const ICSARA_API_PREFIX =
  process.env.ICSARA_API_PREFIX || '/v1';
const ICSARA_API_KEY = process.env.ICSARA_API_KEY || '';
const parsedTimeoutMs = Number.parseInt(
  process.env.ACREDITACION_UPSTREAM_TIMEOUT_MS ?? '',
  10,
);
const UPSTREAM_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
  ? parsedTimeoutMs
  : 120000;

app.use(express.json({ limit: '300mb' }));

const proxyLegacyAcreditacionPost = async (req, res, upstreamPath) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const endpoint = `${ACREDITACION_LEGACY_API_BASE_URL}${upstreamPath}`;
  const requestStartedAt = Date.now();

  try {
    console.log(`[proxy] POST ${upstreamPath} -> ${endpoint}`);

    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
      signal: controller.signal,
    });

    const contentType = upstreamResponse.headers.get('content-type');
    const responseBody = await upstreamResponse.text();

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.status(upstreamResponse.status).send(responseBody);
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    res.status(502).json({
      error: 'Upstream API unavailable',
      endpoint: upstreamPath,
      timeout: isTimeout,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      elapsedMs: Date.now() - requestStartedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const proxyIcsaraRequest = async (
  req,
  res,
  { upstreamPath, method = 'GET', streamBody = false },
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const endpoint = `${ICSARA_API_BASE_URL}${ICSARA_API_PREFIX}${upstreamPath}`;
  const requestStartedAt = Date.now();

  try {
    console.log(`[proxy] ${method} ${upstreamPath} -> ${endpoint}`);

    const headers = {};
    if (ICSARA_API_KEY) {
      headers['x-api-key'] = ICSARA_API_KEY;
    }

    if (streamBody) {
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'];
      }
      if (req.headers['content-length']) {
        headers['content-length'] = req.headers['content-length'];
      }
    } else if (method !== 'GET' && method !== 'HEAD') {
      headers['content-type'] = 'application/json';
    }

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (streamBody) {
      fetchOptions.body = req;
      fetchOptions.duplex = 'half';
    } else if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body ?? {});
    }

    const upstreamResponse = await fetch(endpoint, fetchOptions);

    const contentType = upstreamResponse.headers.get('content-type');
    const contentDisposition = upstreamResponse.headers.get('content-disposition');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.status(upstreamResponse.status).send(responseBody);
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    res.status(502).json({
      error: 'Upstream API unavailable',
      endpoint: upstreamPath,
      timeout: isTimeout,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      elapsedMs: Date.now() - requestStartedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
};

app.post('/api/acreditacion/carpetas/crear', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/carpetas/crear');
});

app.post('/api/acreditacion/asignar-folder', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/asignar-folder');
});

app.post('/api/acreditacion/documentos/subir', async (req, res) => {
  await proxyLegacyAcreditacionPost(req, res, '/api/acreditacion/documentos/subir');
});

app.post('/api/acreditacion/adendas/jobs', async (req, res) => {
  const endpoint = `${ICSARA_API_BASE_URL}${ICSARA_API_PREFIX}/jobs`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstreamResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': ICSARA_API_KEY,
        ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
        ...(req.headers['content-length'] ? { 'content-length': req.headers['content-length'] } : {}),
      },
      body: req,
      duplex: 'half',
      signal: controller.signal,
    });

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const body = Buffer.from(await upstreamResponse.arrayBuffer());
    if (!upstreamResponse.ok) {
      const preview = body.toString('utf8').slice(0, 1000);
      console.error(
        `[proxy] ICSARA jobs upstream status=${upstreamResponse.status} endpoint=${endpoint} body=${preview}`,
      );
    }
    res.status(upstreamResponse.status).send(body);
  } catch (error) {
    console.error(`[proxy] Error calling ${endpoint}:`, error);
    res.status(502).json({ error: 'Upstream API unavailable', endpoint });
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/api/acreditacion/adendas/health/live', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: '/health/live',
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}`,
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId/result', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}/result`,
    method: 'GET',
  });
});

app.get('/api/acreditacion/adendas/jobs/:jobId/preguntas_clasificadas', async (req, res) => {
  await proxyIcsaraRequest(req, res, {
    upstreamPath: `/jobs/${encodeURIComponent(req.params.jobId)}/result/preguntas_clasificadas.json`,
    method: 'GET',
  });
});

// Serve static files from the dist folder
app.use(express.static(join(__dirname, 'dist')));

// Serve index.html for all routes (React Router SPA)
app.get('*', (req, res) => {
  try {
    const indexPath = join(__dirname, 'dist', 'index.html');
    const indexContent = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
