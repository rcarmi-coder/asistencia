export interface Participant {
  id: string;
  nombre: string;
  mejorNivel: number;
  categoria?: string;
  activo: boolean;
  orden?: number;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface AttendanceRecord {
  presente: boolean;
  nivel: number;
  actualizadoEn?: string;
  hora?: string;
}

export interface AttendanceSession {
  id: string; // YYYY-MM-DD
  fecha: string;
  asistencias: Record<string, AttendanceRecord>;
  totalPresentes: number;
  totalAusentes?: number;
  registradoPor?: string;
  sincronizadoSheets: boolean;
  ultimaSincronizacionSheets?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface AppSettings {
  appsScriptUrl?: string;
  spreadsheetUrl?: string;
  nombreEscuela?: string;
  autoSyncSheets?: boolean;
  actualizadoEn?: string;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  timestamp?: string;
}

export interface LevelInfo {
  level: number;
  name: string;
  color: string;
  bgLight: string;
  badgeClass: string;
}
