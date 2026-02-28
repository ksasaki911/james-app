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

// Initialize database on startup
async function startServer() {
  console.log('Initializing database...');
  await initDB();

  // Seed from JSON if DB is empty
  const jsonPath = path.join(__dirname, '../src/data/store-data.json');
  await seedFromJSON(jsonPath);

  // API routes
  app.use('/api', apiRouter);

  // Serve static files from dist directory
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API, non-static routes
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
