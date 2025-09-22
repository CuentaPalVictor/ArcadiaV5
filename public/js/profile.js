import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    updateProfile,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    arrayUnion, 
    arrayRemove,
    query,
    where,
    orderBy 
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
let userPins = [];
let savedPins = [];
let currentPinInModal = null;

// Elementos del DOM
const uploadModal = document.getElementById('uploadModal');
const pinModal = document.getElementById('pinModal');
const editProfileModal = document.getElementById('editProfileModal');
const uploadForm = document.getElementById('uploadForm');
const editProfileForm = document.getElementById('editProfileForm');
const uploadBtn = document.getElementById('uploadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const editAvatarBtn = document.getElementById('editAvatarBtn');
const createdTab = document.getElementById('createdTab');
const savedTab = document.getElementById('savedTab');
const myPinsGrid = document.getElementById('myPinsGrid');
const savedPinsGrid = document.getElementById('savedPinsGrid');
const loading = document.getElementById('loading');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupCloudinaryWidget();
});

function initializeApp() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateUserInterface();
            loadUserProfile();
            loadUserPins();
            loadSavedPins();
        } else {
            // Redirigir al login si no hay usuario
            window.location.href = 'index.html';
        }
    });
}

function setupEventListeners() {
    // Botones principales
    uploadBtn.addEventListener('click', () => showModal(uploadModal));
    logoutBtn.addEventListener('click', handleLogout);
    editProfileBtn.addEventListener('click', () => showModal(editProfileModal));
    editAvatarBtn.addEventListener('click', () => {
        cloudinaryWidget.open();
    });

    // Formularios
    uploadForm.addEventListener('submit', handleUpload);
    editProfileForm.addEventListener('submit', handleEditProfile);

    // Tabs
    createdTab.addEventListener('click', () => switchTab('created'));
    savedTab.addEventListener('click', () => switchTab('saved'));

    // Botones de modal
    document.getElementById('createFirstPin').addEventListener('click', () => {
        showModal(uploadModal);
    });

    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal);
        });
    });

    // Cancelar acciones
    document.getElementById('cancelUpload').addEventListener('click', () => {
        hideModal(uploadModal);
    });
    
    document.getElementById('cancelEdit').addEventListener('click', () => {
        hideModal(editProfileModal);
    });

    // Preview de imagen en upload
    const imageInput = document.getElementById('imageInput');
    imageInput.addEventListener('change', previewImage);

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
}

