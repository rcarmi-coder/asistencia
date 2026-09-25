import React from 'react';
import { Check, ChevronDown, Sparkles, Trophy } from 'lucide-react';
import { Participant, AttendanceRecord } from '../types';
import { LEVELS, getLevelInfo } from '../lib/levels';

interface StudentCardProps {
  participant: Participant;
  attendanceRecord?: AttendanceRecord;
  onTogglePresence: (participantId: string, currentPresence: boolean) => void;
  onUpdateLevel: (participantId: string, newLevel: number) => void;
  onOpenLevelPicker?: (participant: Participant, currentLevel: number) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  participant,
  attendanceRecord,
  onTogglePresence,
  onUpdateLevel,
}) => {
  const isPresent = Boolean(attendanceRecord?.presente);
  // Current session level or fallback to participant's registered level
  const currentLevel = attendanceRecord?.nivel || participant.mejorNivel || 1;
  const bestLevel = participant.mejorNivel || 1;
  const isNewRecord = isPresent && currentLevel > bestLevel;

  const levelInfo = getLevelInfo(currentLevel);

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
    onTogglePresence(participant.id, isPresent);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const val = Number(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= 12) {
      onUpdateLevel(participant.id, val);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`relative select-none rounded-xl p-3 sm:p-4 transition-all duration-150 cursor-pointer border ${
        isPresent
          ? 'bg-slate-900/95 border-emerald-500/50 shadow-md shadow-emerald-950/20'
          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Checkmark & Full Student name */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {/* Touch check circle */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
              isPresent
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-black'
                : 'border-2 border-slate-700 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className={`w-5 h-5 stroke-[3] ${isPresent ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* Student name & badges: NO TRUNCATE, fully legible */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className={`text-sm sm:text-base font-bold leading-snug break-words ${isPresent ? 'text-slate-100' : 'text-slate-200'}`}>
                {participant.nombre}
              </h3>
              {isNewRecord && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-bounce shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400" /> ¡Récord!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] sm:text-xs text-slate-400 flex-wrap">
              {participant.categoria && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700/60 text-[10px] text-slate-300 font-medium">
                  {participant.categoria}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Trophy className="w-3 h-3 text-amber-400/80" />
                Récord: <strong className="text-slate-200">Nivel {bestLevel}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: ONLY Level Dropdown (Select menu) */}
        <div
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <select
              value={currentLevel}
              onChange={handleLevelChange}
              className="appearance-none cursor-pointer pl-2.5 pr-7 sm:pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
              style={{
                backgroundColor: `${levelInfo.color}1f`,
                borderColor: `${levelInfo.color}80`,
                color: '#f8fafc',
              }}
              title="Seleccionar nivel del alumno"
            >
              {LEVELS.map((lvl) => (
                <option
                  key={lvl.number}
                  value={lvl.number}
                  className="bg-slate-900 text-slate-100 py-1.5 font-medium"
                >
                  Nivel {lvl.number} - {lvl.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-slate-300">
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
