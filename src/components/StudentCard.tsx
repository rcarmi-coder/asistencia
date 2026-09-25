import React from 'react';
import { Check, Plus, Minus, Sparkles, Trophy } from 'lucide-react';
import { Participant, AttendanceRecord } from '../types';
import { getLevelInfo } from '../lib/levels';

interface StudentCardProps {
  participant: Participant;
  attendanceRecord?: AttendanceRecord;
  onTogglePresence: (participantId: string, currentPresence: boolean) => void;
  onUpdateLevel: (participantId: string, newLevel: number) => void;
  onOpenLevelPicker: (participant: Participant, currentLevel: number) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  participant,
  attendanceRecord,
  onTogglePresence,
  onUpdateLevel,
  onOpenLevelPicker,
}) => {
  const isPresent = Boolean(attendanceRecord?.presente);
  // Current session level or fallback to participant's registered level
  const currentLevel = attendanceRecord?.nivel || participant.mejorNivel || 1;
  const bestLevel = participant.mejorNivel || 1;
  const isNewRecord = isPresent && currentLevel > bestLevel;

  const levelInfo = getLevelInfo(currentLevel);
  const bestLevelInfo = getLevelInfo(bestLevel);

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
    onTogglePresence(participant.id, isPresent);
  };

  const handleStepDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentLevel > 1) {
      onUpdateLevel(participant.id, currentLevel - 1);
    }
  };

  const handleStepUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentLevel < 12) {
      onUpdateLevel(participant.id, currentLevel + 1);
    }
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenLevelPicker(participant, currentLevel);
  };

  return (
    <div
      onClick={handleToggle}
      className={`relative select-none rounded-xl p-3.5 sm:p-4 transition-all duration-150 cursor-pointer border ${
        isPresent
          ? 'bg-slate-900/90 border-emerald-500/50 shadow-md shadow-emerald-950/30'
          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Checkmark & Student info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Touch check circle */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
              isPresent
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 font-black'
                : 'border-2 border-slate-700 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className={`w-5 h-5 sm:w-5 sm:h-5 stroke-[3] ${isPresent ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* Student name & badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm sm:text-base font-bold truncate ${isPresent ? 'text-slate-100' : 'text-slate-300'}`}>
                {participant.nombre}
              </span>
              {isNewRecord && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-bounce">
                  <Sparkles className="w-3 h-3 text-amber-400" /> ¡Nuevo Récord!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              {participant.categoria && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px] text-slate-300 font-medium">
                  {participant.categoria}
                </span>
              )}
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Trophy className="w-3 h-3 text-amber-400/80" />
                Récord: <strong className="text-slate-200">Nivel {bestLevel}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Level Controller with steppers & badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleStepDown}
            disabled={currentLevel <= 1}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center justify-center border border-slate-700 transition-colors"
            title="Bajar nivel"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Level clickable button */}
          <button
            type="button"
            onClick={handleBadgeClick}
            className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${levelInfo.badgeClass}`}
            title="Seleccionar nivel (1-12)"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: levelInfo.color }} />
            <span>Nivel {currentLevel}</span>
          </button>

          <button
            type="button"
            onClick={handleStepUp}
            disabled={currentLevel >= 12}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none text-slate-300 flex items-center justify-center border border-slate-700 transition-colors"
            title="Subir nivel"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
