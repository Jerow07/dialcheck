import React, { useState } from 'react';
import type { Patient } from '../types';
import { X } from 'lucide-react';

interface PatientFormProps {
  initialData?: Partial<Patient>;
  onClose: () => void;
  onSave: (patient: Partial<Patient>) => void;
  title: string;
  hideOperationalFields?: boolean;
  hidePersonalFields?: boolean;
}

export const PatientForm = ({ initialData, onClose, onSave, title, hideOperationalFields, hidePersonalFields }: PatientFormProps) => {
  const [formData, setFormData] = useState<Partial<Patient>>(initialData || {
    shift: '1',
    floor: 1,
    status: 'Ocupada'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-8 md:p-10 rounded-[48px] w-full max-w-xl shadow-2xl relative max-h-[95vh] overflow-y-auto scrollbar-hide">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <h3 className="text-3xl font-black mb-8 tracking-tight">{title}</h3>
        

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Nombre del Paciente</label>
              <input 
                required
                readOnly={hidePersonalFields}
                type="text" 
                placeholder="Ej: Hector Rossi"
                value={formData.name || ''}
                className={`w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold focus:outline-none transition-all ${hidePersonalFields ? 'opacity-50 cursor-not-allowed' : 'focus:ring-4 focus:ring-blue-500/20'}`}
                onChange={hidePersonalFields ? undefined : e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            {!hidePersonalFields && (
              <div>
                <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Teléfono</label>
                <input 
                  type="text" 
                  placeholder="11 2233-4455"
                  value={formData.phone || ''}
                  className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            )}
            {!hidePersonalFields && (
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Dirección</label>
                <input 
                  type="text" 
                  placeholder="Calle 123, Localidad"
                  value={formData.address || ''}
                  className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            )}

            {!hideOperationalFields && (
              <>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Piso / Sector</label>
                  <select 
                    className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold appearance-none"
                    value={formData.floor || 1}
                    onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})}
                  >
                    <option value={1}>Piso 1 (16 Sillas)</option>
                    <option value={2}>Piso 2 (12 Sillas)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Turno</label>
                  <select 
                    className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold appearance-none"
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: e.target.value})}
                  >
                    <option value="1">Turno 1</option>
                    <option value="2">Turno 2</option>
                    <option value="3">Turno 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Silla ({formData.floor === 2 ? '1-12' : '1-16'})</label>
                  <input 
                    required
                    type="number" 
                    min="1" max={formData.floor === 2 ? 12 : 16}
                    value={formData.chairNumber || ''}
                    className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                    onChange={e => setFormData({...formData, chairNumber: parseInt(e.target.value)})}
                  />
                </div>
              </>
            )}

            {!hideOperationalFields && formData.id && (
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-2 block tracking-widest">Estado</label>
                <select 
                  className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold appearance-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as 'Ocupada' | 'Ausente'})}
                >
                  <option value="Ocupada">Ocupada</option>
                  <option value="Ausente">Ausente</option>
                </select>
              </div>
            )}

            {!hidePersonalFields && (
              <div className="col-span-2 mt-4 pt-4 border-t border-[var(--border-color)]">
                <label className="text-[10px] font-black uppercase opacity-40 ml-2 mb-4 block tracking-widest">Contacto de Emergencia</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black uppercase opacity-30 ml-2 mb-2 block tracking-widest">Parentesco</label>
                    <select 
                      className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold appearance-none"
                      value={formData.familyRelationship || 'Tutor'}
                      onChange={e => setFormData({...formData, familyRelationship: e.target.value})}
                    >
                      <option value="Hijo">Hijo</option>
                      <option value="Hija">Hija</option>
                      <option value="Padre">Padre</option>
                      <option value="Madre">Madre</option>
                      <option value="Tutor">Tutor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase opacity-30 ml-2 mb-2 block tracking-widest">Teléfono</label>
                    <input 
                      type="text" 
                      placeholder="11 5544-3322"
                      value={formData.familyContact || ''}
                      className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                      onChange={e => setFormData({...formData, familyContact: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 h-16 bg-[var(--bg-accent)] hover:opacity-80 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20"
            >
              {formData.id ? 'Guardar Cambios' : 'Registrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
