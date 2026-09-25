import React from 'react';
import { Users, UserCheck, UserX, Award } from 'lucide-react';

interface AttendanceStatsProps {
  totalAlumnos: number;
  totalPresentes: number;
  totalAusentes: number;
  nuevosRecords: number;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  totalAlumnos,
  totalPresentes,
  totalAusentes,
  nuevosRecords,
}) => {
  const porcentaje = totalAlumnos > 0 ? Math.round((totalPresentes / totalAlumnos) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {/* Presentes */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
          <span>Presentes</span>
          <UserCheck className="w-4 h-4 text-emerald-400/80" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-100">{totalPresentes}</span>
          <span className="text-xs text-slate-400">/ {totalAlumnos}</span>
        </div>
        <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Ausentes */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-rose-400 mb-1">
          <span>Ausentes</span>
          <UserX className="w-4 h-4 text-rose-400/80" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-100">{totalAusentes}</span>
          <span className="text-xs text-slate-400">{100 - porcentaje}%</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 font-medium">
          {totalAusentes === 0 && totalAlumnos > 0 ? '¡Asistencia 100%!' : 'Pendientes'}
        </div>
      </div>

      {/* % Asistencia */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-sky-400 mb-1">
          <span>% Asistencia</span>
          <Users className="w-4 h-4 text-sky-400/80" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-100">{porcentaje}%</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 truncate">
          {porcentaje >= 80 ? 'Excelente quórum' : porcentaje >= 50 ? 'Quórum regular' : 'Iniciando toma'}
        </div>
      </div>

      {/* Progresión / Nuevos Récords */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
          <span>Progresiones Hoy</span>
          <Award className="w-4 h-4 text-amber-400/80" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-amber-300">{nuevosRecords}</span>
          <span className="text-xs text-slate-400">alumnos</span>
        </div>
        <div className="mt-2 text-[11px] text-amber-400/80 font-medium truncate">
          {nuevosRecords > 0 ? '¡Superaron su récord!' : 'Evaluando niveles'}
        </div>
      </div>
    </div>
  );
};
