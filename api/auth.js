import express from 'express';
import cors from 'cors';
import { kv } from '@vercel/kv';

const app = express();
app.use(cors());
app.use(express.json());

const defaultUsers = [
  { username: 'jeronimo1995', password: 'admin123', role: 'admin' },
];

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Debes ingresar usuario y contraseña' });
  }

  const isKVAvailable = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  let users = defaultUsers;

  if (isKVAvailable) {
    try {
      let kvUsers = await kv.get('dialcheck_users');
      if (!kvUsers) {
        // Seed initial admin account into DB if empty
        await kv.set('dialcheck_users', defaultUsers);
        kvUsers = defaultUsers;
      }
      users = kvUsers;
    } catch (err) {
      console.error('Error de autenticación con KV:', err);
    }
  }

  // Find exact match
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Issue simple session token (base64 encoded identity mark for frontend localstorage)
    const token = Buffer.from(`${user.username}-${Date.now()}`).toString('base64');
    return res.json({ 
      success: true, 
      token, 
      user: { username: user.username, role: user.role } 
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas o usuario incorrecto' });
});

export default app;
