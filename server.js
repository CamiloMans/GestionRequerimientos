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
const parsedTimeoutMs = Number.parseInt(
  process.env.ACREDITACION_UPSTREAM_TIMEOUT_MS ?? '',
  10,
);
const UPSTREAM_TIMEOUT_MS = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
  ? parsedTimeoutMs
  : 120000;

app.use(express.json({ limit: '25mb' }));

app.post('/api/acreditacion/documentos/subir', async (req, res) => {
  const endpoint = `${ACREDITACION_LEGACY_API_BASE_URL}/api/acreditacion/documentos/subir`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const requestStartedAt = Date.now();

  try {
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
      endpoint,
      timeout: isTimeout,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      elapsedMs: Date.now() - requestStartedAt,
    });
  } finally {
    clearTimeout(timeout);
  }
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
