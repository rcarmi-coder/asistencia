# 📱 Control de Asistencia Deportiva (PWA Móvil)

Aplicación web móvil progresiva (**PWA**) diseñada para entrenadores y profesores de cursos deportivos. Permite registrar asistencia con un toque, calificar el nivel alcanzado en la sesión (del 1 al 12) y mantener automáticamente el mejor nivel histórico de cada participante, todo sincronizado en tiempo real con una planilla de **Google Sheets**.

---

## ✨ Características Principales

1. **Mobile-First y Táctil**:
   - **Izquierda**: Casilla de verificación táctil grande para marcar presente (verde con check) o dejar en blanco (ausente).
   - **Centro**: Nombre del participante y badge con su mejor nivel histórico.
   - **Derecha**: Menú desplegable con números del **1 al 12** para marcar el nivel de la sesión.
2. **Lógica Inteligente de Niveles**:
   - Si asiste y marcas un nivel (ej: 8), queda registrado el 8 en la columna de la fecha.
   - Si asiste pero **no marcas nivel**, la app asigna automáticamente su **mejor nivel previo** registrado en la planilla.
   - Si no asiste (ausente), la celda de la fecha queda en blanco.
3. **Agregar Participantes en Terreno**:
   - Botón *"Nuevo"* para inscribir participantes al instante. Se insertan automáticamente en la lista y en tu Google Sheet.
4. **Navegación por Fechas**:
   - Puedes ver o pasar lista de hoy, ayer o cualquier fecha del calendario.
5. **Sin Tiendas ni APK (PWA)**:
   - Funciona en cualquier smartphone (iPhone y Android).
   - Se instala directamente en la pantalla de inicio como una app nativa a pantalla completa.
   - Funciona con o sin conexión a internet (offline cache).

---

## 🚀 Paso 1: Cómo probar la App Localmente

Para verla y probarla en tu computadora o en tu red local ahora mismo:

1. Abre PowerShell o una terminal en esta carpeta (`c:\Users\rcarm\Documents\AppsAG\Asistencia`).
2. Inicia un servidor web local con Python:
   ```bash
   python -m http.server 8080
   ```
3. Abre en tu navegador (Chrome, Edge o Safari):
   ```
   http://localhost:8080
   ```
   *(Para probar la vista de teléfono en la computadora: presiona F12 y activa el modo móvil con el ícono de teléfono/tablet).*

---

## 🌐 Paso 2: Publicar y Distribuir en GitHub Pages (Gratis)

Al publicar en GitHub Pages, obtendrás un enlace seguro con HTTPS (obligatorio para PWAs) que podrás compartir con cualquier persona o abrir en tu teléfono.

