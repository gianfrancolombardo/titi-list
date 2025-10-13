# Guía de Configuración de Firebase para Titi List

Sigue estos pasos para crear y configurar tu propio backend en la nube para la aplicación usando Firebase.

## Paso 1: Crear un Proyecto en Firebase

1.  Ve a la [consola de Firebase](https://console.firebase.google.com/).
2.  Haz clic en **"Crear un proyecto"**.
3.  Dale un nombre a tu proyecto (por ejemplo, `titi-list-app`) y acepta los términos.
4.  Puedes decidir si habilitar Google Analytics o no (para este proyecto no es necesario).
5.  Espera a que se cree el proyecto.

## Paso 2: Crear una Aplicación Web

Una vez que tu proyecto esté listo, serás redirigido al panel principal.

1.  Busca los íconos para añadir una app a tu proyecto. Haz clic en el ícono de **Web** (`</>`).
    ![Añadir app web](https://firebase.google.com/static/docs/web/images/add-app-to-project.png)
2.  Dale un apodo a tu aplicación (ej. `Titi List Web`) y haz clic en **"Registrar aplicación"**.
3.  **¡IMPORTANTE!** En el siguiente paso ("Añadir SDK de Firebase"), verás un objeto de configuración llamado `firebaseConfig`. **Copia este objeto completo**. Lo necesitarás en el Paso 4.
    ```javascript
    // Ejemplo del objeto que verás
    const firebaseConfig = {
      apiKey: "AIzaSy...YOUR_KEY",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:..."
    };
    ```
4.  Haz clic en **"Ir a la consola"**. No necesitas seguir los otros pasos de la guía de Firebase.

## Paso 3: Configurar la Base de Datos Firestore

Ahora vamos a crear la base de datos donde se guardarán tus listas.

1.  En el menú de la izquierda, ve a **Compilación > Firestore Database**.
2.  Haz clic en **"Crear base de datos"**.
3.  Te preguntará por las reglas de seguridad. Para empezar fácilmente, selecciona **"Comenzar en modo de prueba"**.
    > **⚠️ Advertencia:** El modo de prueba permite que cualquiera lea y escriba en tu base de datos. Es perfecto para el desarrollo, pero **debes asegurar tus reglas** antes de lanzar una aplicación a producción.
4.  Elige una ubicación para tu base de datos (la que esté más cerca de ti, por ejemplo `europe-west`).
5.  Haz clic en **"Habilitar"** y espera a que se aprovisione la base de datos.

¡Listo! Tu base de datos está preparada. La primera vez que añadas un ítem desde la app, verás que se crea automáticamente una colección llamada `items`.

## Paso 4: Configurar las Variables de Entorno

El último paso es conectar tu aplicación con tu nuevo proyecto de Firebase.

1.  En la raíz de tu proyecto de Titi List, busca un archivo llamado `.env`. Si no existe, créalo.
2.  Abre el archivo `.env` y pega las claves del objeto `firebaseConfig` que copiaste en el Paso 2. Debes añadirles el prefijo `VITE_FIREBASE_`.

   Tu archivo `.env` debería verse así, pero con **tus propios valores**:

   ```
   # --- Configuración de Firebase (OBLIGATORIA) ---
   VITE_FIREBASE_API_KEY="AIzaSy...TU_API_KEY"
   VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto-id.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="tu-proyecto-id"
   VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto-id.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
   VITE_FIREBASE_APP_ID="1:1234567890:web:..."

   # --- Configuración de IA (Necesitas al menos una) ---
   VITE_API_KEY=TU_API_KEY_DE_GEMINI_AQUI
   VITE_OPENAI_API_KEY=TU_API_KEY_DE_OPENAI_AQUI
   ```

3.  **Guarda el archivo**. Si la aplicación ya estaba corriendo en tu entorno local, necesitarás detenerla y volver a iniciarla para que cargue las nuevas variables de entorno.

---

### ¡Felicidades!

Tu aplicación ahora está conectada a una base de datos en la nube. Cualquier ítem que añadas se guardará en tu proyecto de Firebase y se sincronizará en tiempo real si abres la app en otro dispositivo o navegador.
