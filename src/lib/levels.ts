import { LevelInfo } from '../types';

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Nivel 1 - Blanco', color: '#94a3b8', bgLight: 'bg-slate-800 text-slate-200 border-slate-700', badgeClass: 'bg-slate-700/80 text-slate-200 border border-slate-600' },
  { level: 2, name: 'Nivel 2 - Amarillo', color: '#facc15', bgLight: 'bg-amber-950/40 text-amber-300 border-amber-800/60', badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' },
  { level: 3, name: 'Nivel 3 - Naranja', color: '#fb923c', bgLight: 'bg-orange-950/40 text-orange-300 border-orange-800/60', badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40' },
  { level: 4, name: 'Nivel 4 - Verde', color: '#4ade80', bgLight: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60', badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
  { level: 5, name: 'Nivel 5 - Azul', color: '#38bdf8', bgLight: 'bg-sky-950/40 text-sky-300 border-sky-800/60', badgeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/40' },
  { level: 6, name: 'Nivel 6 - Púrpura', color: '#c084fc', bgLight: 'bg-purple-950/40 text-purple-300 border-purple-800/60', badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40' },
  { level: 7, name: 'Nivel 7 - Rojo', color: '#f87171', bgLight: 'bg-rose-950/40 text-rose-300 border-rose-800/60', badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40' },
  { level: 8, name: 'Nivel 8 - Marrón', color: '#d97706', bgLight: 'bg-yellow-950/40 text-yellow-400 border-yellow-800/60', badgeClass: 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/40' },
  { level: 9, name: 'Nivel 9 - Bronce', color: '#ea580c', bgLight: 'bg-amber-950/60 text-amber-200 border-amber-700/60', badgeClass: 'bg-amber-700/30 text-amber-200 border border-amber-600/50' },
  { level: 10, name: 'Nivel 10 - Plata', color: '#e2e8f0', bgLight: 'bg-slate-800/80 text-slate-100 border-slate-500/60', badgeClass: 'bg-slate-300/20 text-slate-100 border border-slate-400/50' },
  { level: 11, name: 'Nivel 11 - Oro', color: '#fde047', bgLight: 'bg-yellow-950/60 text-yellow-200 border-yellow-500/60', badgeClass: 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]' },
  { level: 12, name: 'Nivel 12 - Maestro / Diamante', color: '#22d3ee', bgLight: 'bg-cyan-950/60 text-cyan-200 border-cyan-500/60', badgeClass: 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.3)]' },
];

export function getLevelInfo(levelNumber: number): LevelInfo {
  const clamped = Math.max(1, Math.min(12, Math.round(levelNumber || 1)));
  return LEVELS[clamped - 1] || LEVELS[0];
}