function setupCloudinaryWidget() {
    cloudinaryWidget = cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: 'arcadia_preset', // Necesitarás crear este preset
        sources: ['local', 'url', 'camera'],
        multiple: false,
        resourceType: 'image',
        clientAllowedFormats: ['png', 'gif', 'jpeg', 'jpg', 'webp'],
        maxImageFileSize: 10000000,
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        cropping: true,
        croppingAspectRatio: 1, // Para avatar cuadrado
        theme: 'purple'
    }, async (error, result) => {
        if (!error && result && result.event === "success") {
            const imageUrl = result.info.secure_url;
            
            // Si es para avatar
            if (result.info.context && result.info.context.custom && result.info.context.custom.type === 'avatar') {
                await updateUserAvatar(imageUrl);
            } else {
                // Para pin normal
                document.getElementById('imagePreview').innerHTML = 
                    `<img src="${imageUrl}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
                uploadForm.dataset.imageUrl = imageUrl;
                uploadForm.dataset.publicId = result.info.public_id;
                showMessage('Imagen subida correctamente', 'success');
            }
        }
        
        if (error) {
            console.error('Error al subir imagen:', error);
            showMessage('Error al subir la imagen', 'error');
        }
    });
}

// Actualizar interfaz de usuario
function updateUserInterface() {
    if (currentUser) {
        document.getElementById('userName').textContent = 
            currentUser.displayName || currentUser.email.split('@')[0];
        document.getElementById('userAvatar').src = 
            currentUser.photoURL || 'https://via.placeholder.com/40';
        
        // Actualizar perfil
        document.getElementById('profileName').textContent = 
            currentUser.displayName || 'Usuario Anónimo';
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileAvatar').src = 
            currentUser.photoURL || 'https://via.placeholder.com/120';
            
        // Rellenar formulario de edición
        document.getElementById('editName').value = currentUser.displayName || '';
    }
}

// Cargar perfil de usuario (estadísticas)
async function loadUserProfile() {
    try {
        showLoading(true);
        
        // Contar pins del usuario
        const userPinsQuery = query(
            collection(db, 'arcane'), 
            where('authorId', '==', currentUser.uid)
        );
        const userPinsSnapshot = await getDocs(userPinsQuery);
        const pinCount = userPinsSnapshot.size;
        
        // Contar likes totales en los pins del usuario
        let totalLikes = 0;
        userPinsSnapshot.forEach(doc => {
            const data = doc.data();
            totalLikes += data.likeCount || 0;
        });
        
        // Contar pins guardados por el usuario
        const allPinsQuery = query(collection(db, 'arcane'));
        const allPinsSnapshot = await getDocs(allPinsQuery);
        let savedCount = 0;
        allPinsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.saves && data.saves.includes(currentUser.uid)) {
                savedCount++;
            }
        });
        
        // Actualizar estadísticas
        document.getElementById('pinCount').textContent = pinCount;
        document.getElementById('likeCount').textContent = totalLikes;
        document.getElementById('saveCount').textContent = savedCount;
        
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    } finally {
        showLoading(false);
    }
}

// Cargar pins del usuario
async function loadUserPins() {
    try {
        const userPinsQuery = query(
            collection(db, 'arcane'), 
            where('authorId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(userPinsQuery);
        
        userPins = [];
        querySnapshot.forEach((doc) => {
            userPins.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderUserPins();
        
    } catch (error) {
        console.error('Error al cargar pins del usuario:', error);
        showMessage('Error al cargar tus pins', 'error');
    }
}

// Cargar pins guardados
async function loadSavedPins() {
    try {
        const allPinsQuery = query(collection(db, 'arcane'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(allPinsQuery);
        
        savedPins = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.saves && data.saves.includes(currentUser.uid)) {
                savedPins.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        renderSavedPins();
        
    } catch (error) {
        console.error('Error al cargar pins guardados:', error);
        showMessage('Error al cargar pins guardados', 'error');
    }
}

// Renderizar pins del usuario
function renderUserPins() {
    myPinsGrid.innerHTML = '';
    const noPinsMessage = document.getElementById('noPinsMessage');
    
    if (userPins.length === 0) {
        noPinsMessage.style.display = 'block';
        return;
    }
    
    noPinsMessage.style.display = 'none';
    userPins.forEach(pin => {
        const pinElement = createPinElement(pin, true); // true = mostrar opciones de eliminación
        myPinsGrid.appendChild(pinElement);
    });
}

// Renderizar pins guardados
function renderSavedPins() {
    savedPinsGrid.innerHTML = '';
    const noSavedMessage = document.getElementById('noSavedMessage');
    
    if (savedPins.length === 0) {
        noSavedMessage.style.display = 'block';
        return;
    }
    
    noSavedMessage.style.display = 'none';
    savedPins.forEach(pin => {
        const pinElement = createPinElement(pin, false);
        savedPinsGrid.appendChild(pinElement);
    });
}

// Crear elemento de pin
function createPinElement(pin, showDelete = false) {
    const pinDiv = document.createElement('div');
    pinDiv.className = 'pin-card';
    
    const deleteButtonHtml = showDelete ? 
        `<button onclick="deletePin('${pin.id}')" class="btn-delete-small">
            <i class="fas fa-trash"></i>
        </button>` : '';
    
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
                ${deleteButtonHtml}
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
    
    // Abrir modal de detalle al hacer clic
    pinDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.pin-actions')) {
            showPinDetail(pin);
        }
    });
    
    return pinDiv;
}

// Mostrar detalle del pin
function showPinDetail(pin) {
    currentPinInModal = pin;
    
    document.getElementById('pinDetailImage').src = pin.imageUrl;
    document.getElementById('pinDetailTitle').textContent = pin.title;
    document.getElementById('pinDetailDescription').textContent = pin.description || '';
    document.getElementById('authorAvatar').src = pin.authorAvatar;
    document.getElementById('authorName').textContent = pin.authorName;
    document.getElementById('likeCount').textContent = pin.likeCount || 0;
    
    // Configurar botones
    const likeBtn = document.getElementById('likeBtn');
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    const isLiked = pin.likes && pin.likes.includes(currentUser.uid);
    const isSaved = pin.saves && pin.saves.includes(currentUser.uid);
    const isOwner = pin.authorId === currentUser.uid;
    
    likeBtn.className = isLiked ? 'btn-like liked' : 'btn-like';
    likeBtn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${pin.likeCount || 0}`;
    
    saveBtn.innerHTML = `<i class="${isSaved ? 'fas' : 'far'} fa-bookmark"></i> ${isSaved ? 'Guardado' : 'Guardar'}`;
    
    // Mostrar botón de eliminar solo si es el propietario
    deleteBtn.style.display = isOwner ? 'flex' : 'none';
    
    // Event listeners
    likeBtn.onclick = () => toggleLike(pin.id);
    saveBtn.onclick = () => toggleSave(pin.id);
    deleteBtn.onclick = () => deletePin(pin.id);
    
    showModal(pinModal);
}

// Cambiar de tab
function switchTab(tab) {
    // Actualizar botones de tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'created') {
        createdTab.classList.add('active');
        document.getElementById('createdPins').classList.add('active');
    } else {
        savedTab.classList.add('active');
        document.getElementById('savedPins').classList.add('active');
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
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
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
        loadUserPins();
        loadUserProfile();
        
    } catch (error) {
        console.error('Error al subir pin:', error);
        showMessage('Error al publicar el pin', 'error');
    } finally {
        showLoading(false);
    }
}

// Manejar edición de perfil
async function handleEditProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value;
    
    try {
        showLoading(true);
        
        await updateProfile(currentUser, {
            displayName: name
        });
        
        hideModal(editProfileModal);
        showMessage('Perfil actualizado correctamente', 'success');
        updateUserInterface();
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        showMessage('Error al actualizar perfil', 'error');
    } finally {
        showLoading(false);
    }
}

