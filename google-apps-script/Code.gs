/**
 * =========================================================================
 * ASISTENCIA DEPORTIVA - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre tu planilla de Google Sheets.
 * 2. En el menú superior, ve a "Extensiones" > "Apps Script".
 * 3. Borra cualquier código existente en el editor y pega todo este archivo.
 * 4. Guarda con Ctrl + S (o el ícono de disquete).
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) > "Nueva implementación".
 * 6. Selecciona tipo: "Aplicación web".
 * 7. Configuración:
 *    - Descripción: "API Asistencia Deportiva"
 *    - Ejecutar como: "Yo" (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquiera" (IMPORTANTE para que la PWA pueda enviar datos)
 * 8. Haz clic en "Implementar". Concede los permisos que solicite Google.
 * 9. Copia la "URL de la aplicación web" generada (termina en /exec) y pégala
 *    en la configuración de la App Móvil.
 */

const SHEET_NAME = "Asistencia";

/**
 * Inicializa o recupera la hoja de asistencia con sus encabezados base.
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Intentar encontrar pestaña específica (ej: "Asistencia/Nivel 2026" o "Asistencia")
  let sheet = ss.getSheetByName("Asistencia/Nivel 2026") || ss.getSheetByName(SHEET_NAME);
  
  // 2. Si no existe con ese nombre exacto, buscar cualquier pestaña que contenga "asistencia"
  if (!sheet) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase().includes("asistencia")) {
        sheet = sheets[i];
        break;
      }
    }
  }
  
  // 3. Si aún no existe, usar la primera pestaña de la planilla o crearla
  if (!sheet) {
    sheet = ss.getSheets()[0] || ss.insertSheet(SHEET_NAME);
  }
  
  // Si la hoja está vacía, inicializar encabezados
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([["Nombre", "Mejor Nivel"]]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 110);
  }
  
  return sheet;
}

/**
 * Maneja peticiones GET: Consulta lista de participantes y asistencias de una fecha.
 * URL: .../exec?date=YYYY-MM-DD
 */
