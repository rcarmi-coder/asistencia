import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCheck,
  RotateCcw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Download,
  Upload,
  SlidersHorizontal,
} from 'lucide-react';
import { auth, testConnection } from './lib/firebase';
import {
  subscribeParticipants,
  subscribeAttendanceSession,
  saveAttendanceSession,
  saveParticipant,
  deleteParticipant,
  seedInitialParticipantsIfEmpty,
  getAppSettings,
  saveAppSettings,
} from './lib/firestoreService';
import { sendAttendanceToSheets, importParticipantsFromSheets, addStudentToSheets } from './lib/sheetsSync';
import { Participant, AttendanceSession, AppSettings, SyncStatus, AttendanceRecord } from './types';
import { Navbar } from './components/Navbar';
import { AttendanceStats } from './components/AttendanceStats';
import { StudentCard } from './components/StudentCard';
import { LevelPickerModal } from './components/LevelPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { StudentManagerModal } from './components/StudentManagerModal';
import { ReportsModal } from './components/ReportsModal';
import { SyncSheetsModal } from './components/SyncSheetsModal';
import { fireLevelUpConfetti, fireAllPresentConfetti } from './lib/confetti';

export default function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Selected date (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Data states
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    appsScriptUrl: '',
    spreadsheetUrl: '',
    nombreEscuela: 'Escuela Deportiva',
    autoSyncSheets: true,
  });

  // UI modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [levelPickerStudent, setLevelPickerStudent] = useState<Participant | null>(null);
  const [levelPickerCurrentLevel, setLevelPickerCurrentLevel] = useState<number>(1);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'level'>('default');

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    message: '',
  });

  // Auto-sync debounce ref
  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Connection test & Auth listener
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Load app settings
    getAppSettings().then((s) => {
      if (s) setSettings(s);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time participants subscription
  useEffect(() => {
    const unsubscribe = subscribeParticipants(async (loaded) => {
      if (loaded.length === 0) {
        // Seed initial participants if empty so coach has instant test data
        const didSeed = await seedInitialParticipantsIfEmpty();
        if (!didSeed) setParticipants([]);
      } else {
        setParticipants(loaded);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Real-time Attendance Session for selected date
  useEffect(() => {
    const unsubscribe = subscribeAttendanceSession(selectedDate, (loadedSession) => {
      if (loadedSession) {
        // Sanitize: filter out any orphaned IDs not in current participants
        const validIdSet = new Set(participants.map((p) => p.id));
        const sanitizedAsistencias: Record<string, AttendanceRecord> = {};
        let realPresentCount = 0;

        if (loadedSession.asistencias) {
          Object.entries(loadedSession.asistencias).forEach(([id, rec]) => {
            if (validIdSet.size === 0 || validIdSet.has(id)) {
              sanitizedAsistencias[id] = rec;
              if (rec?.presente) realPresentCount++;
            }
          });
        }

        setSession({
          ...loadedSession,
          asistencias: sanitizedAsistencias,
          totalPresentes: realPresentCount,
          totalAusentes: Math.max(0, (participants.length || loadedSession.totalAusentes) - realPresentCount),
        });
      } else {
        // Create blank virtual session
        setSession({
          id: selectedDate,
          fecha: selectedDate,
          asistencias: {},
          totalPresentes: 0,
          totalAusentes: participants.length,
          sincronizadoSheets: false,
        });
      }
    });

    return () => unsubscribe();
  }, [selectedDate, participants]);

  // Handle Sheets Sync
  const performSyncToSheets = useCallback(
    async (targetSession: AttendanceSession) => {
      if (!settings.appsScriptUrl) {
        setSyncStatus({
          state: 'error',
          message: 'Configura la URL de Google Apps Script en Ajustes',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        return;
      }

      setSyncStatus({ state: 'syncing', message: 'Sincronizando con Google Sheets...' });
      const result = await sendAttendanceToSheets(settings.appsScriptUrl, targetSession, participants);

      if (result.success) {
        setSyncStatus({
          state: 'success',
          message: result.message,
          timestamp: result.timestamp,
        });

        // Mark session as synced in Firebase
        const updatedSession: AttendanceSession = {
          ...targetSession,
          sincronizadoSheets: true,
          ultimaSincronizacionSheets: result.timestamp,
        };
        await saveAttendanceSession(updatedSession);
      } else {
        setSyncStatus({
          state: 'error',
          message: result.message,
          timestamp: result.timestamp,
        });
      }
    },
    [settings.appsScriptUrl, participants]
  );

  // Trigger auto-sync with debounce (3 seconds after coach finishes marking)
  const scheduleAutoSync = useCallback(
    (newSession: AttendanceSession) => {
      if (!settings.autoSyncSheets || !settings.appsScriptUrl) return;

      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }

      setSyncStatus({
        state: 'syncing',
        message: 'Guardado en Firebase. Enviando a Sheets en segundo plano...',
      });

      autoSyncTimerRef.current = setTimeout(() => {
        performSyncToSheets(newSession);
      }, 3000);
    },
    [settings.autoSyncSheets, settings.appsScriptUrl, performSyncToSheets]
  );

  // Toggle presence of a participant
  const handleTogglePresence = async (participantId: string, currentPresence: boolean) => {
    if (!session) return;

    const newPresence = !currentPresence;
    const currentRecord = session.asistencias?.[participantId];
    const participant = participants.find((p) => p.id === participantId);
    const assignedLevel = currentRecord?.nivel || participant?.mejorNivel || 1;

    const updatedAsistencias: Record<string, AttendanceRecord> = {
      ...session.asistencias,
      [participantId]: {
        presente: newPresence,
        nivel: assignedLevel,
        actualizadoEn: new Date().toISOString(),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };

    const presentCount = Object.values(updatedAsistencias).filter((r) => r.presente).length;
    const absentCount = participants.length - presentCount;

    const updatedSession: AttendanceSession = {
      ...session,
      asistencias: updatedAsistencias,
      totalPresentes: presentCount,
      totalAusentes: absentCount,
      registradoPor: currentUser?.displayName || currentUser?.email || 'Entrenador',
      sincronizadoSheets: false,
    };

    // Optimistic local state + ultra-fast Firestore write
    setSession(updatedSession);
    await saveAttendanceSession(updatedSession);

    // If all present, celebrate!
    if (presentCount === participants.length && participants.length > 0 && newPresence) {
      fireAllPresentConfetti();
    }

    scheduleAutoSync(updatedSession);
  };

  // Update level for a participant
  const handleUpdateLevel = async (participantId: string, newLevel: number) => {
    if (!session) return;

    const participant = participants.find((p) => p.id === participantId);
    const isNewRecord = participant && newLevel > (participant.mejorNivel || 1);

    const updatedAsistencias: Record<string, AttendanceRecord> = {
      ...session.asistencias,
      [participantId]: {
        presente: true, // Marking level automatically marks present
        nivel: newLevel,
        actualizadoEn: new Date().toISOString(),
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };

    const presentCount = Object.values(updatedAsistencias).filter((r) => r.presente).length;

    const updatedSession: AttendanceSession = {
      ...session,
      asistencias: updatedAsistencias,
      totalPresentes: presentCount,
      totalAusentes: participants.length - presentCount,
      sincronizadoSheets: false,
    };

    setSession(updatedSession);
    await saveAttendanceSession(updatedSession);

    // If new historical record, update participant document and launch confetti!
    if (isNewRecord && participant) {
      fireLevelUpConfetti();
      await saveParticipant({
        ...participant,
        mejorNivel: newLevel,
      });
    }

    scheduleAutoSync(updatedSession);
  };

  // Fast action: Mark all present
  const handleMarkAll = async (present: boolean) => {
    if (!session || participants.length === 0) return;

    const updatedAsistencias: Record<string, AttendanceRecord> = {};
    participants.forEach((p) => {
      const existing = session.asistencias?.[p.id];
      updatedAsistencias[p.id] = {
        presente: present,
        nivel: existing?.nivel || p.mejorNivel || 1,
        actualizadoEn: new Date().toISOString(),
      };
    });

    const count = present ? participants.length : 0;
    const updatedSession: AttendanceSession = {
      ...session,
      asistencias: updatedAsistencias,
      totalPresentes: count,
      totalAusentes: participants.length - count,
      sincronizadoSheets: false,
    };

    setSession(updatedSession);
    await saveAttendanceSession(updatedSession);

    if (present) {
      fireAllPresentConfetti();
      scheduleAutoSync(updatedSession);
    } else {
      // Clear immediately in Sheets too
      performSyncToSheets(updatedSession);
    }
  };

  // Change selected date
  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Save App Settings
  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveAppSettings(newSettings);
  };

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    });
    return Array.from(set).sort();
  }, [participants]);

  // Filtered & sorted participants
  const displayedParticipants = useMemo(() => {
    return participants
      .filter((p) => {
        // Search filter
        if (searchQuery.trim()) {
          const matchName = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
          const matchCat = p.categoria?.toLowerCase().includes(searchQuery.toLowerCase());
          if (!matchName && !matchCat) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && p.categoria !== categoryFilter) {
          return false;
        }

        // Status filter
        const isPresent = Boolean(session?.asistencias?.[p.id]?.presente);
        if (statusFilter === 'present' && !isPresent) return false;
        if (statusFilter === 'absent' && isPresent) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'level') {
          const lvlA = session?.asistencias?.[a.id]?.nivel || a.mejorNivel || 1;
          const lvlB = session?.asistencias?.[b.id]?.nivel || b.mejorNivel || 1;
          return lvlB - lvlA;
        }
        return (a.orden ?? 999) - (b.orden ?? 999);
      });
  }, [participants, session, searchQuery, statusFilter, categoryFilter, sortBy]);

  // Count participants with record today
  const nuevosRecordsHoy = useMemo(() => {
    if (!session?.asistencias) return 0;
    return participants.filter((p) => {
      const rec = session.asistencias[p.id];
      return rec?.presente && rec.nivel > (p.mejorNivel || 1);
    }).length;
  }, [participants, session]);

  // Formatted date string in Spanish
  const formattedDateTitle = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const str = dateObj.toLocaleDateString('es-ES', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [selectedDate]);

  const handleImportFromSheets = async (targetDate = selectedDate) => {
    if (!settings.appsScriptUrl) {
      setSyncStatus({ state: 'error', message: 'Configura la URL de Google Apps Script' });
      setIsSettingsOpen(true);
      return;
    }
    setSyncStatus({ state: 'syncing', message: 'Leyendo planilla Google Sheets...' });
    try {
      const result = await importParticipantsFromSheets(settings.appsScriptUrl, targetDate);
      if (result.success && result.participants.length > 0) {
        for (const p of result.participants) {
          await saveParticipant(p);
        }
        if (result.participants.length > 0) {
          // Map attendance from Sheet by normalized participant name
          const sheetAttByName = new Map<string, { present: boolean; level: number }>();
          result.participants.forEach((sp) => {
            const att = result.rawAttendance?.[sp.id];
            if (att) {
              sheetAttByName.set(sp.nombre.trim().toLowerCase(), att);
            }
          });

          // Determine target participants (prefer app participants, fallback to imported)
          const targetList = participants.length > 0 ? participants : result.participants;
          const updatedAsistencias: Record<string, AttendanceRecord> = {};
          let presentCount = 0;

          targetList.forEach((p) => {
            const nameKey = p.nombre.trim().toLowerCase();
            const sheetRec = sheetAttByName.get(nameKey);
            const isPresent = Boolean(sheetRec?.present);
            if (isPresent) presentCount++;

            updatedAsistencias[p.id] = {
              presente: isPresent,
              nivel: sheetRec?.level || p.mejorNivel || 1,
              actualizadoEn: new Date().toISOString(),
              hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          });

          const updatedSession: AttendanceSession = {
            id: targetDate,
            fecha: targetDate,
            asistencias: updatedAsistencias,
            totalPresentes: presentCount,
            totalAusentes: Math.max(0, targetList.length - presentCount),
            sincronizadoSheets: true,
            ultimaSincronizacionSheets: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setSession(updatedSession);
          await saveAttendanceSession(updatedSession);
        }
        setSyncStatus({
          state: 'success',
          message: `¡${result.participants.length} alumnos traídos desde Sheets a Firebase!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        throw new Error(result.message || 'No se pudieron obtener alumnos');
      }
    } catch (err: any) {
      setSyncStatus({
        state: 'error',
        message: err.message || 'Error al conectar con Sheets',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        schoolName={settings.nombreEscuela || 'Registro de Asistencia'}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenStudents={() => setIsStudentsOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        isOnline={true}
        sheetsConfigured={Boolean(settings.appsScriptUrl)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Date Selector & Sync status row */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date Picker Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 transition-colors border border-slate-700/60"
              title="Día anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex-1 md:flex-initial">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-100 text-sm font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 transition-colors border border-slate-700/60"
              title="Día siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {selectedDate !== getTodayString() && (
              <button
                onClick={() => setSelectedDate(getTodayString())}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700/60 transition-colors"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Sync status & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between md:justify-end gap-2.5">
            <div className="text-xs">
              {syncStatus.state === 'syncing' ? (
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{syncStatus.message || 'Sincronizando...'}</span>
                </span>
              ) : syncStatus.state === 'success' ? (
                <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[240px]">{syncStatus.message}</span>
                </span>
              ) : syncStatus.state === 'error' ? (
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[240px]">{syncStatus.message}</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Sincronización instantánea</span>
                </span>
              )}
            </div>

            {/* Action Buttons: Traer de Sheets & Enviar a Sheets */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleImportFromSheets(selectedDate)}
                disabled={syncStatus.state === 'syncing' || !settings.appsScriptUrl}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 active:scale-95 disabled:opacity-40 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                title="Descargar alumnos y marcas de Google Sheets hacia Firebase"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Traer Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => session && performSyncToSheets(session)}
                disabled={syncStatus.state === 'syncing' || !settings.appsScriptUrl}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-40 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                title="Enviar y guardar la asistencia de la app en la planilla Google Sheets"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Enviar Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="hidden sm:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer items-center justify-center"
                title="Centro de sincronización (Traer historial de múltiples días)"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Date Title Banner */}
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
              {formattedDateTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Toca sobre cada alumno para marcar asistencia o ajusta su nivel del 1 al 12
            </p>
          </div>

          {session && session.totalPresentes > 0 && (
            <button
              type="button"
              onClick={() => handleMarkAll(false)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Poner todos los alumnos en ausente (0 presentes / sin entrenamiento)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sin entrenamiento (0)</span>
            </button>
          )}
        </div>

        {/* Helper banner if selected date has 0 presents */}
        {session?.totalPresentes === 0 && participants.length > 0 && (
          <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-teal-300">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-400 shrink-0" />
              <span>¿Ya tienes asistencia tomada en Google Sheets para esta fecha?</span>
            </div>
            <button
              type="button"
              onClick={() => handleImportFromSheets(selectedDate)}
              disabled={syncStatus.state === 'syncing' || !settings.appsScriptUrl}
              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Traer datos de esta fecha desde Sheets</span>
            </button>
          </div>
        )}

        {/* Attendance Stats Cards */}
        <AttendanceStats
          totalAlumnos={participants.length}
          totalPresentes={session?.totalPresentes || 0}
          totalAusentes={participants.length - (session?.totalPresentes || 0)}
          nuevosRecords={nuevosRecordsHoy}
        />

        {/* Search, Filters and Bulk Actions */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="default">Orden de Lista</option>
              <option value="name">Alfabético (A-Z)</option>
              <option value="level">Por Nivel (Mayor a menor)</option>
            </select>
          </div>

          {/* Quick Filter Pills & Bulk Toggles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Status pills */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({participants.length})
              </button>
              <button
                onClick={() => setStatusFilter('present')}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'present'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Presentes ({session?.totalPresentes || 0})
              </button>
              <button
                onClick={() => setStatusFilter('absent')}
                className={`py-1.5 px-2 sm:px-3 text-center rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'absent'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Ausentes ({participants.length - (session?.totalPresentes || 0)})
              </button>
            </div>

            {/* Quick Bulk Actions */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleMarkAll(true)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 border border-slate-700/60 transition-colors"
                title="Marcar todos como presentes"
              >
                <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Marcar Todos</span>
              </button>
              <button
                onClick={() => handleMarkAll(false)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700/60 transition-colors"
                title="Desmarcar todos"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Student Cards List */}
        <div className="space-y-2.5">
          {displayedParticipants.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <p className="text-sm font-semibold text-slate-400">No hay alumnos que coincidan con la búsqueda.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            displayedParticipants.map((p) => (
              <StudentCard
                key={p.id}
                participant={p}
                attendanceRecord={session?.asistencias?.[p.id]}
                onTogglePresence={handleTogglePresence}
                onUpdateLevel={handleUpdateLevel}
                onOpenLevelPicker={(participant, lvl) => {
                  setLevelPickerStudent(participant);
                  setLevelPickerCurrentLevel(lvl);
                }}
              />
            ))
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-8 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Base de datos Firestore conectada con persistencia instantánea y offline.</span>
          </div>
          {settings.spreadsheetUrl && (
            <a
              href={settings.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Google Spreadsheet de Reportes</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </footer>

      {/* Modals */}
      <LevelPickerModal
        isOpen={Boolean(levelPickerStudent)}
        participant={levelPickerStudent}
        currentLevel={levelPickerCurrentLevel}
        onClose={() => setLevelPickerStudent(null)}
        onSelectLevel={(lvl) => {
          if (levelPickerStudent) {
            handleUpdateLevel(levelPickerStudent.id, lvl);
          }
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <StudentManagerModal
        isOpen={isStudentsOpen}
        onClose={() => setIsStudentsOpen(false)}
        participants={participants}
        onSaveParticipant={async (p) => {
          await saveParticipant(p);
          if (settings.appsScriptUrl) {
            addStudentToSheets(settings.appsScriptUrl, p.nombre, p.mejorNivel).catch(console.error);
          }
        }}
        onDeleteParticipant={async (id) => {
          await deleteParticipant(id);
        }}
        onSeedDemo={async () => {
          await seedInitialParticipantsIfEmpty();
        }}
        onImportFromSheets={handleImportFromSheets}
      />

      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        participants={participants}
        spreadsheetUrl={settings.spreadsheetUrl}
        onSyncSessionToSheets={performSyncToSheets}
        onSelectDate={(d) => setSelectedDate(d)}
      />

      <SyncSheetsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        settings={settings}
        participants={participants}
        currentSession={session}
        selectedDate={selectedDate}
        onRefreshData={() => {
          handleImportFromSheets(selectedDate);
        }}
      />
    </div>
  );
}
