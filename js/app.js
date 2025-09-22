import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove,
    query,
    orderBy,
    where 
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Configuración de Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dqupf0krm',
    apiKey: '374253863849214',
    apiSecret: 'D1gdbQoHbLsLcVp5c3uKBSgz7gg'
};

// Variables globales
let currentUser = null;
let cloudinaryWidget = null;
let pins = [];

// Elementos del DOM
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const uploadModal = document.getElementById('uploadModal');
const pinModal = document.getElementById('pinModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const uploadForm = document.getElementById('uploadForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const uploadBtn = document.getElementById('uploadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const pinsGrid = document.getElementById('pinsGrid');
const loading = document.getElementById('loading');

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupCloudinaryWidget();
});

// Inicializar la aplicación
function initializeApp() {
    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showMainApp();
            loadPins();
            updateUserInterface();
        } else {
            currentUser = null;
            showLoginModal();
        }
    });
}

// Configurar event listeners
function setupEventListeners() {
    // Formularios de autenticación
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    uploadForm.addEventListener('submit', handleUpload);
    
    // Links para cambiar entre login y registro
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(loginModal);
        showModal(registerModal);
    });
    
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(registerModal);
        showModal(loginModal);
    });
    
    // Botones de navegación
    uploadBtn.addEventListener('click', () => showModal(uploadModal));
    logoutBtn.addEventListener('click', handleLogout);
    
    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal);
        });
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
    
    // Preview de imagen en upload
    const imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', previewImage);
    
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
}

// Configurar widget de Cloudinary
function setupCloudinaryWidget() {
    cloudinaryWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: 'arcadia_preset', // Necesitarás crear este preset en Cloudinary
        sources: ['local', 'url', 'camera'],
        multiple: false,
        resourceType: 'image',
        clientAllowedFormats: ['png', 'gif', 'jpeg', 'jpg', 'webp'],
        maxImageFileSize: 10000000, // 10MB
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: true,
        croppingAspectRatio: 0.7,
        theme: 'purple',
        styles: {
            palette: {
                window: '#FFFFFF',
                sourceBg: '#F4F4F5',
                windowBorder: '#90A0B3',
                tabIcon: '#E60023',
                inactiveTabIcon: '#0E2F5A',
                menuIcons: '#5A616A',
                link: '#E60023',
                action: '#FF620C',
                inProgress: '#0078FF',
                complete: '#20B832',
                error: '#EA2727',
                textDark: '#000000',
                textLight: '#FFFFFF'
            }
        }
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const imageUrl = result.info.secure_url;
            const publicId = result.info.public_id;
            
            // Llenar el formulario con la imagen subida
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${imageUrl}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
            
            // Guardar la URL para usar después
            uploadForm.dataset.imageUrl = imageUrl;
            uploadForm.dataset.publicId = publicId;
            
            showMessage('Imagen subida correctamente', 'success');
        }
        
        if (error) {
            console.error('Error al subir imagen:', error);
            showMessage('Error al subir la imagen', 'error');
        }
    });
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(true);
        await signInWithEmailAndPassword(auth, email, password);
        hideModal(loginModal);
        showMessage('¡Bienvenido de nuevo!', 'success');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        showLoading(false);
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        showLoading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Actualizar perfil con el nombre
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        hideModal(registerModal);
        showMessage('¡Cuenta creada exitosamente!', 'success');
    } catch (error) {
        console.error('Error al crear cuenta:', error);
        showMessage(getErrorMessage(error.code), 'error');
    } finally {
        showLoading(false);
    }
}

// Manejar logout
async function handleLogout() {
    try {
        await signOut(auth);
        showMessage('Sesión cerrada', 'success');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showMessage('Error al cerrar sesión', 'error');
    }
}

// Manejar subida de pin
async function handleUpload(e) {
    e.preventDefault();
    
    if (!uploadForm.dataset.imageUrl) {
        showMessage('Por favor sube una imagen primero', 'error');
        return;
    }
    
    const title = document.getElementById('pinTitle').value;
    const description = document.getElementById('pinDescription').value;
    
    try {
        showLoading(true);
        
        const pinData = {
            title: title,
            description: description,
            imageUrl: uploadForm.dataset.imageUrl,
            publicId: uploadForm.dataset.publicId,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email,
            authorAvatar: currentUser.photoURL || 'https://via.placeholder.com/40',
            createdAt: new Date(),
            likes: [],
            likeCount: 0,
            saves: []
        };
        
        await addDoc(collection(db, 'arcane'), pinData);
        
        hideModal(uploadModal);
        uploadForm.reset();
        document.getElementById('imagePreview').innerHTML = '';
        delete uploadForm.dataset.imageUrl;
        delete uploadForm.dataset.publicId;
        
        showMessage('Pin publicado exitosamente', 'success');
        loadPins(); // Recargar pins
        
    } catch (error) {
        console.error('Error al subir pin:', error);
        showMessage('Error al publicar el pin', 'error');
    } finally {
        showLoading(false);
    }
}

