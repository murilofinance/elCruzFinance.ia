const fs = require('fs');
const path = require('path');

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
      return mod.default || mod;
    } catch (error) {
      lastError = error;
    }
  }
  return function failed(req, res) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        message: lastError instanceof Error ? lastError.message : 'Nest dist não encontrado',
        tried: candidates,
      }),
    );
  };
}

module.exports = loadHandler();
