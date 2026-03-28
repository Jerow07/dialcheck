import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Persistence Helpers
const DATA_FILE = path.join(__dirname, 'patients.json');
const LOGS_FILE = path.join(__dirname, 'logs.json');

const defaultUsers = [
  { username: 'jeronimo1995', password: 'admin123', role: 'admin' },
];

const isKVAvailable = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

const getPatients = async () => {
  if (isKVAvailable) {
    try {
      const data = await kv.get('dialcheck_patients');
      if (data) return data;
    } catch (err) {
      console.error('KV get error:', err);
    }
  }
  // Fallback to local FS
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading patients from FS:', err);
  }
  return [];
};

const savePatients = async (data) => {
  if (isKVAvailable) {
    try {
      await kv.set('dialcheck_patients', data);
      return true;
    } catch (err) {
      console.error('KV set error:', err);
    }
  }
  
  // Fallback to local FS
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving patients to FS:', err);
    return false;
  }
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = getLocalDateString();

// Ensure all patients have a date on boot and initialize if empty
(async () => {
  let patients = await getPatients();
  let migrated = false;
  
  patients = patients.map(p => {
    if (!p.date) {
      migrated = true;
      return { ...p, date: today };
    }
    return p;
  });

  if (patients.length === 0) {
    migrated = true;
    patients = [
      {
        id: '1',
        name: 'Juan Pérez',
        shift: '1',
        floor: 1,
        chairNumber: 1,
        status: 'Ocupada',
        date: today
      }
    ];
  }

  if (migrated) {
    await savePatients(patients);
  }
})();

// GET all patients
app.get('/api/patients', async (req, res) => {
  const patients = await getPatients();
  res.json(patients);
});

// POST new patient
app.post('/api/patients', async (req, res) => {
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate, isHypertensive, isDiabetic } = req.body;
  
  if (!name || !shift || chairNumber === undefined) {
    return res.status(400).json({ error: 'Name, shift and chairNumber are required' });
  }

  const newPatient = {
    id: uuidv4(),
    name,
    phone: phone || '',
    address: address || '',
    familyContact: familyContact || '',
    familyRelationship: familyRelationship || 'Tutor',
    shift,
    floor: floor || 1,
    chairNumber,
    status: status || 'Ocupada',
    date: date || today,
    birthDate: birthDate || '',
    isHypertensive: !!isHypertensive,
    isDiabetic: !!isDiabetic
  };

  const patients = await getPatients();
  patients.push(newPatient);
  await savePatients(patients);
  res.status(201).json(newPatient);
});

// DELETE patient
app.delete('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  
  let patients = await getPatients();
  const initialLength = patients.length;
  patients = patients.filter(p => p.id !== id);
  
  if (patients.length === initialLength) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  await savePatients(patients);
  res.status(204).send();
});

// UPDATE patient
app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate, isHypertensive, isDiabetic } = req.body;
  
  const patients = await getPatients();
  const index = patients.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Update fields
  if (name) patients[index].name = name;
  if (phone !== undefined) patients[index].phone = phone;
  if (address !== undefined) patients[index].address = address;
  if (familyContact !== undefined) patients[index].familyContact = familyContact;
  if (familyRelationship !== undefined) patients[index].familyRelationship = familyRelationship;
  if (shift) patients[index].shift = shift;
  if (floor !== undefined) patients[index].floor = floor;
  if (chairNumber !== undefined) patients[index].chairNumber = chairNumber;
  if (status) patients[index].status = status;
  if (date) patients[index].date = date;
  if (birthDate !== undefined) patients[index].birthDate = birthDate;
  if (isHypertensive !== undefined) patients[index].isHypertensive = !!isHypertensive;
  if (isDiabetic !== undefined) patients[index].isDiabetic = !!isDiabetic;
  
  await savePatients(patients);
  res.json(patients[index]);
});

// AUTH LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Debes ingresar usuario y contraseña' });
  }

  let users = defaultUsers;

  if (isKVAvailable) {
    try {
      let kvUsers = await kv.get('dialcheck_users');
      if (!kvUsers) {
        await kv.set('dialcheck_users', defaultUsers);
        kvUsers = defaultUsers;
      }
      users = kvUsers;
    } catch (err) {
      console.error('Error de autenticación con KV:', err);
    }
  }

  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    const token = Buffer.from(`${user.username}-${Date.now()}`).toString('base64');
    return res.json({ 
      success: true, 
      token, 
      user: { username: user.username, role: user.role } 
    });
  }

  return res.status(401).json({ error: 'Credenciales inválidas o usuario incorrecto' });
});

// LOGS HELPERS
const getLogs = async () => {
  if (isKVAvailable) {
    try {
      const data = await kv.get('dialcheck_logs');
      if (data) return data;
    } catch (err) {
      console.error('KV get error:', err);
    }
  }
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading logs from FS:', err);
  }
  return [];
};

const saveLogs = async (data) => {
  if (isKVAvailable) {
    try {
      await kv.set('dialcheck_logs', data);
      return true;
    } catch (err) {
      console.error('KV set error:', err);
    }
  }
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving logs to FS:', err);
    return false;
  }
};

// LOGS ROUTES
app.get('/api/logs', async (req, res) => {
  const logs = await getLogs();
  return res.json(Array.isArray(logs) ? logs : []);
});

app.post('/api/logs', async (req, res) => {
  const { user, action, patientName, detail } = req.body;
  if (!user || !action || !patientName) return res.status(400).json({ error: 'Missing fields' });

  const newLog = {
    id: Date.now().toString(),
    user,
    action,
    patientName,
    detail: detail || '',
    timestamp: new Date().toISOString()
  };

  const logs = await getLogs();
  logs.unshift(newLog); // prepend
  const limitedLogs = logs.slice(0, 100);
  await saveLogs(limitedLogs);
  
  return res.json({ success: true, log: newLog });
});

// For local testing
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend de Dialcheck corriendo en http://localhost:${PORT}`);
  });
}

export default app;
