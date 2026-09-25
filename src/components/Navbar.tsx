import React from 'react';
import { User, LogIn, LogOut, Settings, BarChart3, Users, Zap, CheckCircle2, CloudRain } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { loginWithGoogle, logoutUser } from '../lib/firebase';

interface NavbarProps {
  currentUser: FirebaseUser | null;
  schoolName: string;
  onOpenSettings: () => void;
  onOpenReports: () => void;
  onOpenStudents: () => void;
  onOpenSyncModal: () => void;
  isOnline: boolean;
  sheetsConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  schoolName,
  onOpenSettings,
  onOpenReports,
  onOpenStudents,
  onOpenSyncModal,
  isOnline,
  sheetsConfigured,
}) => {
  const handleAuth = async () => {
    if (currentUser) {
      await logoutUser();
    } else {
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error('Login error:', err);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and School Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg shadow-emerald-950/30 shrink-0 overflow-hidden">
            <img 
              src="./icons/tarucas-logo.png" 
              alt="Tarucas Logo" 
              className="w-full h-full object-contain" 
              onError={(e) => { 
                (e.currentTarget as HTMLElement).style.display = 'none'; 
              }} 
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-100 truncate tracking-tight flex items-center gap-1.5">
              <span>{schoolName || 'Registro de Asistencia'}</span>
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firebase
              </span>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={onOpenSyncModal}
                className="hover:underline flex items-center gap-1 cursor-pointer transition-colors text-slate-300"
                title="Abrir sincronizador de Google Sheets"
              >
                {sheetsConfigured ? (
                  <span className="text-teal-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sheets (Sincronizar)
                  </span>
                ) : (
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <CloudRain className="w-3 h-3" /> Configurar Sheets
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenStudents}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title="Gestionar Alumnos"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Alumnos</span>
          </button>

          <button
            onClick={onOpenReports}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title="Historial y Reportes"
          >
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Reportes</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title="Configuración Google Sheets"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {/* User Auth profile */}
          <button
            onClick={handleAuth}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
            title={currentUser ? `Conectado como ${currentUser.displayName || currentUser.email}` : 'Iniciar sesión'}
          >
            {currentUser ? (
              <>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-5 h-5 rounded-full border border-slate-600" />
                ) : (
                  <User className="w-4 h-4 text-emerald-400" />
                )}
                <span className="hidden md:inline font-medium max-w-[100px] truncate">
                  {currentUser.displayName?.split(' ')[0] || 'Profesor'}
                </span>
                <LogOut className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline font-medium">Ingresar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
