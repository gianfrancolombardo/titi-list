# Titi List

A minimalist, voice-first shopping and to-do list manager powered by AI. Speak your tasks, and the app intelligently organizes them for you.

## Tech Stack

- **Framework:** React con TypeScript
- **Styling:** Tailwind CSS
- **AI:** Google Gemini API (`@google/genai`) or OpenAI API
- **Speech Recognition:** Web Speech API

---

## ¿Se necesita un Backend?

**Respuesta corta:** No, esta aplicación funciona **exclusivamente en el frontend**.

**Explicación importante:**
La aplicación realiza llamadas a la API de Gemini u OpenAI directamente desde el navegador del cliente. Para que esto funcione, la clave de la API (`API_KEY` para Gemini o `OPENAI_API_KEY` para OpenAI) debe estar disponible en el código del frontend.

**⚠️ Advertencia de Seguridad ⚠️**
Exponer tu clave de API en el lado del cliente es **altamente inseguro y no se recomienda para aplicaciones en producción**. Cualquier persona podría inspeccionar el código de tu web, encontrar tu clave y usarla para hacer peticiones a la API, lo que podría generar costos inesperados en tu cuenta.

**Solución recomendada para producción:**
Para una aplicación real, deberías crear un **backend simple** (por ejemplo, usando Node.js con Express, o una función serverless como Firebase Functions, Netlify Functions o Vercel Edge Functions). El flujo sería:
1.  El frontend (esta app) envía el texto a tu backend.
2.  Tu backend, que tiene la clave de API guardada de forma segura como una variable de entorno del servidor, realiza la llamada a la API de IA correspondiente.
3.  Tu backend recibe la respuesta y la reenvía al frontend.

De esta manera, la clave de API nunca sale de tu servidor y permanece segura.

---

## Cómo compilar y desplegar la aplicación

Dado que esta es una aplicación de solo frontend, puedes alojarla en cualquier servicio de hosting de sitios estáticos.

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- Un gestor de paquetes como `npm` o `yarn`.
- Una clave de API de Google Gemini y/o OpenAI.
  - Gemini: Puedes obtenerla en [Google AI Studio](https://aistudio.google.com/app/apikey).
  - OpenAI: Puedes obtenerla en [OpenAI Platform](https://platform.openai.com/api-keys).

### Lógica del proveedor de IA
La aplicación seleccionará el proveedor de IA con la siguiente prioridad:
1.  **Google Gemini**: Si se proporciona una `API_KEY`.
2.  **OpenAI**: Si no hay clave de Gemini, pero se proporciona una `OPENAI_API_KEY`.

### Pasos para la Compilación

Esta aplicación está configurada para funcionar sin un paso de compilación explícito, pero para un despliegue real, necesitarías un `bundler` como Vite o Webpack. Asumiendo un proyecto estándar de React con Vite:

**1. Configurar las variables de entorno:**

Crea un archivo llamado `.env` en la raíz del proyecto y añade tus claves de API. Solo necesitas una de las dos, pero puedes añadir ambas.

```
# Para Google Gemini (tiene prioridad)
VITE_API_KEY=TU_API_KEY_DE_GEMINI_AQUI

# Para OpenAI (se usará si la de Gemini no está)
VITE_OPENAI_API_KEY=TU_API_KEY_DE_OPENAI_AQUI
```
*Nota: Si usas Create React App, el prefijo sería `REACT_APP_` en lugar de `VITE_`.*

**2. Instalar dependencias:**

Abre una terminal en la raíz del proyecto y ejecuta:
```bash
npm install
```

**3. Compilar la aplicación:**

Ejecuta el comando para compilar los archivos para producción. Esto creará una carpeta `dist` (o `build`).
```bash
npm run build
```

### Opciones de Despliegue

#### Opción 1: Desplegar en Netlify

1.  **Sube tu proyecto a un repositorio Git** (GitHub, GitLab, etc.).
2.  **Crea una cuenta en Netlify** y selecciona "Add new site" -> "Import an existing project".
3.  **Conecta tu repositorio Git**.
4.  **Configura los ajustes de compilación:**
    -   **Build command:** `npm run build`
    -   **Publish directory:** `dist` (o `build`)
5.  **Añade tus variables de entorno:**
    -   Ve a "Site configuration" -> "Environment variables".
    -   Añade una variable con la clave `VITE_API_KEY` y el valor de tu clave de Gemini.
    -   Añade otra variable con `VITE_OPENAI_API_KEY` y el valor de tu clave de OpenAI.
6.  **Haz clic en "Deploy site"**.

#### Opción 2: Desplegar en Firebase Hosting

1.  **Instala las herramientas de Firebase CLI:** `npm install -g firebase-tools`
2.  **Inicia sesión:** `firebase login`
3.  **Inicia Firebase en tu proyecto:** `firebase init hosting`
    -   Selecciona un proyecto de Firebase.
    -   Directorio público: `dist` (o `build`).
    -   Configurar como SPA: `Sí`.
4.  **Despliega la aplicación:**
    -   Primero, compila tu proyecto: `npm run build`.
    -   Luego, despliega: `firebase deploy --only hosting`

**Nota sobre la API Key en Firebase Hosting:** Al igual que con Netlify, deberías usar Firebase Functions para proteger tu clave de API en un entorno de producción. Desplegarla directamente en el hosting estático la expondrá. Para configurar variables de entorno para Functions, usarías `firebase functions:config:set my_app.api_key="KEY"`.