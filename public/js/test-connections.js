import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInAnonymously
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Configuración de Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dqupf0krm',
    apiKey: '374253863849214',
    apiSecret: 'D1gdbQoHbLsLcVp5c3uKBSgz7gg'
};

let cloudinaryWidget = null;

// Inicializar tests al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    initializeTests();
});

async function initializeTests() {
    console.log('🔧 Iniciando tests de conexión...');
    
    // Test Firebase
    await testFirebaseConnection();
    
    // Test Cloudinary
    await testCloudinaryConnection();
    
    // Test Arcane Collection
    await testArcaneAccess();
    
    // Configurar Cloudinary Widget
    setupCloudinaryWidget();
}

// Test de conexión con Firebase
async function testFirebaseConnection() {
    const statusElement = document.getElementById('firebaseStatus');
    const detailsElement = document.getElementById('firebaseDetails');
    
    try {
        statusElement.textContent = 'Conectando con Firebase...';
        
        // Verificar si Firebase está inicializado
        if (!auth || !db) {
            throw new Error('Firebase no está inicializado correctamente');
        }
        
        // Test de autenticación anónima
        const result = await signInAnonymously(auth);
        
        statusElement.className = 'status success';
        statusElement.textContent = '✅ Conexión con Firebase exitosa';
        
        detailsElement.innerHTML = `
            <div class="info">
                <h4>Detalles de conexión:</h4>
                <p><strong>Usuario ID:</strong> ${result.user.uid}</p>
                <p><strong>Proyecto:</strong> ${db.app.options.projectId}</p>
                <p><strong>Auth Domain:</strong> ${auth.config.authDomain}</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error de Firebase:', error);
        statusElement.className = 'status error';
        statusElement.textContent = `❌ Error en Firebase: ${error.message}`;
        
        detailsElement.innerHTML = `
            <div class="status error">
                <h4>Detalles del error:</h4>
                <p><strong>Código:</strong> ${error.code || 'Desconocido'}</p>
                <p><strong>Mensaje:</strong> ${error.message}</p>
            </div>
        `;
    }
}

// Test de conexión con Cloudinary
async function testCloudinaryConnection() {
    const statusElement = document.getElementById('cloudinaryStatus');
    const detailsElement = document.getElementById('cloudinaryDetails');
    
    try {
        statusElement.textContent = 'Verificando Cloudinary...';
        
        // Verificar si Cloudinary está disponible
        if (typeof cloudinary === 'undefined') {
            throw new Error('Cloudinary SDK no está cargado');
        }
        
        // Test básico de configuración
        const testConfig = {
            cloudName: CLOUDINARY_CONFIG.cloudName,
            apiKey: CLOUDINARY_CONFIG.apiKey
        };
        
        // Crear una URL de prueba
        const testUrl = `https://res.cloudinary.com/${testConfig.cloudName}/image/upload/v1/sample.jpg`;
        
        statusElement.className = 'status success';
        statusElement.textContent = '✅ Cloudinary configurado correctamente';
        
        detailsElement.innerHTML = `
            <div class="info">
                <h4>Configuración de Cloudinary:</h4>
                <p><strong>Cloud Name:</strong> ${testConfig.cloudName}</p>
                <p><strong>API Key:</strong> ${testConfig.apiKey}</p>
                <p><strong>URL de prueba:</strong> <a href="${testUrl}" target="_blank">Ver imagen</a></p>
                <p><strong>Widget:</strong> ${cloudinaryWidget ? 'Configurado' : 'Pendiente'}</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error de Cloudinary:', error);
        statusElement.className = 'status error';
        statusElement.textContent = `❌ Error en Cloudinary: ${error.message}`;
        
        detailsElement.innerHTML = `
            <div class="status error">
                <h4>Detalles del error:</h4>
                <p><strong>Mensaje:</strong> ${error.message}</p>
                <p><strong>SDK Cargado:</strong> ${typeof cloudinary !== 'undefined' ? 'Sí' : 'No'}</p>
            </div>
        `;
    }
}

// Test de acceso a la colección arcane
async function testArcaneAccess() {
    const statusElement = document.getElementById('arcaneStatus');
    const detailsElement = document.getElementById('arcaneDetails');
    
    try {
        statusElement.textContent = 'Verificando colección arcane...';
        
        // Intentar leer la colección
        const arcaneRef = collection(db, 'arcane');
        const snapshot = await getDocs(arcaneRef);
        
        statusElement.className = 'status success';
        statusElement.textContent = `✅ Colección 'arcane' accesible (${snapshot.size} documentos)`;
        
        let docsInfo = '<h4>Documentos en la colección:</h4>';
        if (snapshot.size > 0) {
            snapshot.forEach((doc) => {
                const data = doc.data();
                docsInfo += `
                    <p><strong>ID:</strong> ${doc.id}</p>
                    <p><strong>Título:</strong> ${data.title || 'Sin título'}</p>
                    <p><strong>Autor:</strong> ${data.authorName || 'Anónimo'}</p>
                    <hr>
                `;
            });
        } else {
            docsInfo += '<p>No hay documentos en la colección aún.</p>';
        }
        
        detailsElement.innerHTML = `
            <div class="info">
                ${docsInfo}
                <p><strong>Colección:</strong> arcane</p>
                <p><strong>Total documentos:</strong> ${snapshot.size}</p>
                <p><strong>Última verificación:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error de Firestore:', error);
        statusElement.className = 'status error';
        statusElement.textContent = `❌ Error accediendo a 'arcane': ${error.message}`;
        
        detailsElement.innerHTML = `
            <div class="status error">
                <h4>Detalles del error:</h4>
                <p><strong>Código:</strong> ${error.code || 'Desconocido'}</p>
                <p><strong>Mensaje:</strong> ${error.message}</p>
            </div>
        `;
    }
}

