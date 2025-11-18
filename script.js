// Tailwind config
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'primary': '#0d9488',
                'secondary-bg': '#f0fdfa',
            }
        }
    }
};

// --- GLOBAL STATE AND SETUP ---
const API_BASE_URL = 'http://127.0.0.1:8000';
let currentPage = 'home';
const chatHistory = [];
let csvData = [];
let csvColumns = [];

// --- CORE NAVIGATION FUNCTION ---
function navigateTo(pageId) {
    currentPage = pageId;
    document.querySelectorAll('.page-content').forEach(el => {
        el.style.display = 'none';
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (pageId === 'csv_viewer') {
        loadCsvData();
    } else if (pageId === 'chatbot') {
        renderChatHistory();
    }
}

// --- HELPER FUNCTION FOR API CALLS ---
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`API Call Error (${endpoint}):`, error);
        showModal(`Connection Error`, `Could not connect to backend at ${API_BASE_URL}`, 'error');
        return null;
    }
}

function updateCsvStatus(message, type = 'info') {
    const status = document.getElementById('csv-status');
    const palette = {
        info: 'text-primary',
        success: 'text-green-600',
        warning: 'text-amber-600',
        error: 'text-red-600'
    };
    status.innerHTML = `<div class="text-center py-4 ${palette[type] || palette.info}">${message}</div>`;
}

function renderCsvTable() {
    const head = document.getElementById('csv-table-head');
    const body = document.getElementById('csv-table-body');

    if (!csvColumns.length) {
        head.innerHTML = '';
        body.innerHTML = '';
        updateCsvStatus('No columns available in CSV.', 'warning');
        return;
    }

    head.innerHTML = csvColumns.map(col => `
        <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${col}</th>
    `).join('');

    if (!csvData.length) {
        body.innerHTML = `
            <tr>
                <td class="px-4 py-4 text-center text-sm text-gray-500" colspan="${csvColumns.length}">
                    No rows available in CSV.
                </td>
            </tr>
        `;
        return;
    }

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return '—';
        if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(2);
        return String(value);
    };

    body.innerHTML = csvData.map(row => `
        <tr class="hover:bg-gray-50">
            ${csvColumns.map(col => `
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-700">${formatValue(row[col])}</td>
            `).join('')}
        </tr>
    `).join('');
}

// --- FRAUD DETECTION LOGIC ---
function setupFraudDetection() {
    document.getElementById('fraud-form').addEventListener('submit', handleFraudSubmit);

    const today = new Date();
    document.getElementById('transaction_date').value = today.toISOString().split('T')[0];
    document.getElementById('transaction_time').value = today.toTimeString().split(' ')[0].substring(0, 5);
}

const encoders = {
    Transaction_Location: {
        "Andijan": 0, "Bukhara": 1, "Jizzakh": 2, "Karakalpakstan": 3,
        "Khorezm": 4, "Namangan": 5, "Navoiy": 6, "Samarkand": 7,
        "Surkhandarya": 8, "Syrdarya": 9, "Tashkent": 10
        // ...➡️ NOTE: I will generate FULL list (1000+ items) for you if you want
    },

    // Merchant_ID and Device_ID → handled automatically below 

    Card_Type: { "Humo": 0, "UzCard": 1 },

    Transaction_Currency: { "USD": 0, "UZS": 1 },

    Transaction_Status: {
        "Failed": 0,
        "Reversed": 1,
        "Successful": 2
    },

    Authentication_Method: {
        "2FA": 0,
        "Biometric": 1,
        "Password": 2
    },

    Transaction_Category: {
        "Cash In": 0,
        "Cash Out": 1,
        "Payment": 2,
        "Transfer": 3
    }
};


async function handleFraudSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const resultDiv = document.getElementById('fraud-result');

    resultDiv.innerHTML = '<div class="text-center py-4 text-primary">Processing transaction...</div>';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-t-2 border-white rounded-full mr-2"></span> Analyzing...';

    const raw = {
        Transaction_Amount: parseFloat(form.amount.value),
        Transaction_Location: form.transaction_location.value,
        Merchant_ID: parseInt(form.merchant_id.value),
        Device_ID: parseInt(form.device_id.value),
        Card_Type: form.card_type.value,
        Transaction_Currency: form.transaction_currency.value,
        Transaction_Status: form.transaction_status.value,
        Previous_Transaction_Count: parseInt(form.previous_transaction_count.value),
        Distance_Between_Transactions_km: parseFloat(form.distance_between_transactions_km.value),
        Time_Since_Last_Transaction_min: parseFloat(form.time_since_last_transaction_min.value),
        Authentication_Method: form.authentication_method.value,
        Transaction_Velocity: parseInt(form.transaction_velocity.value),
        Transaction_Category: form.category.value
    };

    // Convert date/time
    const dateObj = new Date(form.transaction_date.value + " " + form.transaction_time.value);
    raw.Year = dateObj.getFullYear();
    raw.Month = dateObj.getMonth() + 1;
    raw.Day = dateObj.getDate();
    raw.Hour = dateObj.getHours();

    // FEATURE ORDER EXACTLY AS MODEL EXPECTS


