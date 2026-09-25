import React from 'react';
import { X, Trophy, Check } from 'lucide-react';
import { Participant } from '../types';
import { LEVELS } from '../lib/levels';

interface LevelPickerModalProps {
  participant: Participant | null;
  currentLevel: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: number) => void;
}

export const LevelPickerModal: React.FC<LevelPickerModalProps> = ({
  participant,
  currentLevel,
  isOpen,
  onClose,
  onSelectLevel,
}) => {
  if (!isOpen || !participant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">Seleccionar Nivel</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              {participant.nombre} • Récord: <strong className="text-amber-400">Nivel {participant.mejorNivel || 1}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level grid */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {LEVELS.map((item) => {
            const isSelected = item.level === currentLevel;
            const isBest = item.level === participant.mejorNivel;
            const isPromotion = item.level > (participant.mejorNivel || 1);

            return (
              <button
                key={item.level}
                onClick={() => {
                  onSelectLevel(item.level);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? `${item.badgeClass} ring-2 ring-emerald-500 font-bold`
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-slate-950 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.level}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {item.level <= 3 ? 'Iniciación / Fundamentos' : item.level <= 6 ? 'Intermedio / Desarrollo' : item.level <= 9 ? 'Avanzado / Competitivo' : 'Maestría / Élite'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPromotion && (
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      + Récord
                    </span>
                  )}
                  {isBest && (
                    <span className="text-amber-400 flex items-center gap-1 text-xs" title="Mejor nivel histórico">
                      <Trophy className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
