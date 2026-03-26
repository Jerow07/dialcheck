import { useState } from 'react';
import type { Patient } from '../types';
import { X, Search, UserCheck } from 'lucide-react';

interface AssignPatientModalProps {
  patients: Patient[];
  onClose: () => void;
  onAssign: (patientId: string) => void;
  floor: number;
  chairNumber: number;
}

export const AssignPatientModal = ({ patients, onClose, onAssign, floor, chairNumber }: AssignPatientModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const unassignedPatients = patients.filter(p => 
    p.chairNumber === 0 && 
    (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-8 rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
          <h3 className="text-2xl font-black tracking-tight mb-1">Asignar Paciente</h3>
          <p className="text-xs font-bold opacity-40 uppercase tracking-widest text-blue-500">
            Silla {chairNumber} • Piso {floor}
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
            <Search size={18} />
          </div>
          <input 
            autoFocus
            type="text" 
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {unassignedPatients.length > 0 ? (
            unassignedPatients.map(p => (
              <button
                key={p.id}
                onClick={() => onAssign(p.id)}
                className="w-full p-5 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between group hover:bg-blue-500 transition-all text-left"
              >
                <div>
                  <h4 className="font-black text-sm group-hover:text-white transition-colors">{p.name}</h4>
                  <p className="text-[10px] font-bold opacity-40 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                    Hosp. {p.address.split(',')[0]}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <UserCheck size={18} className="text-blue-500 group-hover:text-white" />
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="opacity-40 italic font-medium">No hay pacientes disponibles para asignar</p>
              <p className="text-[10px] uppercase font-black tracking-widest mt-2">Usa "Nuevo Paciente" para registrar uno de cero</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <button 
            onClick={onClose}
            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest opacity-40 hover:opacity-100 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
