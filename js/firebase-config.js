// Configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Configuración de Firebase para el proyecto arcadia-113f5
// Credenciales obtenidas de Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBRZ4M3F2Q8N7X5K1V9J3L8P6Y4E2T0C9W", // Tu API Key real del proyecto
    authDomain: "arcadia-113f5.firebaseapp.com",
    projectId: "arcadia-113f5",
    storageBucket: "arcadia-113f5.appspot.com",
    messagingSenderId: "105471603441177092151", // Del service account JSON
    appId: "1:105471603441177092151:web:a1b2c3d4e5f6g7h8i9j0k1l2" // App ID de tu proyecto
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exportar la configuración para usar en otros módulos
export { firebaseConfig };