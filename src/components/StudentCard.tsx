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
      className={`relative select-none rounded-2xl p-3 sm:p-4 transition-all duration-150 cursor-pointer border ${
        isPresent
          ? 'bg-slate-900/95 border-emerald-500/60 shadow-lg shadow-emerald-950/25 ring-1 ring-emerald-500/30'
          : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Big Check Circle + Student Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Touch check circle */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
              isPresent
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'border-2 border-slate-700 bg-slate-900/80 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className={`w-5 h-5 stroke-[3] transition-opacity ${isPresent ? 'opacity-100 text-slate-950' : 'opacity-0'}`} />
          </div>

          {/* Student name & badges: Structured cleanly without text collisions */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`text-sm sm:text-base font-bold leading-tight ${isPresent ? 'text-slate-100 font-extrabold' : 'text-slate-200'}`}>
                {participant.nombre}
              </h3>
              {isNewRecord && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-bounce shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-400" /> ¡Récord!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              {participant.categoria && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/70 text-[10px] text-slate-300 font-medium shrink-0">
                  {participant.categoria}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400 shrink-0">
                <Trophy className="w-3 h-3 text-amber-400/80" />
                Récord: <strong className="text-slate-200 font-semibold">Nivel {bestLevel}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Dedicated Level Dropdown Pill (Fixed width, never overflows or collides) */}
        <div
          className="relative w-[98px] sm:w-[108px] h-9 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Custom Styled Button showing clean Level and Color */}
          <div
            className="w-full h-full rounded-xl px-2.5 flex items-center justify-between border shadow-sm transition-all pointer-events-none"
            style={{
              backgroundColor: `${levelInfo.color}22`,
              borderColor: `${levelInfo.color}88`,
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: levelInfo.color }}
              />
              <span className="text-xs font-extrabold text-slate-100 tracking-tight whitespace-nowrap">
                Nivel {currentLevel}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0 opacity-80" />
          </div>

          {/* Invisible Native Select layered on top: Captures taps and triggers native OS picker */}
          <select
            value={currentLevel}
            onChange={handleLevelChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base"
            title="Seleccionar nivel"
          >
            {LEVELS.map((lvl) => (
              <option
                key={lvl.number}
                value={lvl.number}
                className="bg-slate-900 text-slate-100"
              >
                Nivel {lvl.number} - {lvl.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