function doGet(e) {
  try {
    const dateParam = (e && e.parameter && e.parameter.date) ? e.parameter.date.trim() : getTodayString();
    
    // 1. REVISAR CACHÉ EN MEMORIA RAM DE GOOGLE APPS SCRIPT (Respuesta ultra rápida en ~150ms)
    const cache = CacheService.getScriptCache();
    const cacheKey = "asistencia_fast_" + dateParam;
    const cached = cache.get(cacheKey);
    if (cached) {
      return ContentService.createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), 2);
    
    if (lastRow < 2) {
      const emptyPayload = JSON.stringify({
        success: true,
        date: dateParam,
        participants: []
      });
      try { cache.put(cacheKey, emptyPayload, 300); } catch(e) {}
      return ContentService.createTextOutput(emptyPayload)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener encabezados de la primera fila
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Buscar la columna correspondiente a la fecha solicitada
    let dateColIndex = -1;
    for (let c = 2; c < headers.length; c++) {
      const headerVal = formatHeaderDate(headers[c]);
      if (headerVal === dateParam) {
        dateColIndex = c;
        break;
      }
    }
    
    // Optimización crítica: Solo leer Columnas A y B (Nombre y Mejor Nivel)
    const baseData = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    
    // Si la fecha existe, leer únicamente ESA columna (1 columna en vez de todo el historial de fechas)
    let dateColData = null;
    if (dateColIndex !== -1) {
      dateColData = sheet.getRange(2, dateColIndex + 1, lastRow - 1, 1).getValues();
    }
    
    const participants = [];
    for (let i = 0; i < baseData.length; i++) {
      const row = baseData[i];
      const name = String(row[0] || "").trim();
      if (!name) continue; // Saltar filas vacías
      
      let bestLevel = parseNumberOrNull(row[1]);
      
      // Obtener el valor para la fecha seleccionada
      let dateValue = null;
      let present = false;
      
      if (dateColData && i < dateColData.length) {
        const val = dateColData[i][0];
        const numVal = parseNumberOrNull(val);
        if (numVal !== null) {
          dateValue = numVal;
          present = true;
        } else if (String(val || "").trim().length > 0) {
          present = true;
          dateValue = bestLevel;
        }
      }
      
      participants.push({
        id: i + 2, // Fila en la planilla
        orderIndex: i, // Orden original de la planilla
        name: name,
        bestLevel: bestLevel,
        currentLevel: dateValue,
        present: present
      });
    }
    
    const responsePayload = JSON.stringify({
      success: true,
      date: dateParam,
      participants: participants
    });
    
    // Guardar en caché por 10 minutos (600 segundos) para que todas las consultas posteriores vuelen
    try {
      cache.put(cacheKey, responsePayload, 600);
    } catch(cErr) {}
    
    return ContentService.createTextOutput(responsePayload)
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Maneja peticiones POST: Guardar asistencia o agregar participante.
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const action = body.action || "save_attendance";
    const sheet = getOrCreateSheet();
    
    if (action === "add_student") {
      return handleAddStudent(sheet, body);
    } else if (action === "save_attendance") {
      return handleSaveAttendance(sheet, body);
    } else {
      throw new Error("Acción no reconocida: " + action);
    }
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Registra un nuevo participante en la planilla.
 */
function handleAddStudent(sheet, body) {
  const name = String(body.name || "").trim();
  if (!name) {
    throw new Error("El nombre no puede estar vacío");
  }
  
  // Verificar si ya existe
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const names = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(n => String(n).trim().toLowerCase());
    if (names.includes(name.toLowerCase())) {
      throw new Error("Ya existe un participante con el nombre: " + name);
    }
  }
  
  // Agregar fila
  sheet.appendRow([name, ""]);
  const newRow = sheet.getLastRow();
  sheet.getRange(newRow, 1).setFontWeight("normal");
  
  // Limpiar caché de memoria para que el nuevo participante aparezca inmediatamente
  invalidateAttendanceCache();
  
  return createJsonResponse({
    success: true,
    message: "Participante agregado exitosamente",
    participant: {
      name: name,
      bestLevel: null
    }
  });
}

/**
 * Guarda las marcas de asistencia y niveles para una fecha específica.
 */
function handleSaveAttendance(sheet, body) {
  const dateStr = (body.date || "").trim();
  if (!dateStr) {
    throw new Error("La fecha es requerida");
  }
  
  const records = body.records || []; // Array de { name, present, level, bestLevel }
  const lastRow = sheet.getLastRow();
  let lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    throw new Error("No hay participantes registrados en la planilla");
  }
  
  // 1. Encontrar o crear la columna consecutiva para la fecha (comenzando en Columna C)
  const targetCol = findOrCreateDateColumn(sheet, dateStr);
  
  // 2. Mapear filas por nombre
  const namesData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const nameToRowMap = {};
  for (let i = 0; i < namesData.length; i++) {
    const rowName = String(namesData[i][0]).trim().toLowerCase();
    if (rowName) {
      nameToRowMap[rowName] = i + 2; // Fila base 1
    }
  }
  
  // 3. Crear mapa de registros entrantes
  const incomingMap = {};
  for (let r = 0; r < records.length; r++) {
    const item = records[r];
    const n = String(item.name || "").trim().toLowerCase();
    if (n) {
      incomingMap[n] = item;
    }
  }
  
  // 4. Preparar valores para la columna de la fecha y verificar nuevos mejores niveles
  const attendanceColValues = [];
  const currentBestLevels = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const updatedBestLevels = [];
  
  for (let i = 0; i < namesData.length; i++) {
    const rowName = String(namesData[i][0]).trim().toLowerCase();
    const currentBest = parseNumberOrNull(currentBestLevels[i][0]);
    
    if (rowName && incomingMap[rowName]) {
      const record = incomingMap[rowName];
      
      if (record.present) {
        // Si se indicó un nivel específico del 1 al 12
        let levelToWrite = parseNumberOrNull(record.level);
        
        // Si no se seleccionó nuevo nivel, mantiene el mejor nivel anterior
        if (levelToWrite === null) {
          levelToWrite = currentBest !== null ? currentBest : 1;
        }
        
        attendanceColValues.push([levelToWrite]);
        
        // Actualizar mejor nivel si el nivel de hoy es mayor
        let newBest = currentBest !== null ? Math.max(currentBest, levelToWrite) : levelToWrite;
        updatedBestLevels.push([newBest]);
      } else {
        // Ausente: dejar celda en blanco
        attendanceColValues.push([""]);
        updatedBestLevels.push([currentBest !== null ? currentBest : ""]);
      }
    } else {
      // No vino en el payload: mantener valor actual de esa celda
      const existingVal = sheet.getRange(i + 2, targetCol).getValue();
      attendanceColValues.push([existingVal]);
      updatedBestLevels.push([currentBest !== null ? currentBest : ""]);
    }
  }
  
  // 5. Escribir datos en bloque (mucho más rápido que celda por celda)
  sheet.getRange(2, targetCol, attendanceColValues.length, 1).setValues(attendanceColValues);
  sheet.getRange(2, 2, updatedBestLevels.length, 1).setValues(updatedBestLevels);
  
  // Limpiar caché de memoria para que las próximas lecturas muestren los nuevos datos al instante
  invalidateAttendanceCache(dateStr);
  
  return createJsonResponse({
    success: true,
    message: "Asistencia guardada correctamente en Google Sheets",
    date: dateStr,
    savedCount: records.filter(r => r.present).length
  });
}