### Pasos:
1. Ve a [github.com](https://github.com) e inicia sesión (o crea una cuenta gratuita).
2. Haz clic en **"New Repository"** (Nuevo repositorio).
   - Nombre sugerido: `asistencia-deportiva` (o el nombre que prefieras).
   - Déjalo como **Public** (Público).
   - Haz clic en **"Create repository"**.
3. Sube los archivos de esta carpeta:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - Carpeta `icons/` (con `icon-192.png` e `icon-512.png`)
   *(Puedes arrastrar y soltar los archivos directamente en GitHub en la opción "uploading an existing file")*.
4. Activa GitHub Pages:
   - En tu repositorio de GitHub, ve a la pestaña **Settings** (Configuración).
   - En el menú lateral izquierdo, haz clic en **Pages**.
   - En la sección **"Build and deployment" > Branch**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
   - Haz clic en **Save**.
5. ¡Listo! En unos 60 segundos tendrás tu enlace público tipo:
   `https://tu-usuario.github.io/asistencia-deportiva/`

---

## 📊 Paso 3: Conectar tu Google Sheets (En 3 minutos)

La aplicación viene con datos de prueba (Modo Demo) para que puedas probarla inmediatamente. Para conectarla a tu planilla real de Google:

1. Abre tu cuenta de Google y crea una nueva planilla en [Google Sheets](https://sheets.new) (o abre la existente).
2. En el menú superior de Google Sheets, ve a:
   **Extensiones** > **Apps Script**.
3. En el editor que se abrirá:
   - Borra cualquier código existente (`myFunction`).
   - Copia todo el contenido del archivo [`google-apps-script/Code.gs`](google-apps-script/Code.gs) y pégalo allí.
   - Guarda los cambios con el ícono de disquete o `Ctrl + S`.
4. Arriba a la derecha, haz clic en el botón azul **"Implementar"** (*Deploy*) > **"Nueva implementación"**.
5. Haz clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo" y elige **"Aplicación web"**.
6. Configura lo siguiente:
   - **Descripción**: `API Asistencia`
   - **Ejecutar como**: `Yo (tu correo de Google)`
   - **Quién tiene acceso**: `Cualquiera` *(IMPORTANTE: permite que la app guarde datos desde el teléfono)*.
7. Haz clic en **"Implementar"**.
   - Google te pedirá autorizar permisos la primera vez (haz clic en *Revisar permisos* > tu cuenta > *Avanzado / Ir a proyecto no seguro* > *Permitir*).
8. Copia la **URL de la aplicación web** generada (termina en `/exec`).
9. En la App Móvil:
   - Toca el ícono de engranaje ⚙️ (arriba a la derecha).
   - Pega tu URL de Apps Script.
   - Toca **"Probar Conexión"** y luego **"Guardar y Sincronizar"**.

¡Desde ese momento, la app leerá los participantes y registrará cada fecha directamente en tu Google Sheet!

---

## 📲 Paso 4: Cómo compartir la App lista para usar (Sin que nadie configure nada)

La app cuenta con **dos métodos** para que cualquier profesor la abra y opere de inmediato conectada a tu Google Sheet:

### Método A: Botón "Compartir" en la App (El más fácil)
1. Abre la app en tu teléfono (donde ya tienes conectada tu planilla).
2. Toca el nuevo botón de **Compartir** (ícono de nodos arriba a la derecha).
3. Selecciona **"Enviar por WhatsApp"** o **"Copiar enlace listo"**.
4. Ese enlace incluye automáticamente un parámetro seguro que **auto-configura la planilla en el teléfono de quien lo reciba**. Quien lo abra entrará directamente conectado, sin tener que entrar a ajustes ni copiar links de Apps Script.

### Método B: Dejar la URL fija en el código en GitHub
Si prefieres que incluso el enlace directo de GitHub Pages (`https://tu-usuario.github.io/asistencia/`) ya venga conectado para todo el mundo sin parámetros:
1. Abre el archivo `app.js`.
2. En la línea 22, coloca tu URL de Google Apps Script dentro de las comillas:
   ```javascript
   const DEFAULT_GAS_URL = "https://script.google.com/macros/s/.../exec";
   ```
3. Sube ese cambio a tu repositorio de GitHub. ¡A partir de ese momento, la app estará 100% preconfigurada para siempre!

---

## 📲 Paso 5: Cómo instalar en la Pantalla de Inicio del Teléfono

La app muestra automáticamente un botón flotante **"📲 Instalar App en el Teléfono"** cuando se abre en un navegador móvil.

### En iPhone (Safari):
1. Abre el enlace en **Safari**.
2. Toca el botón **"Instalar"** en la app (o el botón de Compartir `⎋` en la barra inferior de Safari).
3. Selecciona **"Agregar a la pantalla de inicio"** `➕`.
4. Toca **"Agregar"**. La app se colocará en tu pantalla con su propio ícono y se abrirá a pantalla completa como una app nativa de App Store.

### En Android (Chrome):
1. Abre el enlace en **Google Chrome**.
2. Toca el botón **"Instalar"** que aparece en la app (o en el menú de 3 puntos selecciona *"Instalar aplicación"*).
3. Se agregará directamente a tu pantalla de inicio y a tu cajón de aplicaciones.

