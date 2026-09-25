# Security Specification

## 1. Data Invariants
1. `Participant`: Document ID must be a valid alphanumeric string. `nombre` must be a non-empty string between 1 and 100 characters. `mejorNivel` must be a valid number between 1 and 12. `activo` must be a boolean.
2. `AttendanceSession`: Document ID must be a valid date `YYYY-MM-DD` or alphanumeric string <= 128 characters. `fecha` must match `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`. `totalPresentes` must be >= 0. `sincronizadoSheets` must be a boolean.
3. `AppSettings`: Document ID must be alphanumeric (e.g., 'main'). URLs must be valid strings <= 500 characters.

## 2. Dirty Dozen Test Payloads (Designed to test boundaries)
1. Participant with missing `nombre`: `{ mejorNivel: 5, activo: true }` -> REJECT
2. Participant with `mejorNivel` out of bounds (99): `{ nombre: "Juan", mejorNivel: 99, activo: true }` -> REJECT
3. Participant with oversized `nombre` (>100 chars) -> REJECT
4. Participant with invalid `activo` type (string "true" instead of boolean) -> REJECT
5. Participant with injected unauthorized role field: `{ nombre: "Ana", mejorNivel: 1, activo: true, role: "admin" }` -> REJECT
6. AttendanceSession with invalid date format: `{ fecha: "invalid-date", totalPresentes: 10, sincronizadoSheets: false }` -> REJECT
7. AttendanceSession with negative totalPresentes: `{ fecha: "2026-09-24", totalPresentes: -5, sincronizadoSheets: false }` -> REJECT
8. AttendanceSession with non-boolean `sincronizadoSheets` -> REJECT
9. Document ID containing path traversal characters like `../../hack` -> REJECT
10. Unauthenticated write attempt when signed-in verification is active -> REJECT
11. AppSettings payload with malicious string exceeding 500 characters -> REJECT
12. Attempt to write to arbitrary root collection (e.g. `/system_secrets/keys`) -> REJECT (Default deny)
