# BFSI Predictive Intelligence Platform

A comprehensive web application that integrates Machine Learning models and Large Language Models (LLMs) for Banking, Financial Services, and Insurance (BFSI) domain applications. This platform provides fraud detection capabilities and an intelligent chatbot for financial services support.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

The BFSI Predictive Intelligence Platform is a full-stack application that combines:

- **Fraud Detection System**: A machine learning model that analyzes transaction data to detect potential fraudulent activities
- **BFSI Chatbot**: A fine-tuned language model (Phi-3) specialized in banking, finance, and insurance domain knowledge
- **Data Visualization**: A CSV data viewer for transaction analysis
- **Modern Web Interface**: A responsive single-page application with multi-page navigation

## ✨ Features

### 1. Fraud Detection
- Real-time transaction fraud analysis
- Support for 17+ transaction features including:
  - Transaction amount, location, currency
  - Device and merchant information
  - Temporal features (date, time, velocity)
  - Authentication methods
  - Transaction history patterns
- Probability-based risk scoring
- Binary classification (Fraud/Normal)

### 2. BFSI Chatbot
- Fine-tuned Phi-3-mini-4k-instruct model with LoRA adapters
- Specialized knowledge in banking, finance, and insurance
- Conversational interface with chat history
- CPU-optimized inference

### 3. Data Viewer
- CSV data visualization
- Transaction data table display
- Real-time data fetching from backend
- Support for up to 100 rows display

### 4. User Interface
- Modern, responsive design using Tailwind CSS
- Multi-page navigation (Home, Fraud Detection, Chatbot, Data Viewer, About)
- Real-time feedback and loading indicators
- Error handling and user-friendly messages

## 🏗️ Architecture

### Backend
- **Framework**: FastAPI (Python)
- **ML Framework**: scikit-learn, joblib
- **LLM Framework**: Transformers, PyTorch, PEFT
- **Server**: Uvicorn ASGI server
- **Port**: 8000 (default)

### Frontend
- **Technology**: HTML5, JavaScript (ES6+), Tailwind CSS
- **Architecture**: Single-Page Application (SPA)
- **API Communication**: Fetch API
- **No Build Process**: Direct browser execution

### Model Components
1. **Fraud Detection Model**: `fraud_detector.pkl` (scikit-learn model)
2. **Feature Scaler**: `scaler.pkl` (StandardScaler)
3. **Chatbot Model**: 
   - Base: `microsoft/Phi-3-mini-4k-instruct`
   - Fine-tuned: LoRA adapters from `phi3-bfsi-finetuned`

## 📦 Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: Not required (frontend runs directly in browser)
- **Operating System**: Windows, Linux, or macOS
- **Memory**: Minimum 8GB RAM (16GB+ recommended for chatbot)
- **Storage**: ~5GB for models and dependencies

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BFSI-Predictive-Intelligence
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd bfsi_backend
python -m venv venv
```

#### Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Model Files

Ensure the following model files are present in `bfsi_backend/app/models/`:
- `fraud_detector.pkl` - Trained fraud detection model
- `scaler.pkl` - Feature scaler for preprocessing

### 4. Chatbot Model Configuration

Update the LoRA adapter path in `bfsi_backend/app/chatbot_wrapper.py`:

```python
LORA_ADAPTER_PATH = r"<path-to-your-phi3-bfsi-finetuned-adapters>"
```

### 5. CSV Data Path (Optional)

If using the CSV viewer, update the CSV file path in `bfsi_backend/app/main.py`:

```python
csv_path = r"<path-to-your-csv-file>"
```

## ⚙️ Configuration

### Backend Configuration

#### Port Configuration
Edit `bfsi_backend/app.py` to change the server port:

```python
uvicorn.run(app, host="0.0.0.0", port=8000)  # Change port here
```

#### CORS Configuration
CORS is configured to allow all origins. For production, update `bfsi_backend/app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Configuration

#### API Base URL
Update `Front-End/script.js` and `Front-End/main.js` if backend runs on different host/port:

```javascript
const API_BASE_URL = 'http://127.0.0.1:8000';  // Change if needed
```

## 💻 Usage

### Starting the Backend Server

1. Navigate to the backend directory:
```bash
cd bfsi_backend
```

2. Activate virtual environment (if not already activated)

3. Start the server:
```bash
python app.py
```

The server will start on `http://0.0.0.0:8000` (accessible at `http://127.0.0.1:8000`)

### Accessing the Frontend

1. Open `Front-End/index.html` in a web browser
   - **Option 1**: Double-click the file
   - **Option 2**: Use a local web server:
     ```bash
     # Python 3
     cd Front-End
     python -m http.server 8080
     # Then open http://localhost:8080
     ```

2. Navigate through the application:
   - **Home**: Overview of platform features
   - **Fraud Detection**: Submit transaction data for fraud analysis
   - **Chatbot**: Interact with the BFSI chatbot
   - **Data Viewer**: View transaction data from CSV
   - **Contact/About**: Information about the platform

### Using Fraud Detection

1. Navigate to "Fraud Detection" page
2. Fill in the transaction form with:
   - User ID, Amount, Category
   - Merchant ID, Device ID
   - Transaction date and time
   - Location, Currency, Card Type
   - Transaction status and authentication method
   - Velocity features (previous transactions, distance, time)
