import { useState } from 'react';
import type { Patient } from '../types';
import { X, Search, UserCheck, Plus } from 'lucide-react';

interface AssignPatientModalProps {
  patients: Patient[];
  onClose: () => void;
  onAssign: (patientId: string) => void;
  onRegisterNew: () => void;
  floor: number;
  chairNumber: number;
  selectedDate: string;
}

export const AssignPatientModal = ({ 
  patients, 
  onClose, 
  onAssign, 
  onRegisterNew, 
  floor, 
  chairNumber,
  selectedDate
}: AssignPatientModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const searchFiltered = patients.filter(p => 
    searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availablePatients = searchFiltered.filter(p => p.date !== selectedDate);
  const assignedToday = searchFiltered.filter(p => p.date === selectedDate);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-5 md:p-8 rounded-[32px] md:rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-5 md:top-6 right-5 md:right-6 w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-black tracking-tight mb-1">Asignar Paciente</h3>
          <p className="text-[10px] md:text-xs font-bold opacity-60 uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Silla {chairNumber} • Piso {floor}
          </p>
        </div>

        <div className="relative mb-5 md:mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
            <Search size={18} />
          </div>
          <input 
            autoFocus
            type="text" 
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-12 md:h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl md:rounded-2xl pl-12 pr-6 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
          />
        </div>

        <div className="space-y-4 md:space-y-6 max-h-[350px] md:max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
          {availablePatients.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3 block">Pacientes del Directorio (Asignar Nuevo)</span>
              <div className="space-y-2">
                {availablePatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onAssign(p.id)}
                    className="w-full p-4 bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/40 rounded-2xl flex items-center justify-between group transition-all text-left"
                  >
                    <div>
                      <h4 className="font-black text-sm text-[var(--text-primary)]">{p.name}</h4>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Crear registro para hoy</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Plus size={16} className="text-emerald-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {assignedToday.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3 block">Ya Asignados Hoy (Mover Silla)</span>
              <div className="space-y-2">
                {assignedToday.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onAssign(p.id)}
                    className="w-full p-4 bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/40 rounded-2xl flex items-center justify-between group transition-all text-left opacity-70 hover:opacity-100"
                  >
                    <div>
                      <h4 className="font-black text-sm text-[var(--text-primary)]">{p.name}</h4>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                        Cambiar lugar • Silla {p.chairNumber}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <UserCheck size={16} className="text-amber-500" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchFiltered.length === 0 && (
            <div className="py-12 text-center">
              <p className="opacity-60 italic font-medium">No se encontraron pacientes</p>
              <p className="text-[10px] uppercase font-black tracking-widest mt-2">Usa "Nuevo Registro" para crear uno nuevo</p>
            </div>
          )}
        </div>

        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-[var(--border-color)] flex flex-col gap-2 md:gap-3">
          <button 
            onClick={onRegisterNew}
            className="w-full h-12 md:h-14 bg-blue-500/10 text-blue-500 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
          >
            Nuevo Registro
          </button>
          <button 
            onClick={onClose}
            className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest opacity-60 hover:opacity-100 transition-all bg-[var(--bg-accent)] md:bg-transparent"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
