import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { importParticipantsFromSheets } from '../src/lib/sheetsSync';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1tr_XAKQn0Koe6G8HEUVd5ipaExJ2_mFW1brI75IMufqPFTzVyt5JRV3y8BBBz54p/exec';

// Dates to import
const TARGET_DATES = [
  '2026-09-01',
  '2026-09-03',
  '2026-09-08', // Martes 8!
  '2026-09-10',
  '2026-09-15',
  '2026-09-17',
  '2026-09-22',
  '2026-09-24', // Hoy
];

async function run() {
  console.log('Starting full historical import to Firebase...');

  for (const dateStr of TARGET_DATES) {
    console.log(`Fetching from Google Sheets for date: ${dateStr}...`);
    try {
      const res = await importParticipantsFromSheets(GAS_URL, dateStr);
      if (res.success && res.participants.length > 0) {
        // Save participants
        const now = new Date().toISOString();
        for (const p of res.participants) {
          await setDoc(doc(db, 'participantes', p.id), {
            ...p,
            categoria: 'Deportistas',
            actualizadoEn: now,
          }, { merge: true });
        }

        // Save session
        const raw = res.rawAttendance || {};
        const asistencias: Record<string, any> = {};
        let presentCount = 0;

        res.participants.forEach((p) => {
          const record = raw[p.id];
          const isPresent = Boolean(record?.present);
          if (isPresent) presentCount++;
          const lvl = record?.level || p.mejorNivel || 1;

          asistencias[p.id] = {
            presente: isPresent,
            nivel: lvl,
            actualizadoEn: now,
            hora: '12:00',
          };
        });

        await setDoc(doc(db, 'asistencias', dateStr), {
          id: dateStr,
          fecha: dateStr,
          asistencias,
          totalPresentes: presentCount,
          totalAusentes: res.participants.length - presentCount,
          registradoPor: 'Sincronización Planilla',
          sincronizadoSheets: true,
          ultimaSincronizacionSheets: now,
          creadoEn: now,
          actualizadoEn: now,
        }, { merge: true });

        console.log(`Saved ${dateStr}: ${presentCount} presents in Firestore.`);
      }
    } catch (e) {
      console.error(`Error importing ${dateStr}:`, e);
    }
  }

  console.log('Full historical import finished successfully!');
  process.exit(0);
}

run();
