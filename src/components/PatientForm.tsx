import React, { useState } from 'react';
import type { Patient } from '../types';
import { X } from 'lucide-react';

interface PatientFormProps {
  initialData?: Partial<Patient>;
  onClose: () => void;
  onSave: (patient: Partial<Patient>) => Promise<string | void> | void;
  title: string;
  patients: Patient[];
  hideOperationalFields?: boolean;
  hidePersonalFields?: boolean;
}

export const PatientForm = ({ initialData, onClose, onSave, title, patients, hideOperationalFields, hidePersonalFields }: PatientFormProps) => {
  const [formData, setFormData] = useState<Partial<Patient>>(() => {
    const data = initialData || {};
    return {
      shift: data.shift || '1',
      floor: data.floor || 1,
      status: data.status || 'Ocupada',
      ...data
    };
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    console.log('Iniciando guardado de paciente...', formData);
    
    try {
      if (!formData.name || formData.name.trim() === '') {
        setFormError("Por favor, ingresa el nombre del paciente.");
        return;
      }

      if (!hideOperationalFields && !formData.chairNumber) {
        setFormError("Por favor seleccione una silla disponible en el mapa.");
        return;
      }
      
      const currentName = (formData.name || '').toLowerCase().trim();
      const originalName = (initialData?.name || '').toLowerCase().trim();
      const isEditing = !!formData.id;
      const hasNameChanged = currentName !== originalName;
      
      if (hasNameChanged || !isEditing) {
        const patientsList = Array.isArray(patients) ? patients : [];
        const isDuplicate = patientsList.some(p => 
          p && p.name && 
          p.id !== formData.id && // Diferente ID
          p.name.toLowerCase().trim() === currentName // Mismo Nombre
        );

        if (isDuplicate) {
          setFormError(`Error: El nombre "${formData.name}" ya está registrado para otro paciente.`);
          return;
        }
      }

      console.log('Validaciones pasadas, llamando a onSave...');
      const errorResponse = await onSave(formData);
      if (typeof errorResponse === 'string') {
        setFormError(errorResponse);
      }
    } catch (err) {
      console.error('Error en el formulario:', err);
      setFormError("Ocurrió un error inesperado al procesar el formulario.");
    }
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
              <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Nombre del Paciente</label>
              <input 
                type="text" 
                placeholder="Ej: Hector Rossi"
                value={formData.name || ''}
                className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold focus:outline-none transition-all focus:ring-4 focus:ring-blue-500/20"
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 col-span-2">
              <div>
                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={formData.birthDate || ''}
                  className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                  onChange={e => setFormData({...formData, birthDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Teléfono</label>
                <input 
                  type="text" 
                  placeholder="11 2233-4455"
                  value={formData.phone || ''}
                  className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Dirección</label>
              <input 
                type="text" 
                placeholder="Calle 123, Localidad"
                value={formData.address || ''}
                className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold"
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            {!hideOperationalFields && (
              <>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Piso / Sector</label>
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
                  <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Turno</label>
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
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-4 block tracking-widest">Seleccionar Silla Disponible</label>
                  <div className={`p-6 bg-white/50 dark:bg-black/20 rounded-[32px] border border-[var(--border-color)] overflow-hidden`}>
                    <div className={formData.floor === 1 ? "grid grid-cols-8 gap-3" : "grid grid-cols-4 gap-3"}>
                      {(formData.floor === 2 ? [4,3,2,1,5,6,7,8,9,10,11,12] : Array.from({length: 16}, (_, i) => i + 1)).map(n => {
                        const occupant = patients.find(p => p.floor === formData.floor && p.shift === formData.shift && p.chairNumber === n && p.id !== formData.id);
                        const isSelected = formData.chairNumber === n;
                        
                        return (
                          <button
                            key={n}
                            type="button"
                            disabled={!!occupant}
                            onClick={() => setFormData({...formData, chairNumber: n})}
                            className={`aspect-square rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                              occupant 
                                ? 'bg-red-500/10 border-red-500/20 text-red-500/40 cursor-not-allowed' 
                                : isSelected
                                  ? 'bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110'
                                  : 'bg-[var(--bg-accent)] border-[var(--border-color)] hover:border-blue-500/50 text-[var(--text-primary)]/60 hover:text-blue-500'
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] font-medium opacity-30 mt-4 text-center uppercase tracking-tighter">
                      {formData.floor === 1 ? 'Vista simplificada: 1 al 16' : 'Disposición en U: Costados y Superior'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {!hideOperationalFields && formData.id && (
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-2 block tracking-widest">Estado</label>
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

              <div className="col-span-2 mt-4 pt-4 border-t border-[var(--border-color)]">
                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-4 block tracking-widest">Condiciones Médicas</label>
                <div className="flex gap-6 px-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={formData.isHypertensive || false}
                        onChange={e => setFormData({...formData, isHypertensive: e.target.checked})}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.isHypertensive ? 'bg-red-500 border-red-500 shadow-lg shadow-red-500/20' : 'bg-[var(--bg-accent)] border-[var(--border-color)]'}`}>
                        {formData.isHypertensive && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                      </div>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider transition-colors ${formData.isHypertensive ? 'text-red-500' : 'opacity-40'}`}>Hipertensión</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={formData.isDiabetic || false}
                        onChange={e => setFormData({...formData, isDiabetic: e.target.checked})}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.isDiabetic ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-[var(--bg-accent)] border-[var(--border-color)]'}`}>
                        {formData.isDiabetic && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                      </div>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-wider transition-colors ${formData.isDiabetic ? 'text-blue-500' : 'opacity-40'}`}>Diabético</span>
                  </label>
                </div>
              </div>

            {!hidePersonalFields && (
              <div className="col-span-2 mt-4 pt-4 border-t border-[var(--border-color)]">
                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-4 block tracking-widest">Contacto de Emergencia</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black uppercase opacity-50 ml-2 mb-2 block tracking-widest">Parentesco</label>
                    <select 
                      className="w-full h-14 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-2xl px-6 font-bold appearance-none"
                      value={formData.familyRelationship || 'Tutor'}
                      onChange={e => setFormData({...formData, familyRelationship: e.target.value})}
                    >
                      <option value="Hijo">Hijo</option>
                      <option value="Hija">Hija</option>
                      <option value="Esposo/a">Esposo/a</option>
                      <option value="Padre">Padre</option>
                      <option value="Madre">Madre</option>
                      <option value="Tutor">Tutor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase opacity-50 ml-2 mb-2 block tracking-widest">Teléfono</label>
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

          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in zoom-in-95 duration-200">
              {formError}
            </div>
          )}

          <div className="flex gap-4 pt-4">
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
