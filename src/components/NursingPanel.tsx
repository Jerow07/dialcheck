import { useState } from 'react';
import type { Patient } from '../types';
import { UserPlus, Users, CheckCircle2, UserX, Edit2, Activity, Stethoscope } from 'lucide-react';
import { PatientForm } from './PatientForm';
import { AssignPatientModal } from './AssignPatientModal';

const API_URL = '/api/patients';

interface NursingPanelProps {
  patients: Patient[];
  onRefresh: () => void;
}

export const NursingPanel = ({ patients, onRefresh }: NursingPanelProps) => {
  const [selectedShift, setSelectedShift] = useState('1');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [rotation, setRotation] = useState<'AM' | 'PM'>('AM'); // For Turno 2 (12-14 vs 14-16)

  // Map of nurses per block (1-4) for Piso 1.
  // Morning includes T1 and T2-AM. Afternoon includes T2-PM and T3.
  const getNurseName = (floor: number, block: number) => {
    const isAfternoon = selectedShift === '3' || (selectedShift === '2' && rotation === 'PM');
    if (floor === 1) {
      const names = isAfternoon 
        ? ['Enf. Tarde 1', 'Enf. Tarde 2', 'Enf. Tarde 3', 'Enf. Tarde 4']
        : ['Enf. Mañana 1', 'Enf. Mañana 2', 'Enf. Mañana 3', 'Enf. Mañana 4'];
      return names[block - 1] || `Enf. ${block}`;
    } else {
      const names = isAfternoon
        ? ['Enf. P2 Tarde 1', 'Enf. P2 Tarde 2', 'Enf. P2 Tarde 3']
        : ['Enf. P2 Mañana 1', 'Enf. P2 Mañana 2', 'Enf. P2 Mañana 3'];
      return names[block - 1] || `Enf. P2 ${block}`;
    }
  };
  const [selectedChair, setSelectedChair] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const checkAndReleaseCollision = async (chairNumber: number, shift: string, floor: number, excludeId?: string) => {
    const occupant = patients.find(p => 
      p.floor === floor && 
      p.shift === shift && 
      p.chairNumber === chairNumber && 
      p.id !== excludeId
    );

    if (occupant) {
      if (window.confirm(`La silla ${chairNumber} ya está ocupada por ${occupant.name}. ¿Deseas liberar al paciente anterior y asignar a este?`)) {
        await fetch(`${API_URL}/${occupant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chairNumber: 0 })
        });
        return true;
      }
      return false;
    }
    return true;
  };

  const handleSave = async (patientData: Partial<Patient>) => {
    try {
      const isEditing = !!patientData.id;
      
      // Check collision if chair/shift/floor is being set
      if (patientData.chairNumber && patientData.shift && patientData.floor) {
        const canProceed = await checkAndReleaseCollision(
          patientData.chairNumber,
          patientData.shift,
          patientData.floor,
          patientData.id
        );
        if (!canProceed) return;
      }

      const url = isEditing ? `${API_URL}/${patientData.id}` : API_URL;
      const method = isEditing ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });

      if (resp.ok) {
        onRefresh();
        setShowForm(false);
        setEditingPatient(null);
      }
    } catch (err) {
      console.error('Error saving patient:', err);
    }
  };

  const releaseChair = async (id: string) => {
    if (!window.confirm('¿Liberar esta silla? (El paciente permanecerá en el sistema)')) return;
    try {
      await fetch(`${API_URL}/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chairNumber: 0 })
      });
      onRefresh();
    } catch (err) {
      console.error('Error releasing chair:', err);
    }
  };

  const handleAssign = async (patientId: string) => {
    if (!selectedChair) return;
    try {
      // Check collision
      const canProceed = await checkAndReleaseCollision(
        selectedChair,
        selectedShift,
        selectedFloor,
        patientId
      );
      if (!canProceed) return;

      const resp = await fetch(`${API_URL}/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chairNumber: selectedChair,
          shift: selectedShift,
          floor: selectedFloor,
          status: 'Ocupada'
        })
      });

      if (resp.ok) {
        onRefresh();
        setShowAssignModal(false);
        setSelectedChair(null);
      }
    } catch (err) {
      console.error('Error assigning patient:', err);
    }
  };

  const renderChair = (chairNumber: number) => {
    const chair = {
      number: chairNumber,
      patient: patients.find(p => p.shift === selectedShift && p.floor === selectedFloor && p.chairNumber === chairNumber)
    };

    return (
      <div
        key={chair.number}
        onClick={() => {
          if (!chair.patient) {
            setEditingPatient(null);
            setSelectedChair(chair.number);
            setShowAssignModal(true);
          }
        }}
        className={`aspect-square rounded-[18px] p-2 flex flex-col items-center justify-center text-center transition-all border-2 relative group cursor-pointer ${
          chair.patient 
            ? chair.patient.status === 'Ocupada'
              ? 'bg-blue-500/10 border-blue-500/30 shadow-inner cursor-default'
              : 'bg-orange-500/10 border-orange-500/30 cursor-default'
            : 'bg-[var(--bg-primary)] border-dashed border-[var(--border-color)] opacity-60 hover:opacity-100 hover:scale-[1.02] hover:bg-blue-500/5'
        }`}
      >
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {chair.patient && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPatient(chair.patient!);
                  setShowForm(true);
                }}
                className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  releaseChair(chair.patient!.id);
                }}
                className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
              >
                <UserX size={14} />
              </button>
            </>
          )}
        </div>

        <span className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Silla {chair.number}</span>
        
        {chair.patient ? (
          <div className="flex flex-col items-center w-full px-1">
            <span className="text-[13px] font-black tracking-tight leading-tight truncate w-full">{chair.patient.name}</span>
            <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-black/20 shadow-sm border border-[var(--border-color)]">
              {chair.patient.status === 'Ocupada' ? (
                <CheckCircle2 size={10} className="text-blue-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
              <span className={`text-[8px] font-black uppercase tracking-widest ${
                chair.patient.status === 'Ocupada' ? 'text-blue-500' : 'text-orange-500'
              }`}>
                {chair.patient.status}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] font-black uppercase tracking-tighter opacity-20">Libre</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header & Shift Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[var(--bg-accent)] p-8 rounded-[40px] border border-[var(--border-color)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
            <Users className="text-white" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Panel de Enfermería</h2>
            <p className="opacity-40 font-medium">Gestión de Sillas y Pacientes</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex bg-black/5 dark:bg-black/40 p-1.5 rounded-2xl border border-[var(--border-color)]">
            {[1, 2].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`flex-1 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  selectedFloor === f 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'opacity-40 hover:opacity-100'
                }`}
              >
                Piso {f}
              </button>
            ))}
          </div>

          <div className="flex bg-black/5 dark:bg-black/40 p-1.5 rounded-2xl border border-[var(--border-color)]">
            {['1', '2', '3'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedShift(s)}
                className={`flex flex-col items-center px-6 py-2 rounded-xl font-black transition-all ${
                  selectedShift === s 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-[1.05]' 
                    : 'opacity-40 hover:opacity-100 hover:bg-blue-500/5'
                }`}
              >
                <span className="text-xs uppercase tracking-widest">Turno {s}</span>
                <span className={`text-[10px] opacity-70 ${selectedShift === s ? 'text-white' : 'text-blue-500'}`}>
                  {s === '1' ? '07 - 11hs' : s === '2' ? '12 - 16hs' : '17 - 21hs'}
                </span>
              </button>
            ))}
          </div>

          {selectedShift === '2' && (
            <div className="flex justify-between bg-orange-500/10 p-1 rounded-xl border border-orange-500/20 animate-in fade-in slide-in-from-left-4">
              <button
                onClick={() => setRotation('AM')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                  rotation === 'AM' ? 'bg-orange-500 text-white shadow-md' : 'opacity-40 hover:opacity-100'
                }`}
              >
                Pre-14hs (AM)
              </button>
              <button
                onClick={() => setRotation('PM')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                  rotation === 'PM' ? 'bg-orange-500 text-white shadow-md' : 'opacity-40 hover:opacity-100'
                }`}
              >
                Post-14hs (PM)
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            setEditingPatient(null);
            setSelectedChair(null);
            setShowForm(true);
          }}
          className="px-8 h-14 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center gap-3 shadow-xl"
        >
          <UserPlus size={18} />
          Nuevo Paciente
        </button>
      </div>

      {/* Realistic Chair Layout */}
      {selectedFloor === 1 ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Sector 1 (8 sillas en bloques de 4) */}
            <div className="bg-[var(--bg-accent)]/30 p-8 rounded-[48px] border border-[var(--border-color)]">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-8 text-center italic">Sector ESTE</h3>
              
              <div className="grid grid-cols-2 gap-6 relative">
                {/* Block 1 (1-4) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(1, 1)}</span>
                  </div>
                  {[1, 2, 3, 4].map(n => renderChair(n))}
                </div>
                {/* Block 2 (5-8) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(1, 2)}</span>
                  </div>
                  {[5, 6, 7, 8].map(n => renderChair(n))}
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/10 -translate-x-1/2 hidden md:block" />
              </div>
            </div>

            {/* Sector 2 (8 sillas en bloques de 4) */}
            <div className="bg-[var(--bg-accent)]/30 p-8 rounded-[48px] border border-[var(--border-color)]">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-8 text-center italic">Sector OESTE</h3>
              <div className="grid grid-cols-2 gap-6 relative">
                {/* Block 3 (9-12) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(1, 3)}</span>
                  </div>
                  {[9, 10, 11, 12].map(n => renderChair(n))}
                </div>
                {/* Block 4 (13-16) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(1, 4)}</span>
                  </div>
                  {[13, 14, 15, 16].map(n => renderChair(n))}
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/10 -translate-x-1/2 hidden md:block" />
              </div>
            </div>
          </div>

          {/* Fictitious Nursing Station & Doctor at the bottom */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            {/* Doctor in Charge */}
            <div className="bg-orange-500/10 border border-orange-500/30 px-10 py-6 rounded-[32px] flex items-center gap-4 backdrop-blur-md shadow-xl group">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Responsable</h4>
                <p className="text-sm font-black uppercase tracking-tighter text-orange-500">Doctor a cargo</p>
              </div>
            </div>

            {/* Central Nursing Station */}
            <div className="bg-blue-600/10 border border-blue-500/30 px-60 py-6 rounded-[32px] flex items-center gap-16 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={20} />
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={20} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-500">Estación Central de Enfermería</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Monitoreo en tiempo real • Piso 1</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="bg-[var(--bg-accent)]/30 p-12 rounded-[64px] border border-[var(--border-color)]">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-12 text-center italic">Distribución en U (1-12)</h3>
            <div className="max-w-4xl mx-auto">
              {/* Top Row (4 chairs) - Block 2 */}
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 w-fit mx-auto">
                  <Users size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(2, 2)}</span>
                </div>
                <div className="grid grid-cols-4 gap-6">
                  {[5, 6, 7, 8].map(n => renderChair(n))}
                </div>
              </div>

              {/* Middle Section (U sides) - Blocks 1 & 3 */}
              <div className="grid grid-cols-4 gap-6">
                {/* Block 1 (Left) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(2, 1)}</span>
                  </div>
                  {[4, 3, 2, 1].map(n => renderChair(n))}
                </div>

                <div className="col-span-2 flex items-center justify-center opacity-10">
                  <Users size={80} strokeWidth={1} />
                </div>

                {/* Block 3 (Right) */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Users size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500">{getNurseName(2, 3)}</span>
                  </div>
                  {[9, 10, 11, 12].map(n => renderChair(n))}
                </div>
              </div>
            </div>
          </div>

          {/* Fictitious Nursing Station & Doctor at the bottom for Piso 2 */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            {/* Doctor in Charge */}
            <div className="bg-orange-500/10 border border-orange-500/30 px-10 py-6 rounded-[32px] flex items-center gap-4 backdrop-blur-md shadow-xl group">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Responsable</h4>
                <p className="text-sm font-black uppercase tracking-tighter text-orange-500">Doctor a cargo</p>
              </div>
            </div>

            {/* Central Nursing Station */}
            <div className="bg-blue-600/10 border border-blue-500/30 px-60 py-6 rounded-[32px] flex items-center gap-16 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex -space-x-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={20} />
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={20} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-500">Estación Central de Enfermería</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Monitoreo en tiempo real • Piso 2</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Form Modal */}
      {showForm && (
        <PatientForm 
          title={editingPatient ? 'Editar Estado / Silla' : 'Registrar Nuevo Paciente'}
          initialData={editingPatient || { shift: selectedShift, floor: selectedFloor, chairNumber: selectedChair || undefined, status: 'Ocupada' }}
          hidePersonalFields={!!editingPatient}
          onClose={() => {
            setShowForm(false);
            setEditingPatient(null);
            setSelectedChair(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Assign Patient Modal */}
      {showAssignModal && selectedChair && (
        <AssignPatientModal 
          patients={patients}
          floor={selectedFloor}
          chairNumber={selectedChair}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedChair(null);
          }}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};
