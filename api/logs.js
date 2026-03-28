import express from 'express';
import cors from 'cors';
import { kv } from '@vercel/kv';
import Redis from 'ioredis';

const app = express();
app.use(cors());
app.use(express.json());

// Max logs to prevent KV blowout
const MAX_LOGS = 100;

const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;
const isKVAvailable = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

app.get('/api/logs', async (req, res) => {
  let logs = [];

  if (redis) {
    try {
      const data = await redis.get('dialcheck_logs');
      if (data) logs = JSON.parse(data);
    } catch (err) {
      console.error('Error fetching logs from Redis', err);
    }
  } else if (isKVAvailable) {
    try {
      logs = await kv.get('dialcheck_logs') || [];
    } catch (err) {
      console.error('Error fetching logs', err);
    }
  }

  return res.json(Array.isArray(logs) ? logs : []);
});

app.post('/api/logs', async (req, res) => {
  const { user, action, patientName, detail, timestamp } = req.body;
  if (!user || !action || !patientName) {
    return res.status(400).json({ error: 'Missing required log fields' });
  }

  const newLog = {
    id: Date.now().toString(),
    user,
    action,
    patientName,
    detail: detail || '',
    timestamp: timestamp || new Date().toISOString()
  };

  if (redis) {
    try {
      let data = await redis.get('dialcheck_logs');
      let logs = data ? JSON.parse(data) : [];
      if (!Array.isArray(logs)) logs = [];
      logs.unshift(newLog); // Add to top
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
      }
      await redis.set('dialcheck_logs', JSON.stringify(logs));
    } catch (err) {
      console.error('Error saving log to Redis', err);
      return res.status(500).json({ error: `Error al guardar log en Redis: ${err.message}` });
    }
  } else if (isKVAvailable) {
    try {
      let logs = await kv.get('dialcheck_logs');
      if (!Array.isArray(logs)) logs = [];
      logs.unshift(newLog); // Add to top
      if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
      }
      await kv.set('dialcheck_logs', logs);
    } catch (err) {
      console.error('Error saving log to KV', err);
      return res.status(500).json({ error: `Error al guardar log en KV: ${err.message}` });
    }
  } else if (process.env.VERCEL) {
    // Si estamos en Vercel pero no hay KV, devolvemos éxito para no romper el flujo del frontend
    // aunque no se persista el log (o podríamos devolver error si es crítico)
    console.warn('Vercel KV not configured for logging');
  }

  return res.json({ success: true, log: newLog });
});

export default app;
