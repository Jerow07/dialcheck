import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Persistence Helper
const DATA_FILE = path.join(__dirname, 'patients.json');

const loadPatients = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading patients:', err);
  }
  return [];
};

const savePatients = (data) => {
  try {
    // Note: Writing to disk will fail in Vercel Serverless environment
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving patients (likely read-only fs):', err);
    return false;
  }
};

let patients = loadPatients();

// Migration: ensure all patients have a date
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = getLocalDateString();
let migrated = false;
patients = patients.map(p => {
  if (!p.date) {
    migrated = true;
    return { ...p, date: p.date || today };
  }
  return p;
});
if (migrated) {
  savePatients(patients); // Silent fail ok on Vercel
}

// Initial data if empty
if (patients.length === 0) {
  const initialData = [
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
  patients = initialData;
  savePatients(patients);
}

// GET all patients
app.get('/api/patients', (req, res) => {
  res.json(patients);
});

// POST new patient
app.post('/api/patients', (req, res) => {
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate } = req.body;
  
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
    birthDate: birthDate || ''
  };

  patients.push(newPatient);
  savePatients(patients);
  res.status(201).json(newPatient);
});

// DELETE patient
app.delete('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = patients.length;
  patients = patients.filter(p => p.id !== id);
  
  if (patients.length === initialLength) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  savePatients(patients);
  res.status(204).send();
});

// UPDATE patient
app.put('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date, birthDate } = req.body;
  
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
  
  savePatients(patients);
  res.json(patients[index]);
});

// For local testing
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Backend de Dialcheck corriendo en http://localhost:${PORT}`);
  });
}

export default app;
