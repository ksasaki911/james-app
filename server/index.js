import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, seedFromJSON } from './db.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use(function(req, res, next) {
  if (req.path.startsWith('/api')) {
    var start = Date.now();
    console.log('[REQ] ' + req.method + ' ' + req.path);
    res.on('finish', function() {
      console.log('[RES] ' + req.method + ' ' + req.path + ' ' + res.statusCode + ' (' + (Date.now() - start) + 'ms)');
    });
  }
  next();
});

// Initialize database on startup
async function startServer() {
  console.log('Initializing database...');
  await initDB();

  // Seed from JSON if DB is empty
  const jsonPath = path.join(__dirname, '../src/data/store-data.json');
  await seedFromJSON(jsonPath);

  // API routes
  app.use('/api', apiRouter);

  // API error handler — always return JSON, never HTML
  app.use('/api', (err, req, res, next) => {
    console.error(`API Error [${req.method} ${req.path}]:`, err.message);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // Serve static files from dist directory
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API, non-static routes
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      // If API route somehow falls through, return 404 JSON not HTML
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (req.path.startsWith('/api')) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      res.status(500).send('Internal Server Error');
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