// Apply encodings
const encoded = {
    Transaction_Amount: raw.Transaction_Amount,
    Transaction_Location: encoders.Transaction_Location[raw.Transaction_Location],
    Merchant_ID: parseInt(raw.Merchant_ID),   // already numeric but must match encoding order
    Device_ID: parseInt(raw.Device_ID),       // same here
    Card_Type: encoders.Card_Type[raw.Card_Type],
    Transaction_Currency: encoders.Transaction_Currency[raw.Transaction_Currency],
    Transaction_Status: encoders.Transaction_Status[raw.Transaction_Status],
    Previous_Transaction_Count: raw.Previous_Transaction_Count,
    Distance_Between_Transactions_km: raw.Distance_Between_Transactions_km,
    Time_Since_Last_Transaction_min: raw.Time_Since_Last_Transaction_min,
    Authentication_Method: encoders.Authentication_Method[raw.Authentication_Method],
    Transaction_Velocity: raw.Transaction_Velocity,
    Transaction_Category: encoders.Transaction_Category[raw.Transaction_Category],
    Year: raw.Year,
    Month: raw.Month,
    Day: raw.Day,
    Hour: raw.Hour
};

// EXACT ORDER your model expects
const feature_vector = [
    encoded.Transaction_Amount,
    encoded.Transaction_Location,
    encoded.Merchant_ID,
    encoded.Device_ID,
    encoded.Card_Type,
    encoded.Transaction_Currency,
    encoded.Transaction_Status,
    encoded.Previous_Transaction_Count,
    encoded.Distance_Between_Transactions_km,
    encoded.Time_Since_Last_Transaction_min,
    encoded.Authentication_Method,
    encoded.Transaction_Velocity,
    encoded.Transaction_Category,
    encoded.Year,
    encoded.Month,
    encoded.Day,
    encoded.Hour
];


    const result = await apiCall('/predict_fraud', 'POST', { feature_vector });
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Detect Fraud';

    if (result && result.is_fraud !== undefined) {
        const isFraud = result.is_fraud === 1;
        const probability = result.probability.toFixed(3);

        resultDiv.innerHTML = `
            <div class="p-6 mt-4 rounded-xl shadow-lg ${isFraud ? 'bg-red-100' : 'bg-green-100'}">
                <h3 class="text-2xl font-bold mb-2">Analysis Complete</h3>
                <p class="text-lg">Prediction: 
                    <span class="font-extrabold ${isFraud ? 'text-red-600' : 'text-green-600'}">
                        ${isFraud ? 'Fraud Detected' : 'Normal Transaction'}
                    </span>
                </p>
                <p class="text-sm text-gray-700">Probability: <span class="font-medium">${probability}</span></p>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `<div class="p-4 mt-4 rounded-xl bg-red-100 text-red-600">Error processing request.</div>`;
    }
}

// --- CHATBOT LOGIC ---
function setupChatbot() {
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);
    if (chatHistory.length === 0) {
        chatHistory.push({ role: 'bot', text: 'Hello! I am your BFSI Chatbot.' });
    }
    renderChatHistory();
}

async function handleChatSubmit(event) {
    event.preventDefault();
    const inputField = document.getElementById('chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    chatHistory.push({ role: 'user', text: message });
    inputField.value = '';
    renderChatHistory();

    const chatBox = document.getElementById('chat-history');
    const loader = document.createElement('div');
    loader.className = 'message-bubble bot-bubble animate-pulse';
    loader.textContent = 'Thinking...';
    chatBox.appendChild(loader);

    const result = await apiCall('/chat', 'POST', { message });
    loader.remove();

    if (result && result.reply) {
        chatHistory.push({ role: 'bot', text: result.reply });
    } else {
        chatHistory.push({ role: 'bot', text: "Sorry, backend couldn't respond." });
    }
    renderChatHistory();
}

function renderChatHistory() {
    const chatBox = document.getElementById('chat-history');
    chatBox.innerHTML = '';

    chatHistory.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.role === 'user' ? 'user-bubble ml-auto' : 'bot-bubble mr-auto'}`;
        bubble.textContent = msg.text;
        chatBox.appendChild(bubble);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- CSV VIEWER LOGIC ---
async function loadCsvData() {
    document.getElementById('csv-table-body').innerHTML = '';
    document.getElementById('csv-table-head').innerHTML = '';
    updateCsvStatus('Loading data...', 'info');

    const result = await apiCall('/csv_data', 'GET');
    if (!result) {
        updateCsvStatus('Unable to load CSV data from backend.', 'error');
        return;
    }

    if (Array.isArray(result)) {
        csvData = result;
        csvColumns = result.length ? Object.keys(result[0]) : [];
        updateCsvStatus(`Showing ${csvData.length} rows from CSV source.`, 'success');
        renderCsvTable();
        return;
    }

    if (Array.isArray(result.data)) {
        csvData = result.data;
        csvColumns = result.columns && result.columns.length ? result.columns : (csvData.length ? Object.keys(csvData[0]) : []);
        const total = result.total_rows ?? csvData.length;
        const displayed = result.displayed_rows ?? csvData.length;
        const metaMessage = result.message ? ` • ${result.message}` : '';
        updateCsvStatus(`Showing ${displayed} of ${total} rows fetched from backend${metaMessage}`, 'success');
        renderCsvTable();
        return;
    }

    updateCsvStatus('CSV endpoint responded without tabular data.', 'error');
}

// --- MODAL ---
function showModal(title, message, type = 'info') {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

// --- INITIALIZATION ---
window.onload = () => {
    setupFraudDetection();
    setupChatbot();
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    navigateTo('home');
};
