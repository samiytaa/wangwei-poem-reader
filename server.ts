import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { POEMS, VOLUMES, TOTAL } from './src/data/poems';
import { UserState } from './src/types';
import { spawn } from 'node:child_process';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'user_state.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read current user state from backend file
function readState(): UserState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading state file:', e);
  }
  return { counts: {}, notes: {}, favorites: {} };
}

// Write state to backend file
function writeState(state: UserState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing state file:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 49152;

  app.use(express.json({ limit: '10mb' }));

  // API Route: Get all poems
  app.get('/api/poems', (req, res) => {
    res.json({
      poems: POEMS,
      volumes: VOLUMES,
      total: TOTAL
    });
  });

  // API Route: Get user state
  app.get('/api/state', (req, res) => {
    const state = readState();
    res.json(state);
  });

  // API Route: Save user state
  app.post('/api/state', (req, res) => {
    const newState = req.body as UserState;
    if (newState && typeof newState === 'object') {
      const state = readState();
      // Merge or overwrite counts, notes, and favorites
      state.counts = { ...state.counts, ...newState.counts };
      state.notes = { ...state.notes, ...newState.notes };
      state.favorites = { ...state.favorites, ...newState.favorites };
      writeState(state);
      res.json({ success: true, state });
    } else {
      res.status(400).json({ error: 'Invalid state body' });
    }
  });

  // API Route: Bulk import user state
  app.post('/api/state/import', (req, res) => {
    const data = req.body;
    if (data && (data.counts || data.notes || data.favorites)) {
      const state = readState();
      if (data.counts) {
        state.counts = { ...state.counts, ...data.counts };
      }
      if (data.notes) {
        state.notes = { ...state.notes, ...data.notes };
      }
      if (data.favorites) {
        state.favorites = { ...state.favorites, ...data.favorites };
      }
      writeState(state);
      res.json({ success: true, state });
    } else {
      res.status(400).json({ error: 'Invalid import data' });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`Server running at ${url}`);
    if (process.env.OPEN_BROWSER === 'true') {
      const browser = spawn('cmd', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      browser.unref();
    }
  });
}

startServer();
