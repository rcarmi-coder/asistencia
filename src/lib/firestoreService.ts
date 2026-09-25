import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Participant, AttendanceSession, AppSettings } from '../types';

const PARTICIPANTS_COLLECTION = 'participantes';
const SESSIONS_COLLECTION = 'asistencias';
const CONFIG_COLLECTION = 'configuracion';
const DEFAULT_CONFIG_ID = 'main';

// ================= PARTICIPANTES =================

export function subscribeParticipants(
  onUpdate: (participants: Participant[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, PARTICIPANTS_COLLECTION), orderBy('orden', 'asc'));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Participant[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Participant, 'id'>) });
      });
      // Fallback sort by name if orden is equal
      list.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || a.nombre.localeCompare(b.nombre));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PARTICIPANTS_COLLECTION);
      if (onError) onError(error as Error);
    }
  );
}

export async function saveParticipant(participant: Participant): Promise<void> {
  const docId = participant.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanData: Record<string, unknown> = {
    id: docId,
    nombre: participant.nombre.trim(),
    mejorNivel: Number(participant.mejorNivel) || 1,
    activo: Boolean(participant.activo),
    orden: typeof participant.orden === 'number' ? participant.orden : Date.now(),
    actualizadoEn: new Date().toISOString(),
  };

  if (participant.categoria) {
    cleanData.categoria = participant.categoria.trim();
  }
  if (participant.creadoEn) {
    cleanData.creadoEn = participant.creadoEn;
  } else {
    cleanData.creadoEn = new Date().toISOString();
  }

  try {
    await setDoc(doc(db, PARTICIPANTS_COLLECTION, docId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PARTICIPANTS_COLLECTION}/${docId}`);
  }
}

export async function deleteParticipant(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PARTICIPANTS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PARTICIPANTS_COLLECTION}/${id}`);
  }
}

// Real participants from the user's Google Sheet
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbx1tr_XAKQn0Koe6G8HEUVd5ipaExJ2_mFW1brI75IMufqPFTzVyt5JRV3y8BBBz54p/exec';

export const INITIAL_DEMO_PARTICIPANTS: Omit<Participant, 'id'>[] = [
  { nombre: 'Lucas Monsalve', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 1 },
  { nombre: 'Tomas Nelson', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 2 },
  { nombre: 'Sofía Ramírez', mejorNivel: 6, categoria: 'Deportistas', activo: true, orden: 3 },
  { nombre: 'Trini Nuñez', mejorNivel: 3, categoria: 'Deportistas', activo: true, orden: 4 },
  { nombre: 'Camila Antonia Saez Aguayo', mejorNivel: 6, categoria: 'Deportistas', activo: true, orden: 5 },
  { nombre: 'Maite Pontiggia', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 6 },
  { nombre: 'Matilde Aida Slater Avendaño', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 7 },
  { nombre: 'Mario Araya Pironi', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 8 },
  { nombre: 'Alejandro Faúndez', mejorNivel: 6, categoria: 'Deportistas', activo: true, orden: 9 },
  { nombre: 'Emilia Francisca Rojas Godoy', mejorNivel: 5, categoria: 'Deportistas', activo: true, orden: 10 },
  { nombre: 'Tomás Lorenzo Rojas Godoy', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 11 },
  { nombre: 'Alonso Urbina (Paz Avila)', mejorNivel: 3, categoria: 'Deportistas', activo: true, orden: 12 },
  { nombre: 'Lucas del Canto', mejorNivel: 5, categoria: 'Deportistas', activo: true, orden: 13 },
  { nombre: 'Mateo González', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 14 },
  { nombre: 'Josefina Kruger', mejorNivel: 3, categoria: 'Deportistas', activo: true, orden: 15 },
  { nombre: 'Ignacio Montenegro (Magda Prat)', mejorNivel: 6, categoria: 'Deportistas', activo: true, orden: 16 },
  { nombre: 'Benja Morales (Michelle)', mejorNivel: 2, categoria: 'Deportistas', activo: true, orden: 17 },
  { nombre: 'Emma Gutierrez (Loreto Muñoz)', mejorNivel: 4, categoria: 'Deportistas', activo: true, orden: 18 },
  { nombre: 'Jaci Nazer', mejorNivel: 5, categoria: 'Deportistas', activo: true, orden: 19 },
  { nombre: 'Felipe Mendicoa (Valeria Bobadilla)', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 20 },
  { nombre: 'Emilio Sarrás', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 21 },
  { nombre: 'Manuel Carmi', mejorNivel: 10, categoria: 'Deportistas', activo: true, orden: 22 },
  { nombre: 'Trini Sobrino', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 23 },
  { nombre: 'Lucas Legrand', mejorNivel: 9, categoria: 'Deportistas', activo: true, orden: 24 },
  { nombre: 'Agustina Pichuante', mejorNivel: 3, categoria: 'Deportistas', activo: true, orden: 25 },
  { nombre: 'Alejandro', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 26 },
  { nombre: 'Martin Saxton', mejorNivel: 2, categoria: 'Deportistas', activo: true, orden: 27 },
  { nombre: 'Vicente Jorquera', mejorNivel: 8, categoria: 'Deportistas', activo: true, orden: 28 },
];

export async function seedInitialParticipantsIfEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(query(collection(db, PARTICIPANTS_COLLECTION), limit(1)));
    if (!snap.empty) {
      return false; // Already has data
    }

    const now = new Date().toISOString();
    for (let i = 0; i < INITIAL_DEMO_PARTICIPANTS.length; i++) {
      const p = INITIAL_DEMO_PARTICIPANTS[i];
      const id = `p_${(i + 2).toString().padStart(3, '0')}`;
      await setDoc(doc(db, PARTICIPANTS_COLLECTION, id), {
        ...p,
        id,
        creadoEn: now,
        actualizadoEn: now,
      });
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PARTICIPANTS_COLLECTION);
    return false;
  }
}

// ================= ASISTENCIAS =================

export function subscribeAttendanceSession(
  fecha: string,
  onUpdate: (session: AttendanceSession | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, SESSIONS_COLLECTION, fecha);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...(snapshot.data() as Omit<AttendanceSession, 'id'>) });
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${SESSIONS_COLLECTION}/${fecha}`);
      if (onError) onError(error as Error);
    }
  );
}

export async function saveAttendanceSession(session: AttendanceSession): Promise<void> {
  const docId = session.fecha;
  const cleanData: Record<string, unknown> = {
    id: docId,
    fecha: session.fecha,
    asistencias: session.asistencias || {},
    totalPresentes: Number(session.totalPresentes) || 0,
    totalAusentes: Number(session.totalAusentes) || 0,
    sincronizadoSheets: Boolean(session.sincronizadoSheets),
    actualizadoEn: new Date().toISOString(),
  };

  if (session.registradoPor) cleanData.registradoPor = session.registradoPor;
  if (session.ultimaSincronizacionSheets) cleanData.ultimaSincronizacionSheets = session.ultimaSincronizacionSheets;
  if (session.creadoEn) cleanData.creadoEn = session.creadoEn;
  else cleanData.creadoEn = new Date().toISOString();

  try {
    await setDoc(doc(db, SESSIONS_COLLECTION, docId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SESSIONS_COLLECTION}/${docId}`);
  }
}

export async function getRecentAttendanceSessions(limitCount = 100): Promise<AttendanceSession[]> {
  try {
    const q = query(collection(db, SESSIONS_COLLECTION), orderBy('fecha', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    const sessions: AttendanceSession[] = [];
    snap.forEach((d) => {
      sessions.push({ id: d.id, ...(d.data() as Omit<AttendanceSession, 'id'>) });
    });
    return sessions;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SESSIONS_COLLECTION);
    return [];
  }
}

// ================= CONFIGURACIÓN =================

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, DEFAULT_CONFIG_ID));
    if (snap.exists()) {
      const data = snap.data() as AppSettings;
      return {
        appsScriptUrl: data.appsScriptUrl || DEFAULT_GAS_URL,
        spreadsheetUrl: data.spreadsheetUrl || '',
        nombreEscuela: data.nombreEscuela || 'Registro de Asistencia y Niveles',
        autoSyncSheets: data.autoSyncSheets ?? true,
      };
    }
    return {
      appsScriptUrl: DEFAULT_GAS_URL,
      spreadsheetUrl: '',
      nombreEscuela: 'Registro de Asistencia y Niveles',
      autoSyncSheets: true,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/${DEFAULT_CONFIG_ID}`);
    return {
      appsScriptUrl: DEFAULT_GAS_URL,
      nombreEscuela: 'Registro de Asistencia y Niveles',
      autoSyncSheets: true,
    };
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const cleanData: Record<string, unknown> = {
    appsScriptUrl: settings.appsScriptUrl?.trim() || '',
    spreadsheetUrl: settings.spreadsheetUrl?.trim() || '',
    nombreEscuela: settings.nombreEscuela?.trim() || 'Escuela Deportiva',
    autoSyncSheets: Boolean(settings.autoSyncSheets),
    actualizadoEn: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, CONFIG_COLLECTION, DEFAULT_CONFIG_ID), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CONFIG_COLLECTION}/${DEFAULT_CONFIG_ID}`);
  }
}
