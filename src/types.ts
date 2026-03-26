export interface Patient {
  id: string;
  name: string;
  phone: string;
  address: string;
  familyContact: string; // Phone number
  familyRelationship: string; // "Hija", "Hijo", etc.
  shift: string; // "1", "2", "3"
  floor: number; // 1 or 2
  chairNumber: number; // 1-16 (Floor 1) or 1-12 (Floor 2)
  status: 'Ocupada' | 'Ausente';
  date: string; // YYYY-MM-DD
}

export interface Chair {
  number: number;
  patient?: Patient;
}