3. Click "Detect Fraud"
4. View results showing:
   - Fraud prediction (Fraud/Normal)
   - Probability score

### Using the Chatbot

1. Navigate to "Chatbot" page
2. Type your question in the input field
3. Press Enter or click the send button
4. Wait for the AI response
5. Continue the conversation

### Viewing CSV Data

1. Navigate to "Data Viewer" page
2. Data automatically loads from the backend
3. View transaction data in tabular format
4. First 100 rows are displayed

## 📡 API Documentation

### Base URL
```
http://127.0.0.1:8000
```

### Endpoints

#### 1. Health Check
```
GET /
```
**Response:**
```json
{
  "status": "ok",
  "service": "BFSI Predictive Intelligence API"
}
```

#### 2. Fraud Detection
```
POST /predict_fraud
```
**Request Body:**
```json
{
  "feature_vector": [1250.75, 10, 445, 876, 1, 0, 2, 12, 50.2, 15.5, 1, 3, 3, 2024, 1, 15, 14]
}
```

**Response:**
```json
{
  "is_fraud": 0,
  "probability": 0.234
}
```

**Feature Vector Order:**
1. Transaction_Amount
2. Transaction_Location (encoded)
3. Merchant_ID
4. Device_ID
5. Card_Type (encoded)
6. Transaction_Currency (encoded)
7. Transaction_Status (encoded)
8. Previous_Transaction_Count
9. Distance_Between_Transactions_km
10. Time_Since_Last_Transaction_min
11. Authentication_Method (encoded)
12. Transaction_Velocity
13. Transaction_Category (encoded)
14. Year
15. Month
16. Day
17. Hour

#### 3. Chatbot
```
POST /chat
```
**Request Body:**
```json
{
  "message": "What is a credit score?",
  "history": []  // Optional
}
```

**Response:**
```json
{
  "reply": "A credit score is a numerical representation...",
  "meta": {
    "source": "phi3-bfsi-lora"
  }
}
```

#### 4. CSV Data
```
GET /csv_data
```
**Response:**
```json
{
  "data": [...],
  "columns": ["col1", "col2", ...],
  "total_rows": 1000,
  "displayed_rows": 100
}
```

## 📁 Project Structure

```
BFSI-Predictive-Intelligence/
│
├── bfsi_backend/              # Backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI application and routes
│   │   ├── chatbot_wrapper.py # Chatbot model wrapper
│   │   └── models/            # ML model files
│   │       ├── fraud_detector.pkl
│   │       └── scaler.pkl
│   ├── app.py                 # Server entry point
│   ├── requirements.txt       # Python dependencies
│   └── venv/                 # Virtual environment (not in git)
│
├── Front-End/                 # Frontend application
│   ├── index.html            # Main HTML file
│   ├── script.js             # Main JavaScript logic
│   ├── main.js               # Fraud detection module
│   ├── encoders_full.js      # Feature encoders
│   └── style.css             # Custom styles
│
└── README.md                  # This file
```

## 🔧 Troubleshooting

### Backend Issues

#### Port Already in Use
**Error**: `[Errno 10048] error while attempting to bind on address`

**Solution (Windows):**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Solution (Linux/macOS):**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)
```

#### Model Files Not Found
**Error**: `Could not load scaler/fraud model`

**Solution**: Ensure `fraud_detector.pkl` and `scaler.pkl` are in `bfsi_backend/app/models/`

#### Chatbot Not Initializing
**Error**: `Chatbot not initialized on server`

**Solutions**:
1. Check LoRA adapter path in `chatbot_wrapper.py`
2. Verify model files are accessible
3. Check available memory (chatbot requires significant RAM)
4. Review backend logs for specific error messages

#### Import Errors
**Error**: Module not found

**Solution**: Ensure virtual environment is activated and dependencies are installed:
```bash
pip install -r requirements.txt
```

### Frontend Issues

#### Cannot Connect to Backend
**Error**: `Failed to fetch` or connection errors

**Solutions**:
1. Verify backend server is running on port 8000
2. Check `API_BASE_URL` in `script.js` matches backend URL
3. Check browser console for CORS errors
4. Ensure firewall allows connections

#### Feature Encoding Errors
**Error**: Undefined encoder values

**Solution**: Verify all categorical features have corresponding encoders in `script.js` or `encoders_full.js`

#### CSV Data Not Loading
**Error**: CSV file not found

**Solution**: Update CSV path in `bfsi_backend/app/main.py` to point to your CSV file

### Performance Issues

#### Slow Chatbot Responses
- Chatbot runs on CPU, which is slower than GPU
- Consider reducing `max_new_tokens` in `chatbot_wrapper.py`
- Close other memory-intensive applications

#### High Memory Usage
- Chatbot model requires significant RAM
- Consider using a smaller model or GPU acceleration
- Monitor system resources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

[Specify your license here]

## 👥 Authors

[Your name/team name]

## 🙏 Acknowledgments

- Microsoft Phi-3 model team
- FastAPI and Uvicorn developers
- Transformers and PEFT library maintainers
- Tailwind CSS team

## 📞 Support

For issues, questions, or contributions, please:
- Open an issue on the repository
- Contact the development team
- Refer to the troubleshooting section above

---

**Note**: This is a development/demonstration platform. For production use, ensure proper security measures, error handling, and model validation are implemented.
