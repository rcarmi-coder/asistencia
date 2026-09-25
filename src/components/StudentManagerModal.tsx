import React, { useState } from 'react';
import { X, UserPlus, Trash2, Edit2, Check, Sparkles, Search, Trophy, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Participant } from '../types';
import { LEVELS, getLevelInfo } from '../lib/levels';

interface StudentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  onSaveParticipant: (participant: Participant) => Promise<void>;
  onDeleteParticipant: (id: string) => Promise<void>;
  onSeedDemo: () => Promise<void>;
  onImportFromSheets?: () => Promise<void>;
}

export const StudentManagerModal: React.FC<StudentManagerModalProps> = ({
  isOpen,
  onClose,
  participants,
  onSaveParticipant,
  onDeleteParticipant,
  onSeedDemo,
  onImportFromSheets,
}) => {
  const [search, setSearch] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [nombre, setNombre] = useState('');
  const [mejorNivel, setMejorNivel] = useState(1);
  const [categoria, setCategoria] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = participants.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  const startAdd = () => {
    setEditingParticipant(null);
    setNombre('');
    setMejorNivel(1);
    setCategoria('');
    setIsAdding(true);
  };

  const startEdit = (p: Participant) => {
    setEditingParticipant(p);
    setNombre(p.nombre);
    setMejorNivel(p.mejorNivel || 1);
    setCategoria(p.categoria || '');
    setIsAdding(true);
  };

  const handleImport = async () => {
    if (!onImportFromSheets) return;
    setIsImporting(true);
    setImportMessage(null);
    try {
      await onImportFromSheets();
      setImportMessage('¡Alumnos sincronizados desde la planilla con éxito!');
      setTimeout(() => setImportMessage(null), 3000);
    } catch (e: any) {
      setImportMessage(`Error: ${e.message || 'No se pudo sincronizar'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSaving(true);
    try {
      const participantToSave: Participant = {
        id: editingParticipant ? editingParticipant.id : '',
        nombre: nombre.trim(),
        mejorNivel: Number(mejorNivel),
        categoria: categoria.trim(),
        activo: editingParticipant ? editingParticipant.activo : true,
        orden: editingParticipant?.orden ?? participants.length + 1,
        creadoEn: editingParticipant?.creadoEn,
      };

      await onSaveParticipant(participantToSave);
      setIsAdding(false);
      setEditingParticipant(null);
      setNombre('');
    } catch (err) {
      console.error('Error saving participant:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">Alumnos / Deportistas</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              {participants.length} registrados
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onImportFromSheets && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold flex items-center gap-1.5 border border-teal-500/30 transition-colors disabled:opacity-50"
                title="Leer alumnos directamente desde la planilla de Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isImporting ? 'Importando...' : 'Importar Sheets'}</span>
                <span className="sm:hidden">{isImporting ? '...' : 'Sheets'}</span>
              </button>
            )}
            {!isAdding && (
              <button
                type="button"
                onClick={startAdd}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-bold text-xs text-slate-950 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo Alumno</span>
                <span className="sm:hidden">+ Alumno</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {importMessage && (
          <div className="px-6 py-2 bg-emerald-950/60 border-b border-emerald-800/60 text-xs text-emerald-300 font-medium flex items-center justify-between">
            <span>{importMessage}</span>
            <button onClick={() => setImportMessage(null)} className="text-emerald-400 font-bold">&times;</button>
          </div>
        )}

        {/* Add/Edit Form */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>{editingParticipant ? 'Editar Alumno' : 'Agregar Nuevo Alumno'}</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Lucas Bravo"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nivel Inicial (1-12)</label>
                <select
                  value={mejorNivel}
                  onChange={(e) => setMejorNivel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl.level} value={lvl.level}>
                      Nivel {lvl.level} - {lvl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Categoría (Opcional)</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej. Juvenil, Adulto, Grupo A"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Guardando...' : editingParticipant ? 'Actualizar' : 'Guardar Alumno'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
            />
          </div>

          {participants.length === 0 && (
            <button
              onClick={onSeedDemo}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cargar Lista de Prueba</span>
            </button>
          )}
        </div>

        {/* Student list */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">No se encontraron alumnos con ese criterio.</p>
              {participants.length === 0 && (
                <button
                  onClick={onSeedDemo}
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                >
                  Cargar lista de ejemplo (12 alumnos)
                </button>
              )}
            </div>
          ) : (
            filtered.map((p) => {
              const lvl = getLevelInfo(p.mejorNivel || 1);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-slate-950 shrink-0"
                      style={{ backgroundColor: lvl.color }}
                    >
                      {p.mejorNivel || 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-200 truncate">{p.nombre}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {p.categoria && <span>{p.categoria}</span>}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-400/90">
                          <Trophy className="w-3 h-3" /> Nivel {p.mejorNivel || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {deletingId === p.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-600/60 rounded-lg p-1 animate-in fade-in duration-150">
                        <span className="text-[11px] text-rose-200 px-1 font-semibold">¿Eliminar?</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteParticipant(p.id);
                            setDeletingId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(p.id)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar del registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