// Cargar pins desde Firestore
async function loadPins() {
    try {
        showLoading(true);
        const pinsQuery = query(collection(db, 'arcane'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(pinsQuery);
        
        pins = [];
        querySnapshot.forEach((doc) => {
            pins.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderPins(pins);
        
    } catch (error) {
        console.error('Error al cargar pins:', error);
        showMessage('Error al cargar los pins', 'error');
    } finally {
        showLoading(false);
    }
}

// Renderizar pins en la grilla
function renderPins(pinsToRender) {
    pinsGrid.innerHTML = '';
    
    pinsToRender.forEach(pin => {
        const pinElement = createPinElement(pin);
        pinsGrid.appendChild(pinElement);
    });
}

// Crear elemento de pin
function createPinElement(pin) {
    const pinDiv = document.createElement('div');
    pinDiv.className = 'pin-card';
    pinDiv.innerHTML = `
        <img src="${pin.imageUrl}" alt="${pin.title}" loading="lazy">
        <div class="pin-overlay">
            <div class="pin-actions">
                <button onclick="toggleLike('${pin.id}')" class="btn-like-small">
                    <i class="${pin.likes && pin.likes.includes(currentUser.uid) ? 'fas' : 'far'} fa-heart"></i>
                    ${pin.likeCount || 0}
                </button>
                <button onclick="toggleSave('${pin.id}')" class="btn-save-small">
                    <i class="${pin.saves && pin.saves.includes(currentUser.uid) ? 'fas' : 'far'} fa-bookmark"></i>
                </button>
            </div>
        </div>
        <div class="pin-info">
            <h3>${pin.title}</h3>
            ${pin.description ? `<p>${pin.description}</p>` : ''}
            <div class="pin-author">
                <img src="${pin.authorAvatar}" alt="${pin.authorName}" class="avatar">
                <span>${pin.authorName}</span>
            </div>
        </div>
    `;
    
    // Abrir modal de detalle al hacer clic en la imagen
    pinDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.pin-actions')) {
            showPinDetail(pin);
        }
    });
    
    return pinDiv;
}

// Mostrar detalle del pin
function showPinDetail(pin) {
    document.getElementById('pinDetailImage').src = pin.imageUrl;
    document.getElementById('pinDetailTitle').textContent = pin.title;
    document.getElementById('pinDetailDescription').textContent = pin.description || '';
    document.getElementById('authorAvatar').src = pin.authorAvatar;
    document.getElementById('authorName').textContent = pin.authorName;
    document.getElementById('likeCount').textContent = pin.likeCount || 0;
    
    // Configurar botones
    const likeBtn = document.getElementById('likeBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    const isLiked = pin.likes && pin.likes.includes(currentUser.uid);
    const isSaved = pin.saves && pin.saves.includes(currentUser.uid);
    
    likeBtn.className = isLiked ? 'btn-like liked' : 'btn-like';
    likeBtn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${pin.likeCount || 0}`;
    
    saveBtn.innerHTML = `<i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i> ${isSaved ? 'Guardado' : 'Guardar'}`;
    
    // Event listeners para los botones
    likeBtn.onclick = () => toggleLike(pin.id);
    saveBtn.onclick = () => toggleSave(pin.id);
    
    showModal(pinModal);
}

// Toggle like
async function toggleLike(pinId) {
    try {
        const pinRef = doc(db, 'arcane', pinId);
        const pin = pins.find(p => p.id === pinId);
        
        if (!pin) return;
        
        const isLiked = pin.likes && pin.likes.includes(currentUser.uid);
        
        if (isLiked) {
            await updateDoc(pinRef, {
                likes: arrayRemove(currentUser.uid),
                likeCount: (pin.likeCount || 1) - 1
            });
        } else {
            await updateDoc(pinRef, {
                likes: arrayUnion(currentUser.uid),
                likeCount: (pin.likeCount || 0) + 1
            });
        }
        
        loadPins(); // Recargar pins
        
    } catch (error) {
        console.error('Error al dar like:', error);
        showMessage('Error al dar like', 'error');
    }
}

// Toggle save
async function toggleSave(pinId) {
    try {
        const pinRef = doc(db, 'arcane', pinId);
        const pin = pins.find(p => p.id === pinId);
        
        if (!pin) return;
        
        const isSaved = pin.saves && pin.saves.includes(currentUser.uid);
        
        if (isSaved) {
            await updateDoc(pinRef, {
                saves: arrayRemove(currentUser.uid)
            });
            showMessage('Pin eliminado de guardados', 'success');
        } else {
            await updateDoc(pinRef, {
                saves: arrayUnion(currentUser.uid)
            });
            showMessage('Pin guardado', 'success');
        }
        
        loadPins(); // Recargar pins
        
    } catch (error) {
        console.error('Error al guardar pin:', error);
        showMessage('Error al guardar pin', 'error');
    }
}

// Buscar pins
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderPins(pins);
        return;
    }
    
    const filteredPins = pins.filter(pin => 
        pin.title.toLowerCase().includes(searchTerm) ||
        (pin.description && pin.description.toLowerCase().includes(searchTerm)) ||
        pin.authorName.toLowerCase().includes(searchTerm)
    );
    
    renderPins(filteredPins);
}

// Preview de imagen
function previewImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
        
        // Abrir widget de Cloudinary
        cloudinaryWidget.open();
    }
}

// Utility functions
function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showLoading(show) {
    loading.classList.toggle('active', show);
}

function showLoginModal() {
    showModal(loginModal);
    hideModal(registerModal);
    hideModal(uploadModal);
    hideModal(pinModal);
}

function showMainApp() {
    hideModal(loginModal);
    hideModal(registerModal);
}

function updateUserInterface() {
    if (currentUser) {
        document.getElementById('userName').textContent = 
            currentUser.displayName || currentUser.email;
        document.getElementById('userAvatar').src = 
            currentUser.photoURL || 'https://via.placeholder.com/40';
    }
}

function showMessage(message, type) {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Agregarlo al body
    document.body.appendChild(messageDiv);
    
    // Removerlo después de 3 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Este email ya está registrado';
        case 'auth/invalid-email':
            return 'Email inválido';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres';
        case 'auth/user-not-found':
            return 'Usuario no encontrado';
        case 'auth/wrong-password':
            return 'Contraseña incorrecta';
        default:
            return 'Ha ocurrido un error. Inténtalo de nuevo.';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Hacer funciones disponibles globalmente para los event handlers inline
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;