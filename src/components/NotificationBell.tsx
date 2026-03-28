import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';

export const NotificationBell = () => {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'Notification' in window);
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;
    const res = await Notification.requestPermission();
    setPermission(res);
    
    if (res === 'granted') {
      new Notification('¡Notificaciones Activadas!', {
        body: 'Ahora recibirás avisos de cumpleaños y eventos importantes.',
        icon: '/pwa-192x192.png'
      });
    }
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={requestPermission}
      className={`relative p-3 rounded-2xl transition-all duration-300 border shadow-lg group ${
        permission === 'granted'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
          : permission === 'denied'
          ? 'bg-red-500/10 border-red-500/20 text-red-500 opacity-50 cursor-not-allowed'
          : 'bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20 animate-bounce'
      }`}
      title={
        permission === 'granted'
          ? 'Notificaciones activadas'
          : permission === 'denied'
          ? 'Notificaciones bloqueadas'
          : 'Activar notificaciones'
      }
    >
      {permission === 'granted' ? (
        <BellRing size={20} />
      ) : permission === 'denied' ? (
        <BellOff size={20} />
      ) : (
        <Bell size={20} />
      )}
      
      {permission === 'default' && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[var(--bg-primary)] animate-ping" />
      )}
    </button>
  );
};
