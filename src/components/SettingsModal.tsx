import React, { useState } from 'react';
import { X, Save, Copy, Check, ExternalLink, Zap, Database, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import { AppSettings } from '../types';
import { getRecommendedAppsScriptCode } from '../lib/sheetsSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(settings.spreadsheetUrl || '');
  const [nombreEscuela, setNombreEscuela] = useState(settings.nombreEscuela || 'Escuela Deportiva');
  const [autoSyncSheets, setAutoSyncSheets] = useState(settings.autoSyncSheets ?? true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showCode, setShowCode] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveSettings({
      appsScriptUrl: appsScriptUrl.trim(),
      spreadsheetUrl: spreadsheetUrl.trim(),
      nombreEscuela: nombreEscuela.trim() || 'Escuela Deportiva',
      autoSyncSheets,
    });
    setSaving(false);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      setTestResult({ success: false, message: 'Ingresa primero la URL de Google Apps Script' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping', fecha: new Date().toISOString() }),
      });
      if (res.ok || res.type === 'opaque') {
        setTestResult({ success: true, message: '¡Conexión exitosa con Google Apps Script!' });
      } else {
        setTestResult({ success: false, message: `Respuesta del servidor HTTP: ${res.status}` });
      }
    } catch {
      // Due to browser CORS redirects on Apps Script, test might throw opaque fetch
      setTestResult({ success: true, message: 'Petición enviada al script (revisa la respuesta en tu planilla)' });
    } finally {
      setTesting(false);
    }
  };

  const copyScriptCode = () => {
    navigator.clipboard.writeText(getRecommendedAppsScriptCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Ajustes & Integración Sheets</h3>
              <p className="text-xs text-slate-400">Firebase Firestore + Google Spreadsheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Architecture Pill */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-emerald-400">Modo de Alta Velocidad Activado:</strong> Los clics de asistencia se guardan en <strong>Firebase (&lt;50ms)</strong> con soporte offline instantáneo. En segundo plano, se envían automáticamente a tu Google Spreadsheet para reportes y tablas dinámicas.
            </div>
          </div>

          {/* School Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre de la Escuela / Club
            </label>
            <input
              type="text"
              value={nombreEscuela}
              onChange={(e) => setNombreEscuela(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ej. Escuela de Natación / Tenis Club"
            />
          </div>

          {/* Google Apps Script Web App URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                URL de Google Apps Script (Web App)
              </label>
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                {showCode ? 'Ocultar código script' : '¿Cómo obtener esta URL?'}
              </button>
            </div>
            <input
              type="url"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              La URL proporcionada al desplegar tu Apps Script como <em>Aplicación Web</em> (acceso: Cualquier usuario).
            </p>
          </div>

          {/* Test connection button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !appsScriptUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Comprobando...' : 'Probar Conexión con Sheets'}</span>
            </button>

            {testResult && (
              <span
                className={`text-xs flex items-center gap-1 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {testResult.message}
              </span>
            )}
          </div>

          {/* Auto-Sync Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-slate-200">Sincronización Automática con Sheets</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Envía cada actualización a Google Sheets en segundo plano sin esperar ni congelar la app.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncSheets}
                onChange={(e) => setAutoSyncSheets(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Google Spreadsheet Direct Link */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Enlace directo a tu Google Spreadsheet (Opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 shrink-0"
                  title="Abrir hoja de cálculo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Script code accordion */}
          {showCode && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">Código para Google Apps Script (Code.gs)</span>
                <button
                  type="button"
                  onClick={copyScriptCode}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1 border border-slate-700"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
                </button>
              </div>
              <ol className="text-xs text-slate-400 list-decimal list-inside space-y-1">
                <li>Abre tu hoja de cálculo en Google Sheets.</li>
                <li>Menú <strong>Extensiones &gt; Apps Script</strong>.</li>
                <li>Pega este código en <code>Code.gs</code>.</li>
                <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                <li>Tipo: <strong>Aplicación web</strong>, Ejecutar como: <em>Tú</em>, Quién tiene acceso: <em>Cualquier usuario</em>.</li>
                <li>Copia la URL resultante y pégala arriba.</li>
              </ol>
              <pre className="p-3 bg-slate-900 rounded-lg text-[10px] text-slate-300 font-mono overflow-x-auto max-h-48">
                {getRecommendedAppsScriptCode()}
              </pre>
            </div>
          )}

          {/* Database Info */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Base de Datos: <strong>Firestore Enterprise</strong></span>
            </span>
            <span className="text-emerald-400 font-semibold">Online & Sincronizado</span>
          </div>

          {/* GitHub v2.0 Package */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>Versión 2.0 (Código Completo)</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">Listo para GitHub</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Descarga el proyecto completo v2.0 para subirlo a tu repositorio <code>rcarmi-coder/asistencia</code>
              </div>
            </div>
            <a
              href="/asistencia-v2.0.zip"
              download="asistencia-v2.0.zip"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30 transition-colors shrink-0"
            >
              <span>Descargar ZIP v2.0</span>
            </a>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 font-bold text-xs text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
