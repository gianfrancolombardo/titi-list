# Titi List

A minimalist, voice-first shopping and to-do list manager powered by AI. Speak your tasks, and the app intelligently organizes them for you.

## Tech Stack

- **Framework:** React con TypeScript
- **Styling:** Tailwind CSS
- **AI:** Google Gemini API (`@google/genai`) or OpenAI API
- **Base de Datos:** Google Firebase Firestore (para persistencia y sincronización en tiempo real)
- **Speech Recognition:** Web Speech API

---

## ¿Se necesita un Backend?

**Respuesta corta:** No, esta aplicación funciona **exclusivamente en el frontend**, conectándose directamente a los servicios de Google (AI y Firestore).

**Explicación importante:**
La aplicación realiza llamadas a las APIs de IA y Firestore directamente desde el navegador del cliente. Para que esto funcione, las claves de las APIs deben estar disponibles en el código del frontend.

**⚠️ Advertencia de Seguridad ⚠️**
Exponer tus claves de API en el lado del cliente es **altamente inseguro y no se recomienda para aplicaciones en producción**.

- **Claves de IA (Gemini/OpenAI):** Cualquier persona podría inspeccionar el código de tu web, encontrar tu clave y usarla, lo que podría generar costos inesperados en tu cuenta.
- **Configuración de Firebase:** La configuración de Firebase en sí misma no es secreta, pero para proteger tu base de datos, debes configurar las **Reglas de Seguridad de Firestore**. Para este proyecto, se utiliza una configuración permisiva para facilitar el desarrollo, pero **en producción, debes restringir el acceso solo a usuarios autenticados**.

**Solución recomendada para producción:**
Para una aplicación real, deberías:
1.  **Añadir Autenticación:** Usa Firebase Authentication para que los usuarios inicien sesión.
2.  **Asegurar las Reglas de Firestore:** Modifica tus reglas para que solo los usuarios autenticados puedan leer y escribir sus propios datos.
3.  **Proteger la Clave de IA:** Crea un **backend simple** (por ejemplo, con Firebase Functions) que actúe como intermediario para las llamadas a la API de IA. De esta manera, la clave de IA nunca se expone en el cliente.

---

## Cómo compilar y desplegar la aplicación

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- Un gestor de paquetes como `npm` o `yarn`.
- **Una cuenta de Firebase:** Necesitarás configurar un proyecto de Firebase. Sigue las instrucciones en [**FIREBASE_SETUP.md**](./FIREBASE_SETUP.md).
- **Una clave de API de IA (opcional, pero recomendado):**
  - Gemini: Puedes obtenerla en [Google AI Studio](https://aistudio.google.com/app/apikey).
  - OpenAI: Puedes obtenerla en [OpenAI Platform](https://platform.openai.com/api-keys).

### Lógica del proveedor de IA
La aplicación seleccionará el proveedor de IA con la siguiente prioridad:
1.  **Google Gemini**: Si se proporciona una `API_KEY`.
2.  **OpenAI**: Si no hay clave de Gemini, pero se proporciona una `OPENAI_API_KEY`.

### Pasos para la Compilación

**1. Configurar las variables de entorno:**

Crea un archivo llamado `.env` en la raíz del proyecto y añade la configuración de Firebase (obtenida de `FIREBASE_SETUP.md`) y tus claves de API.

```
# --- Configuración de Firebase (OBLIGATORIA) ---
VITE_FIREBASE_API_KEY="TU_FIREBASE_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="TU_PROYECTO.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="TU_PROYECTO_ID"
VITE_FIREBASE_STORAGE_BUCKET="TU_PROYECTO.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="TU_SENDER_ID"
VITE_FIREBASE_APP_ID="TU_APP_ID"

# --- Configuración de IA (Necesitas al menos una) ---
# Para Google Gemini (tiene prioridad)
VITE_API_KEY=TU_API_KEY_DE_GEMINI_AQUI

# Para OpenAI (se usará si la de Gemini no está)
VITE_OPENAI_API_KEY=TU_API_KEY_DE_OPENAI_AQUI
```
*Nota: Este proyecto asume un entorno Vite (`VITE_` prefix). Si usas Create React App, el prefijo sería `REACT_APP_`.*

**2. Instalar dependencias:**

Abre una terminal en la raíz del proyecto y ejecuta:
```bash
npm install
```

**3. Compilar la aplicación:**
```bash
npm run build
```

### Opciones de Despliegue (Ej: Netlify)

1.  **Sube tu proyecto a un repositorio Git** (GitHub, GitLab, etc.).
2.  **Crea una cuenta en Netlify** y selecciona "Add new site" -> "Import an existing project".
3.  **Configura los ajustes de compilación:**
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist`
4.  **Añade tus variables de entorno:**
    -   Ve a "Site configuration" -> "Environment variables".
    -   Añade **TODAS** las variables de tu archivo `.env`.
5.  **Haz clic en "Deploy site"**.
