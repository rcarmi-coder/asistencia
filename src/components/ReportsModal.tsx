import React, { useState, useEffect } from 'react';
import { X, Calendar, Download, ExternalLink, CheckCircle2, Clock, RefreshCw, BarChart2, Eye } from 'lucide-react';
import { AttendanceSession, Participant } from '../types';
import { getRecentAttendanceSessions } from '../lib/firestoreService';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  spreadsheetUrl?: string;
  onSyncSessionToSheets: (session: AttendanceSession) => Promise<void>;
  onSelectDate?: (fecha: string) => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  participants,
  spreadsheetUrl,
  onSyncSessionToSheets,
  onSelectDate,
}) => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDate, setSyncingDate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getRecentAttendanceSessions(100)
        .then((data) => setSessions(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (sessions.length === 0) return;

    // Build CSV matrix: Headers: Alumno, Categoria, Mejor Nivel, [Date 1, Date 2, ...]
    const dates = sessions.map((s) => s.fecha).sort();
    const headers = ['ID', 'Alumno', 'Categoría', 'Mejor Nivel', ...dates];

    const rows = participants.map((p) => {
      const studentRow = [
        p.id,
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${(p.categoria || '').replace(/"/g, '""')}"`,
        p.mejorNivel || 1,
      ];

      dates.forEach((d) => {
        const session = sessions.find((s) => s.fecha === d);
        const record = session?.asistencias?.[p.id];
        if (record && record.presente) {
          studentRow.push(`"PRESENTE (Nivel ${record.nivel})"`);
        } else {
          studentRow.push('"AUSENTE"');
        }
      });

      return studentRow.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_asistencia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSync = async (session: AttendanceSession) => {
    setSyncingDate(session.fecha);
    try {
      await onSyncSessionToSheets(session);
      // Refresh local view
      const updated = await getRecentAttendanceSessions(30);
      setSessions(updated);
    } finally {
      setSyncingDate(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">Historial y Reportes</h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Resumen de jornadas</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={sessions.length === 0}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Descargar matriz en Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Abrir Google Sheet</span>
                <span className="sm:hidden">Sheet</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando historial de asistencias...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">Aún no hay registros de asistencia guardados.</p>
              <p className="text-xs text-slate-600 mt-1">Registra asistencia hoy en la pantalla principal.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const totalAlumnos = participants.length;
                const porcentaje = totalAlumnos > 0 ? Math.round((s.totalPresentes / totalAlumnos) * 100) : 0;
                const isSyncing = syncingDate === s.fecha;

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{s.fecha}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {s.totalPresentes} presentes ({porcentaje}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        {s.sincronizadoSheets ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sincronizado con Sheets
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Guardado en Firebase (Pendiente Sheets)
                          </span>
                        )}
                        {s.ultimaSincronizacionSheets && (
                          <span className="text-slate-500">Último envío: {s.ultimaSincronizacionSheets}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {onSelectDate && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectDate(s.fecha);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold flex items-center gap-1 border border-teal-500/30 transition-colors"
                          title="Cargar esta fecha en la pantalla principal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver en pantalla</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleManualSync(s)}
                        disabled={isSyncing}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                        <span>{isSyncing ? 'Enviando...' : 'Re-sincronizar a Sheets'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
