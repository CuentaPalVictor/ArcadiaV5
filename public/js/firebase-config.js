// Configuración de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Configuración de Firebase para el proyecto arcadia-113f5
// Credenciales reales obtenidas de Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCiYbeU0C1DXzmH8-96M32RBtyYQrJR8L4",
    authDomain: "arcadia-113f5.firebaseapp.com",
    projectId: "arcadia-113f5",
    storageBucket: "arcadia-113f5.firebasestorage.app",
    messagingSenderId: "361765024312",
    appId: "1:361765024312:web:b845ebcd661e7a73ab2ccd",
    measurementId: "G-V86KZVL7MZ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exportar la configuración para usar en otros módulos
export { firebaseConfig };