// Setup del widget de Cloudinary
function setupCloudinaryWidget() {
    try {
        cloudinaryWidget = cloudinary.createUploadWidget({
            cloudName: CLOUDINARY_CONFIG.cloudName,
            uploadPreset: 'arcadia_preset', // Debes crear este preset
            sources: ['local', 'url'],
            multiple: false,
            resourceType: 'image',
            clientAllowedFormats: ['png', 'gif', 'jpeg', 'jpg', 'webp'],
            theme: 'purple'
        }, (error, result) => {
            if (!error && result && result.event === "success") {
                console.log('✅ Imagen subida exitosamente:', result.info);
                alert('✅ Imagen subida exitosamente a Cloudinary!');
            }
            
            if (error) {
                console.error('❌ Error al subir imagen:', error);
                alert('❌ Error al subir imagen: ' + error.message);
            }
        });
        
        console.log('Widget de Cloudinary configurado correctamente');
        
    } catch (error) {
        console.error('Error configurando widget:', error);
    }
}

// Funciones para los botones de test
window.testFirestore = async function() {
    await testArcaneAccess();
}

window.testAuth = async function() {
    await testFirebaseConnection();
}

window.testCloudinaryWidget = function() {
    if (cloudinaryWidget) {
        cloudinaryWidget.open();
    } else {
        alert('Widget de Cloudinary no está configurado. Verifica el upload preset.');
    }
}

window.testArcaneCollection = async function() {
    await testArcaneAccess();
}

window.createTestPin = async function() {
    try {
        const testPin = {
            title: 'Pin de Prueba',
            description: 'Este es un pin de prueba para verificar la conexión',
            imageUrl: 'https://via.placeholder.com/300x400/e60023/ffffff?text=Test+Pin',
            publicId: 'test_pin_' + Date.now(),
            authorId: auth.currentUser ? auth.currentUser.uid : 'test_user',
            authorName: 'Usuario de Prueba',
            authorAvatar: 'https://via.placeholder.com/40',
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            saves: []
        };
        
        const docRef = await addDoc(collection(db, 'arcane'), testPin);
        alert(`✅ Pin de prueba creado con ID: ${docRef.id}`);
        
        // Actualizar el test de la colección
        await testArcaneAccess();
        
    } catch (error) {
        console.error('Error creando pin de prueba:', error);
        alert(`❌ Error creando pin de prueba: ${error.message}`);
    }
}