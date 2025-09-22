// 🧪 Script simple para verificar conexiones
// Ejecutar en la consola del navegador

console.log('🔍 Verificando conexiones de Arcadia...');

// Verificar Firebase
if (typeof firebase !== 'undefined') {
    console.log('✅ Firebase SDK cargado');
    
    // Verificar Auth
    if (firebase.auth) {
        console.log('✅ Firebase Auth disponible');
    } else {
        console.log('❌ Firebase Auth NO disponible');
    }
    
    // Verificar Firestore
    if (firebase.firestore) {
        console.log('✅ Firebase Firestore disponible');
        
        // Test de conexión a colección arcane
        firebase.firestore().collection('arcane').get()
            .then(snapshot => {
                console.log(`✅ Colección 'arcane' accesible. Documentos: ${snapshot.size}`);
            })
            .catch(error => {
                console.log('❌ Error accediendo a colección arcane:', error.message);
            });
    } else {
        console.log('❌ Firebase Firestore NO disponible');
    }
    
} else {
    console.log('❌ Firebase SDK NO cargado');
}

// Verificar Cloudinary
if (typeof cloudinary !== 'undefined') {
    console.log('✅ Cloudinary SDK cargado');
    
    // Verificar configuración
    const testUrl = 'https://res.cloudinary.com/dqupf0krm/image/upload/sample.jpg';
    console.log('✅ URL de prueba Cloudinary:', testUrl);
    
} else {
    console.log('❌ Cloudinary SDK NO cargado');
}

console.log('🔧 Para más tests detallados, abre test-connections.html');