// Actualizar avatar del usuario
async function updateUserAvatar(avatarUrl) {
    try {
        showLoading(true);
        
        await updateProfile(currentUser, {
            photoURL: avatarUrl
        });
        
        showMessage('Avatar actualizado correctamente', 'success');
        updateUserInterface();
        
    } catch (error) {
        console.error('Error al actualizar avatar:', error);
        showMessage('Error al actualizar avatar', 'error');
    } finally {
        showLoading(false);
    }
}

// Toggle like
async function toggleLike(pinId) {
    try {
        const pinRef = doc(db, 'arcane', pinId);
        let pin = userPins.find(p => p.id === pinId) || savedPins.find(p => p.id === pinId);
        
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
        
        // Recargar datos
        loadUserPins();
        loadSavedPins();
        loadUserProfile();
        
    } catch (error) {
        console.error('Error al dar like:', error);
        showMessage('Error al dar like', 'error');
    }
}

// Toggle save
async function toggleSave(pinId) {
    try {
        const pinRef = doc(db, 'arcane', pinId);
        let pin = userPins.find(p => p.id === pinId) || savedPins.find(p => p.id === pinId);
        
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
        
        // Recargar datos
        loadUserPins();
        loadSavedPins();
        loadUserProfile();
        
    } catch (error) {
        console.error('Error al guardar pin:', error);
        showMessage('Error al guardar pin', 'error');
    }
}

// Eliminar pin
async function deletePin(pinId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este pin?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        await deleteDoc(doc(db, 'arcane', pinId));
        
        showMessage('Pin eliminado correctamente', 'success');
        hideModal(pinModal);
        
        // Recargar datos
        loadUserPins();
        loadUserProfile();
        
    } catch (error) {
        console.error('Error al eliminar pin:', error);
        showMessage('Error al eliminar pin', 'error');
    } finally {
        showLoading(false);
    }
}

// Manejar logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showMessage('Error al cerrar sesión', 'error');
    }
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

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Hacer funciones disponibles globalmente
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.deletePin = deletePin;