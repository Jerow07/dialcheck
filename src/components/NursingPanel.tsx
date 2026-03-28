import { useState } from 'react';
import type { Patient } from '../types';
import { UserPlus, Users, CheckCircle2, UserX, Edit2, Activity, Stethoscope, ArrowLeftRight, X, Calendar, Copy, Coffee, Cake } from 'lucide-react';
import { PatientForm } from './PatientForm';
import { AssignPatientModal } from './AssignPatientModal';
import { NotificationBell } from './NotificationBell';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

const API_URL = '/api/patients';

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDates = (baseDateStr: string) => {
  const base = new Date(baseDateStr + 'T12:00:00'); // Use noon to avoid TZ shift
  const day = base.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = base.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(base.setDate(diff));
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return getLocalDateString(d);
  });
};

interface NursingPanelProps {
  patients: Patient[];
  onRefresh: () => void;
}

export const NursingPanel = ({ patients, onRefresh }: NursingPanelProps) => {
  const [selectedShift, setSelectedShift] = useState('1');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [rotation, setRotation] = useState<'AM' | 'PM'>('AM'); // For Turno 2 (12-14 vs 14-16)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [movingPatient, setMovingPatient] = useState<Patient | null>(null);

  const [birthdayFired, setBirthdayFired] = useState(false);

  useEffect(() => {
    const today = new Date();
    const birthDayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const birthdayPatients = patients.filter(p => p.birthDate?.endsWith(birthDayStr));

    if (birthdayPatients.length > 0 && !birthdayFired) {
      setBirthdayFired(true);
      
      const fire = (particleRatio: number, opts: any) => {
        confetti({
          ...opts,
          origin: { y: 0.7 },
          particleCount: Math.floor(200 * particleRatio),
        });
      };

      // Triple burst sequence
      setTimeout(() => {
        fire(0.25, { spread: 26, startVelocity: 55 });
        setTimeout(() => fire(0.2, { spread: 60 }), 200);
        setTimeout(() => fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 }), 400);

        // Push notification (only once)
        if (Notification.permission === 'granted') {
          birthdayPatients.forEach(p => {
             new Notification(`Cumpleaños Hoy: ${p.name} 🎂`, {
               body: '¡No olvides saludarlo en el centro!',
               icon: '/pwa-192x192.png'
             });
          });
        }
      }, 1000);
    }
  }, [patients, birthdayFired]);

  // Map of nurses per block (1-4) for Piso 1.
  // Morning includes T1 and T2-AM. Afternoon includes T2-PM and T3.
  const getNurseName = (floor: number, block: number) => {
    const isAfternoon = selectedShift === '3' || (selectedShift === '2' && rotation === 'PM');
    if (floor === 1) {
      const names = isAfternoon 
        ? ['Analia Peralta', 'Antonia Quiroga', 'Daniel Rincon', 'Brisa Hidalgo']
        : ['Norma Banega', 'Andrea Noriega', 'Carolina Camino', 'Edgar Martinez'];
      return names[block - 1] || `Enf. ${block}`;
    } else {
      const names = isAfternoon
        ? ['CAROLINA SALVATIERRA', 'MARIANELA OCAMPO', 'AGUSTINA GUIDOGUOMO']
        : ['Maria Saban', 'Daniel Mancueto', 'Maribel Gomez'];
      return names[block - 1] || `Enf. P2 ${block}`;
    }
  };

  const renderServiceIsland = () => {
    const isAfternoon = selectedShift === '3' || (selectedShift === '2' && rotation === 'PM');
    let staff = isAfternoon 
      ? ['Nadia Vazquez', 'Rocio Romero', 'Natalia Corvalan']
      : ['NATALIA ORJA', 'GISELA MOLINA'];
    
    if (selectedFloor === 2 && isAfternoon) {
      staff = ['NELIDA RAMOS'];
    }
    
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 px-8 py-6 rounded-[32px] flex items-center gap-4 backdrop-blur-md shadow-xl group">
        <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
          <Coffee size={20} />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Servicio</h4>
          <p className="text-sm font-black uppercase tracking-tighter text-amber-500">Limpieza & Té</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
            {staff.map((name, i) => (
              <span key={i} className="text-[11px] font-bold text-amber-500/70 whitespace-nowrap capitalize">
                {name}{i < staff.length - 1 ? " • " : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getDoctorName = (floor: number) => {
    if (floor === 2) return "Por asignar";
    
    // dateObj = Tue Mar 27 2026 (for example)
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const isAfternoon = selectedShift === '3' || (selectedShift === '2' && rotation === 'PM');

    // Rules for Piso 1:
    // Mon (1), Wed (3), Thu AM (4): Silvina Vazquez
    // Thu PM (4), Sat (6): Gabriela Palminio
    // Tue (2), Fri (5): Marisa Ochoa
    
    if (floor === 1) {
      if (day === 1 || day === 3) return "Silvina Vazquez";
      if (day === 4) return isAfternoon ? "Gabriela Palminio" : "Silvina Vazquez";
      if (day === 2 || day === 5) return "Marisa Ochoa";
      if (day === 6) return "Gabriela Palminio";
      return "Silvina Vazquez"; // Default
    }
    return "Por asignar";
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
      (p.date || getLocalDateString()) === selectedDate &&
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
      
      if (!patientData.name) {
        alert("Por favor ingrese el nombre del paciente.");
        return;
      }
      if (!patientData.chairNumber) {
        alert("Por favor seleccione una silla disponible.");
        return;
      }

      // Check collision
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
        body: JSON.stringify({
          ...patientData,
          date: patientData.date || selectedDate
        })
      });

      if (resp.ok) {
        onRefresh();
        setShowForm(false);
        setEditingPatient(null);
      } else {
        const data = await resp.json();
        alert(`Error al guardar: ${data.error || 'Ocurrió un error inesperado'}`);
      }
    } catch (err) {
      console.error('Error saving patient:', err);
      alert("No se pudo conectar con el servidor. ¿Está el backend encendido?");
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
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      // Check collision
      const canProceed = await checkAndReleaseCollision(
        selectedChair,
        selectedShift,
        selectedFloor,
        patientId
      );
      if (!canProceed) return;

      const isNewAssignment = (patient.date || getLocalDateString()) !== selectedDate;
      const url = isNewAssignment ? API_URL : `${API_URL}/${patientId}`;
      const method = isNewAssignment ? 'POST' : 'PUT';
      
      const payload = isNewAssignment 
        ? { ...patient, id: undefined, chairNumber: selectedChair, shift: selectedShift, floor: selectedFloor, date: selectedDate, status: 'Ocupada' }
        : { chairNumber: selectedChair, shift: selectedShift, floor: selectedFloor, status: 'Ocupada', date: selectedDate };

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  const handleCloneSchedule = async (sourceDate: string) => {
    if (!window.confirm(`¿Copiar todos los pacientes del día ${sourceDate} al día seleccionado (${selectedDate})?`)) return;
    
    const patientsToClone = patients.filter(p => (p.date || getLocalDateString()) === sourceDate && p.chairNumber > 0);
    
    if (patientsToClone.length === 0) {
      alert('No hay pacientes para copiar en esa fecha');
      return;
    }

    try {
      for (const p of patientsToClone) {
        const { id, ...patientData } = p;
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...patientData,
            date: selectedDate,
            status: 'Ocupada'
          })
        });
      }
      onRefresh();
      alert('Plan copiado con éxito');
    } catch (err) {
      console.error('Error cloning schedule:', err);
    }
  };

  const handleMove = async (targetChair: number) => {
    if (!movingPatient) return;
    try {
      const resp = await fetch(`${API_URL}/${movingPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chairNumber: targetChair 
        })
      });

      if (resp.ok) {
        onRefresh();
        setMovingPatient(null);
      }
    } catch (err) {
      console.error('Error moving patient:', err);
    }
  };

  const renderChair = (chairNumber: number) => {
    const chair = {
      number: chairNumber,
      patient: patients.find(p => p.shift === selectedShift && p.floor === selectedFloor && p.chairNumber === chairNumber && (p.date || getLocalDateString()) === selectedDate)
    };

    const isOccupied = !!chair.patient;
    const isAbsent = chair.patient?.status === 'Ausente';
    
    const shouldFlip = (selectedFloor === 1 && (
      (chairNumber >= 1 && chairNumber <= 5) || 
      (chairNumber >= 11 && chairNumber <= 15)
    )) || (selectedFloor === 2 && (
      chairNumber <= 6
    ));

    return (
      <div
        key={chair.number}
        onClick={() => {
          if (movingPatient) {
            if (!chair.patient) {
              handleMove(chair.number);
            }
            return;
          }
          if (!chair.patient) {
            setEditingPatient(null);
            setSelectedChair(chair.number);
            setShowAssignModal(true);
          }
        }}
        className={`aspect-square rounded-[24px] px-4 pt-4 pb-3 flex flex-col items-center justify-between text-center transition-all border-2 relative group cursor-pointer overflow-hidden ${
          movingPatient && !chair.patient
            ? 'bg-blue-500/20 border-blue-500 animate-pulse ring-4 ring-blue-500/20 z-50 scale-[1.05]'
            : isOccupied 
              ? isAbsent
                ? 'bg-orange-500/20 border-orange-500/40 cursor-default'
                : 'bg-red-500/20 border-red-500/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)] cursor-default'
              : 'bg-blue-500/10 border-dashed border-blue-500/30 opacity-95 hover:opacity-100 hover:scale-[1.02] hover:bg-blue-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'
        } ${movingPatient && chair.patient && movingPatient.id !== chair.patient.id ? 'opacity-20 pointer-events-none' : ''}`}
      >
        <div className="absolute top-2 left-0 right-0 bottom-14 flex items-center justify-center pointer-events-none z-0">
          <img 
            src="/assets/chair.png" 
            alt="Dialysis Chair"
            className={`w-full h-full object-contain transition-all duration-300 ${
              isOccupied 
                ? isAbsent ? 'sepia-0 grayscale-0 saturate-150 contrast-125 brightness-110 opacity-90' : 'sepia-[0.8] saturate-[400%] hue-rotate-[320deg] opacity-100 drop-shadow-2xl' 
                : 'sepia-0 grayscale-0 opacity-100 saturate-110'
            }`}
            style={{ transform: shouldFlip ? 'scaleX(-1)' : 'none' }}
          />
        </div>

        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {chair.patient && (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPatient(chair.patient!);
                  setShowForm(true);
                }}
                className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg transition-transform active:scale-90"
              >
                <Edit2 size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setMovingPatient(chair.patient!);
                }}
                className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 shadow-lg transition-transform active:scale-90"
                title="Mover Silla"
              >
                <ArrowLeftRight size={12} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  releaseChair(chair.patient!.id);
                }}
                className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg transition-transform active:scale-90"
              >
                <UserX size={12} />
              </button>
            </>
          )}
        </div>

        <div className="relative z-10 w-full flex justify-start">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border backdrop-blur-sm shadow-sm ${
            isOccupied 
              ? isAbsent ? 'text-orange-600 border-orange-500/30 bg-orange-500/20' : 'text-red-600 border-red-500/30 bg-red-500/20' 
              : 'text-blue-600 border-blue-500/30 bg-blue-500/20'
          }`}>Silla {chair.number}</span>
        </div>
        
        <div className="relative z-10 w-full mt-auto">
          {movingPatient && !chair.patient ? (
            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl animate-bounce">
              Mover Aquí
            </div>
          ) : chair.patient ? (
            <div className="flex flex-col items-center w-full space-y-0.5">
              <div className="bg-slate-200 dark:bg-slate-200 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm w-full">
                <span className="text-[11px] font-black tracking-tight leading-tight truncate block text-slate-900">{chair.patient.name}</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full shadow-lg border ${
                 isAbsent ? 'bg-orange-600 dark:bg-orange-500 text-white border-orange-400/30' : 'bg-red-600 dark:bg-red-500 text-white border-red-400/30'
              }`}>
                {chair.patient.status === 'Ocupada' ? (
                  <CheckCircle2 size={10} className="text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {chair.patient.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="opacity-100 flex flex-col items-center gap-1">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white bg-blue-600 dark:bg-blue-500 px-5 py-1.5 rounded-full shadow-lg border border-blue-400/30">Libre</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Weekly Date Navigation Strip */}
      <div className="bg-[var(--bg-accent)] p-4 md:p-6 rounded-[32px] border border-[var(--border-color)] space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20 text-orange-500">
              <Calendar size={20} />
            </div>
            <div className="relative group cursor-pointer" onClick={() => (document.getElementById('hidden-date-picker') as HTMLInputElement)?.showPicker()}>
              <h3 className="text-sm font-black uppercase tracking-widest leading-tight hover:text-orange-500 transition-colors">
                {new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(selectedDate + 'T12:00:00'))}
              </h3>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Click para seleccionar fecha</p>
              <input 
                id="hidden-date-picker"
                type="date" 
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const prev = new Date(selectedDate + 'T12:00:00');
                prev.setDate(prev.getDate() - 7);
                setSelectedDate(getLocalDateString(prev));
              }}
              className="px-4 h-10 bg-slate-200 text-black hover:bg-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Semana Anterior
            </button>
            <button 
              onClick={() => setSelectedDate(getLocalDateString())}
              className={`px-4 h-10 ${selectedDate === getLocalDateString() ? 'bg-orange-500 text-white' : 'bg-slate-200 text-black'} hover:opacity-90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
            >
              Hoy
            </button>
            <button 
              onClick={() => {
                const next = new Date(selectedDate + 'T12:00:00');
                next.setDate(next.getDate() + 7);
                setSelectedDate(getLocalDateString(next));
              }}
              className="px-4 h-10 bg-slate-200 text-black hover:bg-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Semana Siguiente
            </button>
            
            <div className="w-px h-6 bg-[var(--border-color)] mx-2" />
            
            <button 
              onClick={() => {
                const prevDay = new Date(selectedDate + 'T12:00:00');
                prevDay.setDate(prevDay.getDate() - 1);
                handleCloneSchedule(getLocalDateString(prevDay));
              }}
              className="flex items-center gap-2 px-4 h-10 bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20"
            >
              <Copy size={14} />
              Copiar Ayer
            </button>
          </div>
        </div>

        {/* 7-Day Strip */}
        <div className="flex justify-between gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
          {getWeekDates(selectedDate).map(dateStr => {
            const dateObj = new Date(dateStr + 'T12:00:00');
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === getLocalDateString();
            
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-1 min-w-[70px] p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 group/day ${
                  isSelected 
                    ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-500/20 scale-[1.02]' 
                    : isToday
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-white/50 dark:bg-black/20 border-transparent hover:border-orange-500/30'
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'opacity-40 group-hover/day:opacity-100'}`}>
                  {new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(dateObj).replace('.', '')}
                </span>
                <span className={`text-lg font-black ${isSelected ? 'text-white' : isToday ? 'text-orange-600' : ''}`}>
                  {dateObj.getDate()}
                </span>
                {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-orange-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Birthday Festive Banner */}
      {(() => {
        const today = new Date();
        const birthDayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const birthdayPatients = patients.filter(p => p.birthDate?.endsWith(birthDayStr));

        if (birthdayPatients.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-500/30 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl shadow-2xl relative overflow-hidden group animate-in slide-in-from-top duration-700">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl flex items-center justify-center text-white shadow-xl animate-bounce">
                <Cake size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-pink-500">🎉 ¡Hoy es un día especial!</h3>
                <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">
                  {birthdayPatients.length === 1 
                    ? `Hoy es el cumpleaños de ${birthdayPatients[0].name}`
                    : `Hoy es el cumpleaños de: ${birthdayPatients.map(p => p.name).join(', ')}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                confetti({
                  particleCount: 150,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
                });
                
                if (Notification.permission === 'granted') {
                  birthdayPatients.forEach(p => {
                    new Notification(`¡Feliz Cumpleaños ${p.name}! 🎂`, {
                      body: 'Deseale un gran día en su sesión de hoy.',
                      icon: '/pwa-192x192.png'
                    });
                  });
                }
              }}
              className="px-8 h-14 bg-pink-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 relative z-10 active:scale-95"
            >
              ¡Celebrar! 🎈
            </button>
          </div>
        );
      })()}

      {/* Header & Shift Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[var(--bg-accent)] p-4 md:p-8 rounded-[32px] md:rounded-[40px] border border-[var(--border-color)] backdrop-blur-xl">
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
          <div className="flex bg-white/40 dark:bg-white/10 p-1.5 rounded-2xl border border-[var(--border-color)]">
            {[0, 1, 2, 3].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`flex-1 flex flex-col items-center justify-center px-6 py-3 rounded-2xl transition-all duration-300 ${
                  selectedFloor === f 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/10' 
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Piso</span>
                <span className="text-xl font-black leading-tight">{f === 0 ? 'PB' : f}</span>
              </button>
            ))}
          </div>

          {selectedFloor !== 3 && selectedFloor !== 0 && (
            <>
              <div className="flex bg-white/40 dark:bg-white/10 p-1.5 rounded-2xl border border-[var(--border-color)]">
                {['1', '2', '3'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedShift(s)}
                    className={`flex flex-col items-center px-6 py-2 rounded-xl font-black transition-all ${
                      selectedShift === s 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-[1.05] translate-y-[-1px]' 
                        : 'bg-slate-200 text-black hover:bg-slate-300'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-widest">Turno {s}</span>
                    <span className={`text-[10px] font-bold ${selectedShift === s ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
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
                      rotation === 'AM' ? 'bg-orange-500 text-white shadow-md' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    Pre-14hs (AM)
                  </button>
                  <button
                    onClick={() => setRotation('PM')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                      rotation === 'PM' ? 'bg-orange-500 text-white shadow-md' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    Post-14hs (PM)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="w-px h-10 bg-[var(--border-color)] hidden md:block" />
          
          {movingPatient ? (
            <div className="flex flex-col items-center gap-2 bg-orange-500/10 p-6 rounded-[32px] border border-orange-500/30 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">Moviendo a {movingPatient.name}</h3>
              <p className="text-[10px] font-bold opacity-60 uppercase">Selecciona una silla vacía para trasladarlo</p>
              <button 
                onClick={() => setMovingPatient(null)}
                className="mt-2 px-6 py-2 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2"
              >
                <X size={12} />
                Cancelar Movimiento
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Realistic Chair Layout */}
      {selectedFloor === 0 ? (
        <div className="max-w-5xl mx-auto py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Reception Module */}
            <div className="bg-[var(--bg-accent)]/30 p-8 md:p-12 rounded-[48px] border border-[var(--border-color)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                    <Users size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-blue-500">Recepción</h3>
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mt-1">Atención Administrativa</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-slate-200 dark:border-white/10 p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4 text-slate-900 dark:text-white">Administrativas</h4>
                    <div className="space-y-4">
                      
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-blue-500 to-indigo-600 flex shrink-0 items-center justify-center text-white font-black shadow-lg">
                          MS
                        </div>
                        <div>
                          <p className="text-lg font-black uppercase tracking-tighter text-blue-600 dark:text-blue-500">M. de los Angeles Suarez</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">En Línea • 08:00 - 16:00 hs</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-indigo-500 to-purple-600 flex shrink-0 items-center justify-center text-white font-black shadow-lg">
                          KB
                        </div>
                        <div>
                          <p className="text-lg font-black uppercase tracking-tighter text-indigo-600 dark:text-indigo-500">Karina Mabel Batla</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[9px] font-black opacity-60 uppercase tracking-widest">En Línea</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Stethoscope size={16} className="text-emerald-500" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Directores Médicos Generales</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex shrink-0 items-center justify-center font-black text-sm">DC</div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 line-clamp-1">Dario Campos</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex shrink-0 items-center justify-center font-black text-sm">OT</div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 line-clamp-1">Osvaldo Torrado</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm md:col-span-2 lg:col-span-1">
                        <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex shrink-0 items-center justify-center font-black text-sm">PS</div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 line-clamp-1">Patricia Sidoruk</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Card / Project Details */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-8 md:p-12 rounded-[48px] border border-slate-200 dark:border-white/10 relative flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 text-slate-900 dark:text-white">Ficha Técnica del Centro</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase opacity-60">Identificación</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400">NEFRA MEDICAL CARE</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase opacity-60">Teléfono</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">47469507</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase opacity-60">Dirección</span>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-black text-slate-800 dark:text-white">LAS HERAS 985 • SAN FERNANDO</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">BUENOS AIRES</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase opacity-60">Sector</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">PLANTA BAJA • ACCESO PRINCIPAL</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase opacity-60">Sistema</span>
                      <span className="text-xs font-bold font-mono opacity-80 tracking-widest text-slate-800 dark:text-white">DIALCHECK v2.0.4</span>
                    </div>
                  </div>
                </div>
              </div>

              {(() => {
                const isSunday = new Date(selectedDate + 'T12:00:00').getDay() === 0;
                return (
                  <div className={`mt-12 border p-6 rounded-[24px] flex items-center justify-between ${isSunday ? 'bg-red-500/5 border-red-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Estado Operativo</p>
                      <p className={`text-lg font-black ${isSunday ? 'text-red-500' : 'text-emerald-500'}`}>
                        {isSunday ? 'SISTEMA INACTIVO' : 'SISTEMA ACTIVO'}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSunday ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      {isSunday ? <X size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : selectedFloor === 1 ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 max-w-5xl mx-auto">
            <div className="bg-[var(--bg-accent)]/30 p-4 md:p-8 rounded-[32px] md:rounded-[48px] border border-[var(--border-color)]">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-8 text-center italic">Sector ESTE</h3>
              <div className="grid grid-cols-2 gap-4 md:gap-6 relative">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(1, 1)}</span>
                  </div>
                  {[1, 2, 3, 4, 5].map(n => renderChair(n))}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(1, 2)}</span>
                  </div>
                  {[6, 7, 8, 9, 10].map(n => renderChair(n))}
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/10 -translate-x-1/2 hidden md:block" />
              </div>
            </div>

            <div className="bg-[var(--bg-accent)]/30 p-4 md:p-8 rounded-[32px] md:rounded-[48px] border border-[var(--border-color)]">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-8 text-center italic">Sector OESTE</h3>
              <div className="grid grid-cols-2 gap-4 md:gap-6 relative">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(1, 3)}</span>
                  </div>
                  {[11, 12, 13, 14, 15].map(n => renderChair(n))}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(1, 4)}</span>
                  </div>
                  {[16, 17, 18, 19, 20].map(n => renderChair(n))}
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/10 -translate-x-1/2 hidden md:block" />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="bg-orange-500/10 border border-orange-500/30 px-10 py-6 rounded-[32px] flex items-center gap-4 backdrop-blur-md shadow-xl group">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Responsable</h4>
                <p className="text-sm font-black uppercase tracking-tighter text-orange-500">Doctor a cargo</p>
                <p className="text-[12px] font-bold text-orange-500/60 leading-tight">{getDoctorName(1)}</p>
              </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/30 px-4 md:px-6 py-5 rounded-[32px] flex items-center gap-4 md:gap-6 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex -space-x-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={18} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-500 truncate">Estación Central de Enfermería</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter mb-1">Piso 1 • Monitoreo en tiempo real</p>
                <div className="flex items-center gap-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[1, 2, 3, 4].map((block, i) => (
                    <div key={block} className="flex items-center gap-1.5 flex-none">
                      <span className="text-[8px] font-black uppercase tracking-tighter text-blue-500/80 whitespace-nowrap">
                        {getNurseName(1, block)}
                      </span>
                      {i < 3 && <div className="w-1 h-3 border-r border-blue-500/10 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {renderServiceIsland()}
          </div>
        </div>
      ) : selectedFloor === 2 ? (
        <div className="space-y-12">
          <div className="bg-[var(--bg-accent)]/30 p-4 md:p-12 rounded-[32px] md:rounded-[64px] border border-[var(--border-color)]">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-12 text-center italic">Distribución en U (1-12)</h3>
            <div className="max-w-4xl mx-auto">
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 w-fit mx-auto">
                  <Users size={12} className="text-orange-500" />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(2, 2)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                  {[5, 6, 7, 8].map(n => renderChair(n))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-4 md:space-y-6">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(2, 1)}</span>
                  </div>
                  {[4, 3, 2, 1].map(n => renderChair(n))}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <div className="w-full max-w-[140px] md:max-w-[180px]">
                    {renderChair(13)}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <Users size={12} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-orange-500">{getNurseName(2, 3)}</span>
                  </div>
                  {[9, 10, 11, 12].map(n => renderChair(n))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            <div className="bg-orange-500/10 border border-orange-500/30 px-10 py-6 rounded-[32px] flex items-center gap-4 backdrop-blur-md shadow-xl group">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Stethoscope size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Responsable</h4>
                <p className="text-sm font-black uppercase tracking-tighter text-orange-500">Doctor a cargo</p>
                <p className="text-[12px] font-bold text-orange-500/60 leading-tight italic">Por asignar</p>
              </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-500/30 px-4 md:px-6 py-5 rounded-[32px] flex items-center gap-4 md:gap-6 backdrop-blur-md shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex -space-x-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500 border-4 border-[var(--bg-primary)] flex items-center justify-center text-white shadow-lg">
                  <Activity size={18} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-500 truncate">Estación Central de Enfermería</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter mb-1">Piso 2 • Monitoreo en tiempo real</p>
                <div className="flex items-center gap-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[1, 2, 3].map((block, i) => (
                    <div key={block} className="flex items-center gap-1.5 flex-none">
                      <span className="text-[8px] font-black uppercase tracking-tighter text-blue-500/80 whitespace-nowrap">
                        {getNurseName(2, block)}
                      </span>
                      {i < 2 && <div className="w-1 h-3 border-r border-blue-500/10 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {renderServiceIsland()}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto py-12">
          <div className="bg-[var(--bg-accent)]/30 p-8 md:p-12 rounded-[64px] border border-[var(--border-color)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="w-full md:w-1/2 aspect-square rounded-[48px] overflow-hidden border border-white/10 shadow-2xl relative group-hover:scale-[1.02] transition-transform duration-700">
                <img 
                  src="/rehuso.png" 
                  alt="Procesamiento de Filtros"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>

              <div className="w-full md:w-1/2 space-y-8 text-center md:text-left">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-blue-500 mb-2">Piso 3 • Rehuso</h3>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-transparent rounded-full mx-auto md:mx-0" />
                  <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em] mt-4">Procesamiento y Limpieza de Filtros</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[40px] backdrop-blur-md shadow-xl relative overflow-hidden text-center md:text-left">
                  <div className="absolute top-0 right-0 p-4">
                    <Activity size={24} className="text-blue-500/20" />
                  </div>
                  
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Personal en Turno</h4>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Users size={32} />
                    </div>
                    <div>
                      <p className="text-2xl font-black uppercase tracking-tighter text-blue-500">
                        {new Date().getHours() < 14 ? 'Susana Farias' : 'Florencia Padiggia'}
                      </p>
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">
                        Turno {new Date().getHours() < 14 ? 'Mañana' : 'Tarde'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-[24px]">
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1 text-center md:text-left">Estado del Sector</p>
                    <p className="text-xl font-black text-emerald-500 text-center md:text-left">Operativo • Monitoreo Activo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <PatientForm 
          title={editingPatient ? 'Editar Estado / Silla' : 'Registrar Nuevo Paciente'}
          initialData={editingPatient || { shift: selectedShift, floor: selectedFloor === 0 ? 1 : selectedFloor, chairNumber: selectedChair || undefined, status: 'Ocupada', date: selectedDate }}
          patients={patients}
          onClose={() => {
            setShowForm(false);
            setEditingPatient(null);
            setSelectedChair(null);
          }}
          onSave={handleSave}
        />
      )}

      {showAssignModal && selectedChair && (
        <AssignPatientModal 
          patients={Array.from(new Map([...patients].reverse().map(p => [p.name, p])).values())}
          floor={selectedFloor}
          chairNumber={selectedChair}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedChair(null);
          }}
          onAssign={handleAssign}
          onRegisterNew={() => {
            setShowAssignModal(false);
            setEditingPatient(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
};
