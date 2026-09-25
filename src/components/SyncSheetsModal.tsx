import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppSettings, Participant, AttendanceSession } from '../types';
import { importParticipantsFromSheets, sendAttendanceToSheets } from '../lib/sheetsSync';
import { saveParticipant, saveAttendanceSession } from '../lib/firestoreService';

interface SyncSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  participants: Participant[];
  currentSession: AttendanceSession | null;
  selectedDate: string;
  onRefreshData: () => void;
}

export const SyncSheetsModal: React.FC<SyncSheetsModalProps> = ({
  isOpen,
  onClose,
  settings,
  participants,
  currentSession,
  selectedDate,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [historyMode, setHistoryMode] = useState<'september' | 'recent' | 'custom'>('september');
  const [daysToImport, setDaysToImport] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-24');
  const [historyProgress, setHistoryProgress] = useState<string>('');
  const [importedDatesLog, setImportedDatesLog] = useState<{ date: string; presents: number }[]>([]);

  if (!isOpen) return null;

  // 1. Import single date from Sheets to Firebase
  const handleImportSingleDate = async (targetDate: string) => {
    if (!settings.appsScriptUrl) {
      setStatusMsg({ type: 'error', text: 'Configura la URL de Google Apps Script en Ajustes' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: `Consultando Google Sheets para la fecha ${targetDate}...` });

    try {
      const result = await importParticipantsFromSheets(settings.appsScriptUrl, targetDate);
      if (!result.success || result.participants.length === 0) {
        throw new Error(result.message || 'No se recibieron datos de la planilla');
      }

      // 1. Save all participants to Firestore
      for (const p of result.participants) {
        await saveParticipant(p);
      }

      // 2. Save session to Firestore
      const now = new Date().toISOString();
      const updatedAsistencias: Record<string, any> = {};
      let presentCount = 0;

      result.participants.forEach((p) => {
        const raw = result.rawAttendance?.[p.id];
        const isPresent = Boolean(raw?.present);
        if (isPresent) presentCount++;
        const lvl = raw?.level || p.mejorNivel || 1;

        updatedAsistencias[p.id] = {
          presente: isPresent,
          nivel: lvl,
          actualizadoEn: now,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });

      const sessionToSave: AttendanceSession = {
        id: targetDate,
        fecha: targetDate,
        asistencias: updatedAsistencias,
        totalPresentes: presentCount,
        totalAusentes: result.participants.length - presentCount,
        registradoPor: 'Importado de Google Sheets',
        sincronizadoSheets: true,
        ultimaSincronizacionSheets: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        creadoEn: now,
        actualizadoEn: now,
      };

      await saveAttendanceSession(sessionToSave);

      setStatusMsg({
        type: 'success',
        text: `¡Éxito! Se importaron ${result.participants.length} participantes y la asistencia del ${targetDate} (${presentCount} presentes) directamente a Firebase.`,
      });
      onRefreshData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al importar datos' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Import multiple historical dates from Sheets into Firebase
  const handleImportHistory = async () => {
    if (!settings.appsScriptUrl) {
      setStatusMsg({ type: 'error', text: 'Configura la URL de Google Apps Script' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Iniciando importación en lote de días anteriores...' });
    setImportedDatesLog([]);

    try {
      let datesToProcess: string[] = [];

      if (historyMode === 'september') {
        // Known class dates in September 2026 including Tuesdays and Thursdays
        datesToProcess = [
          '2026-09-01',
          '2026-09-03',
          '2026-09-08', // Martes 8!
          '2026-09-10',
          '2026-09-15',
          '2026-09-17',
          '2026-09-22',
          '2026-09-24', // Hoy
        ];
      } else if (historyMode === 'custom') {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const curr = new Date(start);
        while (curr <= end) {
          datesToProcess.push(curr.toISOString().slice(0, 10));
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        const base = new Date();
        for (let i = 0; i < daysToImport; i++) {
          const d = new Date(base);
          d.setDate(d.getDate() - i);
          datesToProcess.push(d.toISOString().slice(0, 10));
        }
      }

      let totalDatesImported = 0;
      let totalStudents = 0;
      const logAccumulator: { date: string; presents: number }[] = [];

      for (let idx = 0; idx < datesToProcess.length; idx++) {
        const dateStr = datesToProcess[idx];
        setHistoryProgress(`Consultando día ${idx + 1} de ${datesToProcess.length} (${dateStr})...`);

        const result = await importParticipantsFromSheets(settings.appsScriptUrl, dateStr);
        if (result.success && result.participants.length > 0) {
          totalStudents = result.participants.length;
          // Save participants
          for (const p of result.participants) {
            await saveParticipant(p);
          }

          // Save session if attendance was recorded or if there are participants
          const raw = result.rawAttendance || {};
          const updatedAsistencias: Record<string, any> = {};
          let presentCount = 0;

          result.participants.forEach((p) => {
            const r = raw[p.id];
            const isPresent = Boolean(r?.present);
            if (isPresent) presentCount++;
            updatedAsistencias[p.id] = {
              presente: isPresent,
              nivel: r?.level || p.mejorNivel || 1,
              actualizadoEn: new Date().toISOString(),
            };
          });

          await saveAttendanceSession({
            id: dateStr,
            fecha: dateStr,
            asistencias: updatedAsistencias,
            totalPresentes: presentCount,
            totalAusentes: result.participants.length - presentCount,
            registradoPor: 'Importado de Google Sheets',
            sincronizadoSheets: true,
            ultimaSincronizacionSheets: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          totalDatesImported++;
          logAccumulator.push({ date: dateStr, presents: presentCount });
          setImportedDatesLog([...logAccumulator]);
        }
      }

      setStatusMsg({
        type: 'success',
        text: `¡Importación completada! Se guardaron ${totalStudents} alumnos y ${totalDatesImported} fechas en Firebase.`,
      });
      setHistoryProgress('');
      onRefreshData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error durante la importación histórica' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Export to Sheets
  const handleExportCurrentToSheets = async () => {
    if (!currentSession || !settings.appsScriptUrl) {
      setStatusMsg({ type: 'error', text: 'Falta la sesión de asistencia o la URL de Apps Script' });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Enviando asistencia actual a Google Sheets...' });

    try {
      const res = await sendAttendanceToSheets(settings.appsScriptUrl, currentSession, participants);
      if (res.success) {
        await saveAttendanceSession({
          ...currentSession,
          sincronizadoSheets: true,
          ultimaSincronizacionSheets: res.timestamp,
        });
        setStatusMsg({ type: 'success', text: `¡Planilla actualizada exitosamente! ${res.message}` });
        onRefreshData();
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al enviar a Google Sheets' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Sincronización con Google Sheets</h3>
              <p className="text-xs text-slate-400">Intercambio de datos entre la Planilla y Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => { setActiveTab('import'); setStatusMsg(null); }}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-teal-400 text-teal-400 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Traer de Sheets a Firebase</span>
          </button>

          <button
            onClick={() => { setActiveTab('export'); setStatusMsg(null); }}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Enviar de Firebase a Sheets</span>
          </button>

          <button
            onClick={() => { setActiveTab('history'); setStatusMsg(null); }}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-sky-400 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Traer Historial</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-950/70 border-rose-600/70 text-rose-200'
                  : 'bg-teal-950/70 border-teal-600/70 text-teal-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-teal-400 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1">
                <div>{statusMsg.text}</div>
                {historyProgress && <div className="mt-1 font-semibold text-teal-300">{historyProgress}</div>}
              </div>
            </div>
          )}

          {/* TAB 1: IMPORT FROM SHEETS */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Download className="w-4 h-4 text-teal-400" />
                  <span>¿Qué hace esta acción?</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lee la planilla Google Sheets vinculada a través de Apps Script, descarga la lista completa de alumnos con sus niveles máximos, y recupera las marcas de presencia del día seleccionado (<strong>{selectedDate}</strong>).
                </p>
                <div className="flex items-center gap-2 text-[11px] text-teal-300 pt-1">
                  <Database className="w-3.5 h-3.5" />
                  <span>Todos los datos se guardan inmediatamente en Firebase Firestore.</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-300">Fecha a importar</div>
                  <div className="text-sm font-bold text-slate-100">{selectedDate}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleImportSingleDate(selectedDate)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
                >
                  <Download className={`w-4 h-4 ${loading ? 'animate-bounce' : ''}`} />
                  <span>{loading ? 'Leyendo Planilla...' : 'Traer Fecha Actual a Firebase'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center">
                Al importar, la pantalla principal se actualizará automáticamente con los alumnos y marcas de la planilla.
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT TO SHEETS */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>¿Qué hace esta acción?</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Toma las marcas de asistencia y los niveles actuales registrados en la aplicación para la fecha <strong>{selectedDate}</strong> y los escribe en la columna de esa fecha en tu Google Spreadsheet.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentSession?.totalPresentes || 0} alumnos marcados como presentes hoy en la app.</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-300">Fecha a enviar</div>
                  <div className="text-sm font-bold text-slate-100">{selectedDate}</div>
                </div>
                <button
                  type="button"
                  onClick={handleExportCurrentToSheets}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Upload className={`w-4 h-4 ${loading ? 'animate-bounce' : ''}`} />
                  <span>{loading ? 'Escribiendo en Sheets...' : 'Enviar Asistencia a la Planilla'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>Importar Historial Completo a Firebase</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Si ya tienes registros pasados en tu Google Spreadsheet, esta opción recorre las fechas anteriores e importa todas las marcas a Firebase Firestore para que puedas ver el historial y reportes en la app.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Modo de Importación Histórica:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryMode('september')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors ${
                        historyMode === 'september'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Septiembre 2026 (Clases)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryMode('recent')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors ${
                        historyMode === 'recent'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Últimos 30 días
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryMode('custom')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors ${
                        historyMode === 'custom'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Rango de Fechas
                    </button>
                  </div>
                </div>

                {historyMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Desde</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {historyMode === 'recent' && (
                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-slate-300">Días hacia atrás:</label>
                    <select
                      value={daysToImport}
                      onChange={(e) => setDaysToImport(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                    >
                      <option value={15}>Últimos 15 días</option>
                      <option value={30}>Últimos 30 días</option>
                      <option value={60}>Últimos 60 días</option>
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleImportHistory}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {loading
                      ? 'Importando...'
                      : historyMode === 'september'
                      ? 'Traer Todas las Clases de Septiembre a Firebase'
                      : 'Iniciar Importación Histórica'}
                  </span>
                </button>
              </div>

              {/* Log of imported dates */}
              {importedDatesLog.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Fechas guardadas en Firebase:</span>
                    <span className="text-teal-400">{importedDatesLog.length} fechas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {importedDatesLog.map((item) => (
                      <div
                        key={item.date}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between"
                      >
                        <span className="font-mono text-slate-300">{item.date}</span>
                        <span className={`font-semibold ${item.presents > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {item.presents} presentes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Firebase Firestore conectado</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
