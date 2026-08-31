import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { classifyWithClaude, extractAcreageAcres, type ClassifyTap } from './api/_classify-core';
import { issueSttToken } from './api/_stt-token-core';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(appDir, '../../packages/shared/src');

/**
 * Local-dev stand-in for the Vercel serverless function at api/classify.ts —
 * same classification core, so the Anthropic key stays server-side (in this
 * Node dev-server process) whether you're running `npm run dev` or deployed.
 * Read ANTHROPIC_API_KEY from apps/agent/.env (see .env.example).
 */
function amberClassifyDevMiddleware(apiKey: string | undefined): Plugin {
  return {
    name: 'amber-classify-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/classify', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
        });
        req.on('end', () => {
          void (async () => {
            res.setHeader('content-type', 'application/json');
            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in apps/agent/.env — see .env.example' }));
              return;
            }
            try {
              const { question, transcript, taps } = JSON.parse(raw) as {
                question: string;
                transcript: string;
                taps: ClassifyTap[];
              };
              const result = await classifyWithClaude(apiKey, question, transcript, taps);
              res.end(JSON.stringify(result ?? { bucketId: null, confidence: 0 }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          })();
        });
      });
    },
  };
}

/**
 * Round 28 — local-dev stand-in for the Vercel serverless function at
 * api/extract-acreage.ts. Same key/model as amberClassifyDevMiddleware
 * above, separate narrow-contract endpoint — see _classify-core.ts's
 * extractAcreageAcres for why this is a second call, not folded into
 * /api/classify.
 */
function extractAcreageDevMiddleware(apiKey: string | undefined): Plugin {
  return {
    name: 'extract-acreage-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/extract-acreage', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
        });
        req.on('end', () => {
          void (async () => {
            res.setHeader('content-type', 'application/json');
            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in apps/agent/.env — see .env.example' }));
              return;
            }
            try {
              const { question, transcript, state } = JSON.parse(raw) as { question: string; transcript: string; state?: string };
              const acres = await extractAcreageAcres(apiKey, question, transcript, state);
              res.end(JSON.stringify({ acres }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(e) }));
            }
          })();
        });
      });
    },
  };
}

/**
 * Round 24 — local-dev stand-in for the Vercel serverless function at
 * api/stt-token.ts. Issues a short-lived, single-use ElevenLabs token
 * server-side so the real ELEVENLABS_API_KEY never reaches the browser —
 * same reasoning as amberClassifyDevMiddleware above, different provider.
 */
function sttTokenDevMiddleware(apiKey: string | undefined): Plugin {
  return {
    name: 'stt-token-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/stt-token', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        void (async () => {
          res.setHeader('content-type', 'application/json');
          if (!apiKey) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY not set in apps/agent/.env — see .env.example' }));
            return;
          }
          const result = await issueSttToken(apiKey);
          if (!result) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'ElevenLabs token issuance failed' }));
            return;
          }
          res.end(JSON.stringify(result));
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appDir, '');
  return {
    plugins: [
      react(),
      amberClassifyDevMiddleware(env.ANTHROPIC_API_KEY),
      extractAcreageDevMiddleware(env.ANTHROPIC_API_KEY),
      sttTokenDevMiddleware(env.ELEVENLABS_API_KEY),
    ],
    resolve: {
      alias: {
        '@vkyc/shared': sharedSrc,
        '@agent': path.resolve(appDir, 'src'),
        // TEMPORARY: private registry (cashfreepayments.jfrog.io) has no
        // credentials on this machine — see src/vendor/cashmere-stub.tsx.
        '@cashfree-intl/cashmere': path.resolve(appDir, 'src/vendor/cashmere-stub.tsx'),
      },
    },
    server: {
      port: 4000,
      strictPort: false,
      host: true,
    },
  };
});
