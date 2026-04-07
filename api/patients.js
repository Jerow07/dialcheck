import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { kv } from '@vercel/kv';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Persistence Helper
const DATA_FILE = path.join(__dirname, 'db/patients.json');

const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;
const isKVAvailable = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

if (process.env.VERCEL && !isKVAvailable && !redis) {
  console.warn('DIAGNOSTICO KV VERCEL:', {
    hasURL: !!process.env.KV_REST_API_URL,
    hasToken: !!process.env.KV_REST_API_TOKEN,
    env: Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS'))
  });
}

const getPatients = async () => {
  if (redis) {
    try {
      const data = await redis.get('dialcheck_patients');
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Redis get error:', err);
      // If we are on Vercel, don't fallback to FS (it's read-only)
      if (process.env.VERCEL) return [];
    }
  } else if (isKVAvailable) {
    try {
      const data = await kv.get('dialcheck_patients');
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('KV get error:', err);
      // If we are on Vercel, don't fallback to FS (it's read-only)
      if (process.env.VERCEL) return [];
    }
  }
  
  // Fallback to local FS (only for local dev)
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
  if (redis) {
    try {
      await redis.set('dialcheck_patients', JSON.stringify(data));
      return { success: true };
    } catch (err) {
      console.error('Redis set error:', err);
      return { success: false, error: err.message };
    }
  } else if (isKVAvailable) {
    try {
      await kv.set('dialcheck_patients', data);
      return { success: true };
    } catch (err) {
      console.error('KV set error:', err);
      return { success: false, error: err.message };
    }
  }
  
  // Fallback to local FS (only if not on Vercel)
  if (process.env.VERCEL) {
    const envKeys = Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS'));
    return { 
      success: false, 
      error: `Base de datos KV/Redis no detectada. Variables: [${envKeys.join(', ')}].` 
    };
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Error saving patients to FS:', err);
    return { success: false, error: err.message };
  }
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = getLocalDateString();


// GET all patients
app.get(['/api/patients', '/'], async (req, res) => {
  const patients = await getPatients();
  res.json(patients);
});

// POST new patient
app.post(['/api/patients', '/'], async (req, res) => {
  const body = req.body || {};
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate, isHypertensive, isDiabetic, dryWeight } = body;
  
  if (!name || !shift) {
    return res.status(400).json({ error: `Name and shift are required. Received name: "${name}", shift: "${shift}", all body keys: [${Object.keys(body).join(',')}]` });
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
    chairNumber: chairNumber !== undefined ? chairNumber : 0,
    status: status || 'Ocupada',
    date: date || today,
    birthDate: birthDate || '',
    isHypertensive: !!isHypertensive,
    isDiabetic: !!isDiabetic,
    dryWeight: dryWeight || ''
  };

  const patients = await getPatients();
  
  // VALIDACIÓN: No permitir duplicados el mismo día
  const isDuplicate = patients.some(p => 
    p.name.toLowerCase().trim() === name.toLowerCase().trim() && 
    p.date === (date || today)
  );

  if (isDuplicate) {
    return res.status(409).json({ error: `El paciente "${name}" ya tiene una silla asignada para el día ${(date || today)}.` });
  }

  patients.push(newPatient);
  const result = await savePatients(patients);
  if (!result.success) return res.status(500).json({ error: `Error en base de datos: ${result.error}` });
  res.status(201).json(newPatient);
});

// DELETE patient
app.delete(['/api/patients/:id', '/:id'], async (req, res) => {
  const { id } = req.params;
  const { name, global } = req.query;
  
  let patients = await getPatients();
  const initialLength = patients.length;

  if (global === 'true' && name) {
    // Delete all records with the same name
    patients = patients.filter(p => p.name.toLowerCase().trim() !== name.toLowerCase().trim());
  } else {
    // Standard delete by ID
    patients = patients.filter(p => p.id !== id);
  }
  
  if (patients.length === initialLength) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  const result = await savePatients(patients);
  if (!result.success) return res.status(500).json({ error: `Error al eliminar en base de datos: ${result.error}` });
  res.status(204).send();
});

// UPDATE patient
app.put(['/api/patients/:id', '/:id'], async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate, isHypertensive, isDiabetic, dryWeight } = req.body;
  
  const patients = await getPatients();
  const index = patients.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // VALIDACIÓN: No permitir duplicados el mismo día (exceto el mismo ID)
  if (name || date) {
    const checkName = name || patients[index].name;
    const checkDate = date || patients[index].date;
    const isDuplicate = patients.some(p => 
      p.id !== id &&
      p.name.toLowerCase().trim() === checkName.toLowerCase().trim() &&
      p.date === checkDate
    );

    if (isDuplicate) {
      return res.status(409).json({ error: `Conflicto: Ya existe un registro para "${checkName}" en la fecha ${checkDate}.` });
    }
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
  if (dryWeight !== undefined) patients[index].dryWeight = dryWeight;
  
  const result = await savePatients(patients);
  if (!result.success) return res.status(500).json({ error: `Error al actualizar en base de datos: ${result.error}` });
  res.json(patients[index]);
});

export default app;