/**
 * Encuentra o crea la columna para una fecha, asegurando que comience en la columna C (Col 3)
 * y que llene de manera consecutiva (C, D, E, etc.).
 * Si detecta que una fecha previa quedó huérfana en una columna lejana (ej: W) con las anteriores vacías,
 * la reubica automáticamente en la columna C.
 */
function findOrCreateDateColumn(sheet, dateStr) {
  const maxCols = Math.max(sheet.getLastColumn(), sheet.getMaxColumns(), 3);
  const row1Values = sheet.getRange(1, 1, 1, maxCols).getValues()[0];
  
  // 1. Buscar si esta fecha ya existe en la fila 1
  let existingCol = -1;
  for (let c = 2; c < row1Values.length; c++) {
    if (formatHeaderDate(row1Values[c]) === dateStr) {
      existingCol = c + 1; // Base 1
      break;
    }
  }
  
  // Si la fecha ya existe, pero quedó en una columna lejana (ej: W) con las anteriores vacías (C..V vacías):
  if (existingCol !== -1) {
    let hasIntermediates = false;
    for (let c = 2; c < existingCol - 1; c++) {
      if (String(row1Values[c] || "").trim() !== "") {
        hasIntermediates = true;
        break;
      }
    }
    if (!hasIntermediates && existingCol > 3) {
      // Reubicar la columna a la columna C (3) y limpiar la columna lejana
      const lastRow = Math.max(sheet.getLastRow(), 2);
      const colData = sheet.getRange(1, existingCol, lastRow, 1).getValues();
      sheet.getRange(1, 3, lastRow, 1).setValues(colData);
      sheet.getRange(1, existingCol, lastRow, 1).clearContent();
      sheet.setColumnWidth(3, 110);
      return 3;
    }
    return existingCol;
  }
  
  // 2. Si no existe, buscar la primera columna vacía consecutiva a partir de la C (columna 3)
  let targetCol = 3;
  for (let c = 2; c < row1Values.length; c++) {
    const val = String(row1Values[c] || "").trim();
    if (val === "") {
      targetCol = c + 1;
      break;
    }
    targetCol = c + 2;
  }
  
  // Asegurar que la columna exista en la planilla
  if (targetCol > sheet.getMaxColumns()) {
    sheet.insertColumnAfter(sheet.getMaxColumns());
  }
  
  // Escribir encabezado de la fecha con formato
  const headerCell = sheet.getRange(1, targetCol);
  headerCell.setValue(dateStr);
  headerCell.setFontWeight("bold").setBackground("#059669").setFontColor("#ffffff");
  sheet.setColumnWidth(targetCol, 110);
  
  return targetCol;
}

/**
 * Auxiliar: Convierte el encabezado de fecha a formato estándar YYYY-MM-DD.
 */
function formatHeaderDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  let str = String(val).trim();
  
  // Normalizar separadores (puntos, barras y guiones) a guiones: ej. 2026.09.10 -> 2026-09-10
  str = str.replace(/[.\/]/g, '-');
  
  // Si viene en formato DD-MM-YYYY (ej: 10-09-2026)
  const dmy = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const y = dmy[3];
    const m = dmy[2].padStart(2, '0');
    const d = dmy[1].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // Si viene en formato YYYY-MM-DD (ej: 2026-09-10 o 2026.09.10)
  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return str;
}

/**
 * Auxiliar: Devuelve la fecha de hoy en formato YYYY-MM-DD.
 */
function getTodayString() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/**
 * Auxiliar: Convierte a número entero válido o null.
 */
function parseNumberOrNull(val) {
  if (val === null || val === undefined || val === "") return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

/**
 * Crea una respuesta JSON con cabeceras para Apps Script Web App.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Invalida el caché en memoria de Google Apps Script cuando ocurren cambios.
 */
function invalidateAttendanceCache(dateStr) {
  try {
    const cache = CacheService.getScriptCache();
    if (dateStr) {
      cache.remove("asistencia_fast_" + dateStr);
    }
    cache.remove("asistencia_fast_" + getTodayString());
  } catch (e) {}
}

/**
 * Función Keep-Alive para evitar que Google duerma el contenedor de Apps Script.
 * Si configuras un activador por tiempo (Trigger) cada 10 o 15 minutos que ejecute esta función,
 * Google mantendrá el script caliente en memoria RAM y la respuesta será inmediata siempre.
 */
function keepAlive() {
  console.log("Keep-alive ejecutado para mantener Apps Script activo: " + new Date().toISOString());
}
