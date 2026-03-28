import React, { useState } from 'react';
import { Lock, User, Activity, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export const LoginScreen = ({ onLogin }: { onLogin: (token: string, username: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Complete ambos campos requeridos');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Usamos ruta relativa al servidor, en localhost o vercel
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await resp.json();
      
      if (resp.ok && data.success) {
        onLogin(data.token, data.user.username);
      } else {
        setError(data.error || 'Autenticación fallida');
      }
    } catch (err) {
      setError('No se pudo contactar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 z-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--bg-accent)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 md:p-10 rounded-[40px] shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-blue-500/20 mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <Activity className="text-blue-500" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight leading-none text-center">Dial<span className="text-blue-500">check</span></h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mt-2 text-center text-[var(--text-primary)]">Gestión Clínica</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 group-focus-within:text-blue-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 font-bold outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all text-[var(--text-primary)]"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 font-bold outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-primary)] opacity-40 hover:opacity-100 hover:text-blue-500 transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-pulse">
                <AlertCircle size={16} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'Ingresar al Centro'}
            </button>
          </form>

          <p className="text-center text-[10px] font-bold opacity-30 mt-8 text-[var(--text-primary)]">
            ACCESO AUTORIZADO EXCLUSIVAMENTE
          </p>
        </div>
      </div>
    </div>
  );
};
