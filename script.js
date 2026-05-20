/**
 * ORÁCULO DE BOLSILLO - CORE LOGIC
 * Autor: FAC 4U
 * Versión: 2.0.0
 */

// ==========================================
// 1. SISTEMA DE AUDIO (Web Audio API)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Genera un tono sintetizado sin archivos externos.
 * @param {number} freq - Frecuencia en Hz
 * @param {string} type - Tipo de onda ('square', 'sine', 'triangle')
 * @param {number} duration - Duración en segundos
 */
function playTone(freq, type, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Envelope para evitar "clics" al inicio/final
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// ==========================================
// 2. GESTIÓN DE ESTADO (State Management)
// ==========================================
const STORAGE_KEY = 'oracleData_v4';

const defaultData = {
    'list-1': { name: '🍔 Almuerzo', items: ['Pizza', 'Ensalada César', 'Pasta', 'Sushi', 'Hamburguesa'] },
    'list-2': { name: '🎬 Películas', items: ['Matrix', 'Interstellar', 'El Padrino', 'Shrek'] },
    'list-3': { name: '💻 Proyectos', items: ['Web App', 'Juego Unity', 'Portfolio', 'Estudiar React'] }
};

let appData = {};
let currentListId = null;
let isSpinning = false;

/** Inicializa la aplicación cargando datos locales */
function init() {
    const stored = localStorage.getItem(STORAGE_KEY);
    appData = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(defaultData));
    
    const keys = Object.keys(appData);
    if (keys.length > 0) {
        selectList(keys[0]);
    } else {
        // Fallback si no hay listas
        appData['list-default'] = { name: 'Mi Lista', items: [] };
        selectList('list-default');
    }
}

/** Guarda el estado actual en LocalStorage */
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    renderUI();
}

// ==========================================
// 3. INTERFAZ DE USUARIO (UI)
// ==========================================

function toggleEditor() {
    const layout = document.getElementById('app-layout');
    layout.classList.toggle('editor-closed');
}

function selectList(id) {
    currentListId = id;
    const list = appData[id];
    if(!list) return;

    // Actualizar Oráculo
    const spinnerText = document.getElementById('spinner-text');
    spinnerText.innerText = list.name;
    spinnerText.classList.remove('winner-animation');
    spinnerText.style.color = "var(--primary)";

    // Actualizar Título del Editor
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) editorTitle.innerText = `✏️ ${list.name}`;

    renderUI();
}

function renderUI() {
    // Renderizar Botones de Colecciones
    const listWrapper = document.getElementById('lists-wrapper');
    listWrapper.innerHTML = '';
    
    Object.keys(appData).forEach(id => {
        const btn = document.createElement('button');
        btn.className = `list-pill ${id === currentListId ? 'active' : ''}`;
        btn.innerText = appData[id].name;
        btn.onclick = () => selectList(id);
        listWrapper.appendChild(btn);
    });

    // Renderizar Items del Editor
    const itemsContainer = document.getElementById('items-container');
    itemsContainer.innerHTML = '';
    
    if (currentListId && appData[currentListId]) {
        appData[currentListId].items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'item-row';
            li.innerHTML = `
                <span>${item}</span>
                <span class="delete-x" onclick="deleteItem(${index})" title="Eliminar">&times;</span>
            `;
            itemsContainer.appendChild(li);
        });
    }
}

// ==========================================
// 4. LÓGICA DEL JUEGO (Game Loop)
// ==========================================

function spin() {
    if (isSpinning || !currentListId) return;
    
    const items = appData[currentListId].items;
    if (items.length === 0) {
        alert("¡Lista vacía! Añade elementos en el panel derecho.");
        // Abrir editor automáticamente si está cerrado
        document.getElementById('app-layout').classList.remove('editor-closed');
        return;
    }

    isSpinning = true;
    const spinnerText = document.getElementById('spinner-text');
    
    // Reset visual
    spinnerText.classList.remove('winner-animation');
    spinnerText.classList.add('blur-effect');

    let counter = 0;
    // Loop de animación
    const interval = setInterval(() => {
        const randomItem = items[Math.floor(Math.random() * items.length)];
        spinnerText.innerText = randomItem;
        
        // Sonido "Tick"
        playTone(150 + (counter * 5), 'square', 0.05);
        
        counter++;
        if (counter > 20) {
            clearInterval(interval);
            finishSpin(items);
        }
    }, 80);
}

function finishSpin(items) {
    const spinnerText = document.getElementById('spinner-text');
    const winner = items[Math.floor(Math.random() * items.length)];
    
    spinnerText.innerText = winner;
    spinnerText.classList.remove('blur-effect');
    
    // Forzar reflow para reiniciar animación CSS
    void spinnerText.offsetWidth; 
    spinnerText.classList.add('winner-animation');
    
    // Sonido Victoria (Ding-Dong)
    playTone(600, 'sine', 0.3);
    setTimeout(() => playTone(900, 'triangle', 0.6), 150);

    isSpinning = false;
}

// ==========================================
// 5. OPERACIONES CRUD
// ==========================================

function createNewList() {
    const input = document.getElementById('new-list-name');
    const name = input.value.trim();
    if (!name) return;

    const id = 'list-' + Date.now();
    appData[id] = { name: name, items: [] };
    input.value = '';
    
    saveData();
    selectList(id);
}

function deleteCurrentList() {
    if(!confirm("¿Estás seguro de borrar esta colección completa?")) return;
    
    delete appData[currentListId];
    
    const keys = Object.keys(appData);
    if(keys.length > 0) {
        selectList(keys[0]);
    } else {
        currentListId = null;
        document.getElementById('spinner-text').innerText = "Crea una lista...";
        renderUI();
    }
    saveData();
}

function addItem() {
    const input = document.getElementById('new-item-input');
    const val = input.value.trim();
    if (val && currentListId) {
        appData[currentListId].items.push(val);
        input.value = '';
        saveData();
    }
}

function deleteItem(idx) {
    appData[currentListId].items.splice(idx, 1);
    saveData();
}

// Inicializar App
init();
