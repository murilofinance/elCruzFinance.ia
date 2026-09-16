const fs = require('fs');
const path = require('path');

function jsonError(res, payload) {
  if (res.headersSent) {
    return;
  }
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function loadHandler() {
  const candidates = [
    path.join(__dirname, 'nest', 'main.vercel.js'),
    path.join(__dirname, '..', 'dist', 'main.vercel.js'),
  ];
  let lastError;
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) {
        continue;
      }
      const mod = require(file);
      const handler = mod.default || mod;
      if (typeof handler !== 'function') {
        throw new Error(`Handler inválido em ${file}: ${typeof handler}`);
      }
      return handler;
    } catch (error) {
      lastError = error;
    }
  }
  return function failed(_req, res) {
    jsonError(res, {
      ok: false,
      message:
        lastError instanceof Error ? lastError.message : 'Nest dist não encontrado',
      tried: candidates,
    });
  };
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type',
  );
}

const nestHandler = loadHandler();

module.exports = async function wrapped(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    await nestHandler(req, res);
  } catch (error) {
    jsonError(res, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
