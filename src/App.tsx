import { useState, useEffect } from 'react'
import { Activity, Sun, Moon, LayoutGrid, Users as UsersIcon, Info, LogOut } from 'lucide-react'
import { NursingPanel } from './components/NursingPanel'
import { PatientList } from './components/PatientList'
import { LoginScreen } from './components/LoginScreen'
import type { Patient } from './types'

const API_URL = '/api/patients';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
    }
    return 'dark'
  })

  const [activeTab, setActiveTab] = useState<'panel' | 'directory'>('panel')
  const [patients, setPatients] = useState<Patient[]>([])
  const [showCreateInfo, setShowCreateInfo] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token')
    }
    return false
  })
  const [currentUser, setCurrentUser] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_user') || 'Admin'
    }
    return 'Admin'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    fetchPatients()
    
    // Auto-refresh every 5 seconds for "real-time" sync
    const interval = setInterval(fetchPatients, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleGlobalClick = () => setShowCreateInfo(false);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const fetchPatients = async () => {
    try {
      const resp = await fetch(API_URL)
      if (!resp.ok) throw new Error('Network response was not ok')
      const data = await resp.json()
      setPatients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching patients:', err)
      setPatients([])
    }
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleLogin = (token: string, username: string) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', username)
    setIsAuthenticated(true)
    setCurrentUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setIsAuthenticated(false)
    setCurrentUser('')
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-300 w-full relative">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 pt-6 md:pt-12 flex flex-col items-center">
        <div className="w-full max-w-7xl px-4 md:px-12 flex flex-col md:flex-row flex-wrap gap-4 md:gap-2 justify-between items-center mb-8 md:mb-12">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-blue-500/20">
              <Activity className="text-blue-500" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black tracking-tight leading-none">Dial<span className="text-blue-500">check</span></span>
              <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.4em] opacity-30 mt-1">Management System</span>
            </div>
            {/* Creator Info Button */}
            <div className="relative group ml-2 mt-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateInfo(!showCreateInfo);
                }}
                aria-label="Creator info" 
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${
                  showCreateInfo 
                    ? 'bg-blue-500 text-white border-blue-400' 
                    : 'bg-slate-200 dark:bg-slate-800/80 text-slate-500 border-slate-300 dark:border-white/10 hover:bg-blue-500 hover:text-white'
                }`}
              >
                <Info size={16} />
              </button>
              <div className={`absolute left-1/2 -translate-x-1/2 md:left-full md:translate-x-0 md:-translate-y-1/2 md:ml-3 top-full md:top-1/2 mt-3 md:mt-0 w-[calc(100vw-40px)] md:w-max min-w-[200px] max-w-[280px] bg-slate-900 text-white p-4 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-2xl border border-white/10 pointer-events-none translate-y-2 md:translate-y-0 md:translate-x-1 group-hover:translate-x-0 group-hover:translate-y-0 ${
                showCreateInfo ? 'opacity-100 visible translate-y-0 pointer-events-auto' : ''
              }`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-2">Dialcheck Inc.</p>
                <div className="space-y-1">
                  <p className="text-xs font-bold leading-tight">Designed by Jerónimo Parra Sanhueza</p>
                  <p className="text-[10px] opacity-60 leading-tight">Visual by Jerónimo Parra Sanhueza</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Theme */}
          <div className="flex items-center gap-4">
            <div className="flex bg-[var(--bg-accent)] p-1 rounded-2xl border border-[var(--border-color)] overflow-x-auto max-w-[calc(100vw-40px)] scrollbar-hide">
              <button
                onClick={() => setActiveTab('panel')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'panel' 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'opacity-40 hover:opacity-100'
                }`}
              >
                <LayoutGrid size={14} />
                Panel
              </button>
              <button
                onClick={() => setActiveTab('directory')}
                className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'directory' 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'opacity-40 hover:opacity-100'
                }`}
              >
                <UsersIcon size={14} />
                Directorio
              </button>
            </div>

            <button 
              onClick={toggleTheme}
              className="w-11 h-11 bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} className="text-blue-600" /> : <Sun size={18} className="text-orange-400" />}
            </button>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 md:w-11 md:h-11 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center hover:scale-105 hover:bg-red-500 hover:text-white active:scale-95 transition-all shadow-xl shadow-black/5 ml-1"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-20 px-4 max-w-7xl mx-auto pb-40">
        {activeTab === 'panel' ? (
          <NursingPanel 
            patients={patients} 
            onRefresh={fetchPatients}
            currentUser={currentUser} 
          />
        ) : (
          <PatientList 
            patients={patients} 
            onRefresh={fetchPatients}
            currentUser={currentUser}
          />
        )}
      </main>

      <footer className="relative z-0 mt-40 text-center pb-20 opacity-20 hover:opacity-100 transition-opacity">
        <div className="h-px w-20 bg-[var(--text-primary)]/10 mx-auto mb-6" />
        <p className="text-[9px] font-black uppercase tracking-[0.5em]">Premium Healthcare Systems © 2026</p>
      </footer>
    </div>
  )
}

export default App
