import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1tr_XAKQn0Koe6G8HEUVd5ipaExJ2_mFW1brI75IMufqPFTzVyt5JRV3y8BBBz54p/exec';

const REAL_PARTICIPANTS = [
  { id: 'p_002', nombre: 'Lucas Monsalve', mejorNivel: 8, orden: 1, activo: true },
  { id: 'p_003', nombre: 'Tomas Nelson', mejorNivel: 8, orden: 2, activo: true },
  { id: 'p_004', nombre: 'Sofía Ramírez', mejorNivel: 6, orden: 3, activo: true },
  { id: 'p_005', nombre: 'Trini Nuñez', mejorNivel: 3, orden: 4, activo: true },
  { id: 'p_006', nombre: 'Camila Antonia Saez Aguayo', mejorNivel: 6, orden: 5, activo: true },
  { id: 'p_007', nombre: 'Maite Pontiggia', mejorNivel: 8, orden: 6, activo: true },
  { id: 'p_008', nombre: 'Matilde Aida Slater Avendaño', mejorNivel: 8, orden: 7, activo: true },
  { id: 'p_009', nombre: 'Mario Araya Pironi', mejorNivel: 8, orden: 8, activo: true },
  { id: 'p_010', nombre: 'Alejandro Faúndez', mejorNivel: 6, orden: 9, activo: true },
  { id: 'p_011', nombre: 'Emilia Francisca Rojas Godoy', mejorNivel: 5, orden: 10, activo: true },
  { id: 'p_012', nombre: 'Tomás Lorenzo Rojas Godoy', mejorNivel: 8, orden: 11, activo: true },
  { id: 'p_013', nombre: 'Alonso Urbina (Paz Avila)', mejorNivel: 3, orden: 12, activo: true },
  { id: 'p_014', nombre: 'Lucas del Canto', mejorNivel: 5, orden: 13, activo: true },
  { id: 'p_015', nombre: 'Mateo González', mejorNivel: 8, orden: 14, activo: true },
  { id: 'p_016', nombre: 'Josefina Kruger', mejorNivel: 3, orden: 15, activo: true },
  { id: 'p_017', nombre: 'Ignacio Montenegro (Magda Prat)', mejorNivel: 6, orden: 16, activo: true },
  { id: 'p_018', nombre: 'Benja Morales (Michelle)', mejorNivel: 2, orden: 17, activo: true },
  { id: 'p_019', nombre: 'Emma Gutierrez (Loreto Muñoz)', mejorNivel: 4, orden: 18, activo: true },
  { id: 'p_020', nombre: 'Jaci Nazer', mejorNivel: 5, orden: 19, activo: true },
  { id: 'p_021', nombre: 'Felipe Mendicoa (Valeria Bobadilla)', mejorNivel: 8, orden: 20, activo: true },
  { id: 'p_022', nombre: 'Emilio Sarrás', mejorNivel: 8, orden: 21, activo: true },
  { id: 'p_023', nombre: 'Manuel Carmi', mejorNivel: 10, orden: 22, activo: true },
  { id: 'p_024', nombre: 'Trini Sobrino', mejorNivel: 8, orden: 23, activo: true },
  { id: 'p_025', nombre: 'Lucas Legrand', mejorNivel: 9, orden: 24, activo: true },
  { id: 'p_026', nombre: 'Agustina Pichuante', mejorNivel: 3, orden: 25, activo: true },
  { id: 'p_027', nombre: 'Alejandro', mejorNivel: 8, orden: 26, activo: true },
  { id: 'p_028', nombre: 'Martin Saxton', mejorNivel: 2, orden: 27, activo: true },
  { id: 'p_029', nombre: 'Vicente Jorquera', mejorNivel: 8, orden: 28, activo: true },
];

async function seed() {
  console.log('Seeding configuracion/main...');
  const now = new Date().toISOString();
  await setDoc(doc(db, 'configuracion', 'main'), {
    appsScriptUrl: GAS_URL,
    spreadsheetUrl: '',
    nombreEscuela: 'Asistencia y Progresión de Niveles',
    autoSyncSheets: true,
    actualizadoEn: now,
  }, { merge: true });

  console.log('Seeding 28 real participants into Firestore...');
  for (const p of REAL_PARTICIPANTS) {
    await setDoc(doc(db, 'participantes', p.id), {
      ...p,
      categoria: 'Deportistas',
      creadoEn: now,
      actualizadoEn: now,
    }, { merge: true });
  }

  // Also seed today's session (2026-09-24) with current records
  const today = '2026-09-24';
  const presentStudentIds = [
    'p_006', // Camila Antonia Saez Aguayo
    'p_007', // Maite Pontiggia
    'p_015', // Mateo González
    'p_017', // Ignacio Montenegro
    'p_024', // Trini Sobrino
    'p_025', // Lucas Legrand
    'p_029', // Vicente Jorquera
  ];

  const asistencias: Record<string, any> = {};
  for (const p of REAL_PARTICIPANTS) {
    const isPresent = presentStudentIds.includes(p.id);
    asistencias[p.id] = {
      presente: isPresent,
      nivel: p.mejorNivel,
      actualizadoEn: now,
      hora: '12:00',
    };
  }

  console.log(`Seeding attendance session for ${today}...`);
  await setDoc(doc(db, 'asistencias', today), {
    id: today,
    fecha: today,
    asistencias,
    totalPresentes: presentStudentIds.length,
    totalAusentes: REAL_PARTICIPANTS.length - presentStudentIds.length,
    registradoPor: 'Google Sheets Sync',
    sincronizadoSheets: true,
    ultimaSincronizacionSheets: '12:00',
    creadoEn: now,
    actualizadoEn: now,
  }, { merge: true });

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error during seed:', err);
  process.exit(1);
});
