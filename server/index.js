const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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
  return []; // Default initial data if file doesn't exist
};

const savePatients = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving patients:', err);
  }
};

let patients = loadPatients();

// Migration: ensure all patients have a date
const today = new Date().toISOString().split('T')[0];
let migrated = false;
patients = patients.map(p => {
  if (!p.date) {
    migrated = true;
    return { ...p, date: today };
  }
  return p;
});
if (migrated) savePatients(patients);

// Initial data if empty
if (patients.length === 0) {
  patients = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '11 2233-4455',
      address: 'Av. Corrientes 1234, CABA',
      familyContact: '11 5544-3322',
      familyRelationship: 'Hijo',
      shift: '1',
      floor: 1,
      chairNumber: 1,
      status: 'Ocupada'
    }
  ];
  savePatients(patients);
}

// GET all patients
app.get('/api/patients', (req, res) => {
  res.json(patients);
});

// POST new patient
app.post('/api/patients', (req, res) => {
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date } = req.body;
  
  if (!name || !shift || chairNumber === undefined) {
    return res.status(400).json({ error: 'Name, shift and chairNumber are required' });
  }

  const newPatient = {
    id: uuidv4(),
    name,
    phone,
    address,
    familyContact,
    familyRelationship: familyRelationship || 'Tutor',
    shift,
    floor: floor || 1,
    chairNumber,
    status: status || 'Ocupada',
    date: date || today
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
  const { name, phone, address, familyContact, familyRelationship, shift, floor, chairNumber, status, date } = req.body;
  
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
  savePatients(patients);
  res.json(patients[index]);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend de Dialcheck corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
