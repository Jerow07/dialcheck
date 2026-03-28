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
app.use(cors());
app.use(express.json());

// Persistence Helper
const DATA_FILE = path.join(__dirname, 'db/patients.json');

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
      return false; // On Vercel, if KV fails, we can't save to FS anyway
    }
  }
  
  // Fallback to local FS
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving patients to FS (likely read-only on Vercel):', err);
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

export default app;
