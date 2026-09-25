import { AttendanceSession, Participant } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: unknown;
}

export interface SheetImportResult {
  success: boolean;
  message: string;
  participants: Participant[];
  rawAttendance?: Record<string, { present: boolean; level: number }>;
}

export async function importParticipantsFromSheets(appsScriptUrl: string, dateStr?: string): Promise<SheetImportResult> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return {
      success: false,
      message: 'URL de Google Apps Script no configurada',
      participants: [],
    };
  }

  const cleanUrl = appsScriptUrl.trim();
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const targetUrl = cleanUrl.includes('?') ? `${cleanUrl}&date=${date}` : `${cleanUrl}?date=${date}`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success && !Array.isArray(data.participants)) {
      throw new Error(data.error || 'Respuesta inválida de Google Apps Script');
    }

    const rawList: any[] = data.participants || [];
    const participants: Participant[] = [];
    const rawAttendance: Record<string, { present: boolean; level: number }> = {};

    rawList.forEach((item, index) => {
      const name = String(item.name || item.nombre || '').trim();
      if (!name) return;

      const pId = item.id ? `p_${String(item.id).padStart(3, '0')}` : `p_${index + 1}`;
      const bestLevel = Number(item.bestLevel || item.mejorNivel) || 1;

      participants.push({
        id: pId,
        nombre: name,
        mejorNivel: Math.max(1, Math.min(12, bestLevel)),
        categoria: item.categoria || 'Deportistas',
        activo: true,
        orden: typeof item.orderIndex === 'number' ? item.orderIndex + 1 : index + 1,
      });

      if (typeof item.present === 'boolean' || typeof item.presente === 'boolean') {
        const isPresent = Boolean(item.present ?? item.presente);
        const lvl = Number(item.currentLevel ?? item.level ?? bestLevel) || bestLevel;
        rawAttendance[pId] = {
          present: isPresent,
          level: lvl,
        };
      }
    });

    return {
      success: true,
      message: `Se importaron ${participants.length} participantes desde la planilla`,
      participants,
      rawAttendance,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error al leer planilla: ${error.message || String(error)}`,
      participants: [],
    };
  }
}

export async function addStudentToSheets(
  appsScriptUrl: string,
  name: string,
  bestLevel: number = 1
): Promise<{ success: boolean; message: string }> {
  if (!appsScriptUrl || !appsScriptUrl.trim() || !name || !name.trim()) {
    return { success: false, message: 'URL o nombre faltante' };
  }
  const cleanUrl = appsScriptUrl.trim();
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'add_student',
        name: name.trim(),
        nombre: name.trim(),
        bestLevel,
        mejorNivel: bestLevel,
      }),
    });
    return { success: true, message: `Alumno ${name} agregado en Google Sheets` };
  } catch (err: any) {
    return { success: false, message: err.message || String(err) };
  }
}

export async function sendAttendanceToSheets(
  appsScriptUrl: string,
  session: AttendanceSession,
  participants: Participant[]
): Promise<SyncResult> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return {
      success: false,
      message: 'Falta la URL de Google Apps Script. Configúrala en Ajustes.',
      timestamp,
    };
  }

  const cleanUrl = appsScriptUrl.trim();

  // 1. Pre-verificación: Asegurar que todos los alumnos de la app existan en la planilla Google Sheets
  try {
    const sheetData = await importParticipantsFromSheets(cleanUrl, session.fecha);
    if (sheetData.success && Array.isArray(sheetData.participants)) {
      const existingNames = new Set(
        sheetData.participants.map((sp) => sp.nombre.trim().toLowerCase())
      );
      const missingStudents = participants.filter(
        (p) => !existingNames.has(p.nombre.trim().toLowerCase())
      );
      for (const missing of missingStudents) {
        await addStudentToSheets(cleanUrl, missing.nombre, missing.mejorNivel || 1);
      }
    }
  } catch (preCheckErr) {
    console.warn('Pre-check for missing students in sheets:', preCheckErr);
  }

  // Dual format: Compatible with both the original Code.gs in repo AND modern formats
  const records = participants.map((p) => {
    const record = session.asistencias?.[p.id];
    const presente = record ? Boolean(record.presente) : false;
    const nivel = record?.nivel || p.mejorNivel || 1;
    return {
      id: p.id,
      name: p.nombre,
      nombre: p.nombre,
      present: presente,
      presente,
      level: nivel,
      nivel,
      bestLevel: p.mejorNivel || nivel,
      mejorNivel: p.mejorNivel || nivel,
      categoria: p.categoria || '',
    };
  });

  const payload = {
    action: 'save_attendance', // Primary action name expected by user's Code.gs
    date: session.fecha,       // Expected by user's Code.gs
    fecha: session.fecha,
    records,                   // Array of { name, present, level, bestLevel } for user's Code.gs
    asistencias: records,
    totalPresentes: session.totalPresentes,
    fechaEnvio: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    // We send as JSON string. Google Apps Script Web App can read via e.postData.contents
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Prevents CORS preflight redirect issues with Google Apps Script
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // If Google Apps Script returns JSON or redirects
    let dataText = '';
    try {
      dataText = await response.text();
    } catch {
      // ignore
    }

    let parsedData = null;
    try {
      parsedData = JSON.parse(dataText);
    } catch {
      // raw text
    }

    if (response.ok || (parsedData && (parsedData.status === 'success' || parsedData.success === true)) || response.type === 'opaque') {
      return {
        success: true,
        message: parsedData?.message || `Sincronizado con Google Sheets (${session.totalPresentes} presentes)`,
        timestamp,
        details: parsedData,
      };
    } else {
      return {
        success: false,
        message: parsedData?.message || parsedData?.error || `Error del servidor de Google Apps Script (HTTP ${response.status})`,
        timestamp,
      };
    }
  } catch (error: unknown) {
    // If it's a TypeError from CORS, Google Apps Script often successfully writes but blocks response header.
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      return {
        success: true,
        message: 'Datos enviados a Google Apps Script (Verifica tu planilla)',
        timestamp,
        details: 'CORS opaque fetch',
      };
    }

    return {
      success: false,
      message: errorMsg.includes('aborted') ? 'Tiempo de espera agotado al conectar con Google Sheets' : `Error: ${errorMsg}`,
      timestamp,
    };
  }
}

// Generates the sample Google Apps Script code for the user to paste into their spreadsheet
export function getRecommendedAppsScriptCode(): string {
  return `/**
 * Código para Google Apps Script (Vinculado a tu Google Spreadsheet)
 * Pégalo en: Extensiones > Apps Script > Editor
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Servidor ocupado. Intenta de nuevo.'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'guardarAsistencia') {
      var sheet = ss.getSheetByName('Asistencias') || ss.insertSheet('Asistencias');
      var fecha = data.fecha || new Date().toISOString().slice(0, 10);
      var asistencias = data.asistencias || [];

      // Escribir fila de cabecera si la hoja está vacía
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Fecha', 'ID Alumno', 'Nombre', 'Presente', 'Nivel Registrado', 'Mejor Nivel', 'Categoría', 'Hora Registro']);
        sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      }

      var timestamp = new Date();
      var rowsToAdd = [];

      for (var i = 0; i < asistencias.length; i++) {
        var a = asistencias[i];
        rowsToAdd.push([
          fecha,
          a.id || '',
          a.nombre || '',
          a.presente ? 'PRESENTE' : 'AUSENTE',
          a.nivel || 1,
          a.mejorNivel || 1,
          a.categoria || '',
          timestamp
        ]);
      }

      if (rowsToAdd.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, 8).setValues(rowsToAdd);
      }

      // Actualizar también hoja resumen de participantes si existe
      var sheetAlumnos = ss.getSheetByName('Alumnos');
      if (sheetAlumnos) {
        var values = sheetAlumnos.getDataRange().getValues();
        // Actualiza mejor nivel histórico en la planilla de alumnos
        for (var k = 0; k < asistencias.length; k++) {
          var item = asistencias[k];
          if (item.presente && item.nivel) {
            for (var r = 1; r < values.length; r++) {
              if (String(values[r][0]) === String(item.id) || String(values[r][1]).toLowerCase() === String(item.nombre).toLowerCase()) {
                var currentBest = Number(values[r][2]) || 0;
                if (item.nivel > currentBest) {
                  sheetAlumnos.getRange(r + 1, 3).setValue(item.nivel);
                }
              }
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Asistencia registrada correctamente en la planilla',
        totalProcesados: asistencias.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Acción no reconocida'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    servicio: 'Sincronizador Asistencia Google Sheets',
    fecha: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}
