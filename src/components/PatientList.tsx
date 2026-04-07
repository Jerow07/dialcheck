import { useState } from 'react';
import type { Patient } from '../types';
import { Search, MapPin, Phone, Users, History, ClipboardList, Trash2, Edit, Thermometer, Droplets, Plus, Weight } from 'lucide-react';
import { PatientForm } from './PatientForm';

const API_URL = '/api/patients';

interface PatientListProps {
  patients: Patient[];
  onRefresh: () => void;
  currentUser?: string;
}

export const PatientList = ({ patients, onRefresh, currentUser }: PatientListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (patientData: Partial<Patient>): Promise<string | void> => {
    try {
      const isEditing = !!patientData.id;
      const url = isEditing ? `${API_URL}/${patientData.id}` : API_URL;
      const method = isEditing ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });

      if (resp.ok) {
        // Log action
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: currentUser || 'Admin',
            action: isEditing ? 'EDICIÓN' : 'REGISTRO',
            patientName: patientData.name,
            detail: isEditing ? 'Ficha técnica editada desde el Directorio' : 'Nuevo paciente registrado en el sistema'
          })
        }).catch(console.error);

        onRefresh();
        setShowForm(false);
        setEditingPatient(null);
      } else {
        const data = await resp.json().catch(() => ({}));
        return `Error del servidor al guardar: ${data.error || 'Intenta de nuevo'}`;
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      return 'Error de conexión con el servidor.';
    }
  };

  const deletePatient = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este paciente del directorio?')) return;
    try {
      const patient = patients.find(p => p.id === id);
      const resp = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        if (patient) {
          fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: currentUser || 'Admin',
              action: 'ELIMINACIÓN',
              patientName: patient.name,
              detail: `Paciente eliminado permanentemente del Directorio`
            })
          }).catch(console.error);
        }
        onRefresh();
      } else {
        const data = await resp.json().catch(() => ({}));
        alert(`Error al eliminar: ${data.error || 'No se pudo completar la operación'}`);
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert("Error de conexión al intentar eliminar al paciente.");
    }
  };

  return (
    <div className="w-full space-y-8 pb-20">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[var(--bg-accent)] p-4 md:p-8 rounded-[32px] md:rounded-[40px] border border-[var(--border-color)] backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 shrink-0">
            <ClipboardList className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight">Directorio de Pacientes</h2>
            <p className="opacity-40 font-medium text-[10px] md:text-base">Búsqueda y Fichas Técnicas</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 w-full md:w-auto">
          <button 
            onClick={() => {
              setEditingPatient(null);
              setShowForm(true);
            }}
            className="h-12 md:h-14 px-4 md:px-8 bg-blue-500 text-white hover:bg-blue-600 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            Nuevo Registro
          </button>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 md:h-14 bg-black/5 dark:bg-black/40 border border-[var(--border-color)] rounded-xl md:rounded-2xl pl-12 md:pl-16 pr-6 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm md:text-base"
            />
          </div>
        </div>
    </div>

      {/* Patients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredPatients.map((patient) => (
          <div 
            key={patient.id}
            className="group bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-[32px] md:rounded-[40px] p-5 md:p-8 hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/5 relative overflow-hidden"
          >
            {/* Top Info */}
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Users className="text-blue-500" size={24} />
              </div>
            </div>

            <h3 className="text-2xl font-black mb-1 tracking-tight">{patient.name}</h3>
            
            <div className="flex gap-2 mb-6">
              {patient.isHypertensive && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 scale-90 origin-left">
                  <Thermometer size={10} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Hipertenso</span>
                </div>
              )}
              {patient.isDiabetic && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 scale-90 origin-left">
                  <Droplets size={10} strokeWidth={3} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Diabético</span>
                </div>
              )}
              {!patient.isHypertensive && !patient.isDiabetic && (
                <div className="h-6" /> // Spacer
              )}
            </div>

            {/* Technical File */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <Phone size={14} />
                </div>
                <span className="text-sm font-bold">{patient.phone || 'N/A'}</span>
              </div>
              
              <div className="flex items-center gap-4 opacity-60">
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                <span className="text-sm font-bold truncate">{patient.address || 'Sin dirección'}</span>
              </div>

              {patient.dryWeight && (
                <div className="flex items-center gap-4 text-blue-600 dark:text-blue-400">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Weight size={14} />
                  </div>
                  <span className="text-sm font-black italic">Peso Seco: {patient.dryWeight} kg</span>
                </div>
              )}

              <div className="flex items-center gap-4 opacity-60 text-blue-500">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <History size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Piso {patient.floor} • Silla {patient.chairNumber}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Turno {patient.shift}</span>
                </div>
              </div>
            </div>

            {/* Contacto de Emergencia */}
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 block mb-3">Contacto de Emergencia</span>
              <p className="text-sm font-bold opacity-80">
                <span className="text-blue-500 mr-2">{patient.familyRelationship || 'Tutor'}:</span>
                {patient.familyContact || 'Sin contacto'}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  setEditingPatient(patient);
                  setShowForm(true);
                }}
                className="flex-1 h-12 bg-blue-500 text-white hover:bg-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Edit size={14} />
                Editar Ficha
              </button>
              <button 
                onClick={() => deletePatient(patient.id)}
                className="w-12 h-12 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all text-red-500"
                title="Eliminar del sistema"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <ClipboardList size={48} className="mx-auto mb-4" />
            <p className="text-lg font-bold">No se encontraron pacientes</p>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showForm && (
        <PatientForm 
          title={editingPatient ? "Editar Ficha Técnica" : "Nuevo Registro Clínico"}
          initialData={editingPatient || undefined}
          patients={patients}
          hideOperationalFields={true}
          onClose={() => {
            setShowForm(false);
            setEditingPatient(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
