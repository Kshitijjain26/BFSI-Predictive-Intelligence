# app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import joblib
import numpy as np
import os

# Import pandas with error handling
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False
    print("Warning: pandas is not installed. CSV data endpoint will not work. Install with: pip install pandas")

from .chatbot_wrapper import Chatbot

ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(ROOT, "models")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
DETECTOR_PATH = os.path.join(MODEL_DIR, "fraud_detector.pkl")

app = FastAPI(title="BFSI Predictive Intelligence API")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    scaler = joblib.load(SCALER_PATH)
    fraud_model = joblib.load(DETECTOR_PATH)
except Exception as e:
    scaler = None
    fraud_model = None
    print("Warning: Could not load scaler/fraud model:", e)

try:
    chatbot = Chatbot()
except Exception as e:
    chatbot = None
    print("Warning: Chatbot not initialized:", e)

class FraudRequest(BaseModel):
    features: Optional[Dict[str, float]] = None
    feature_vector: Optional[List[float]] = None

class FraudResponse(BaseModel):
    is_fraud: int
    probability: float

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = None

class ChatResponse(BaseModel):
    reply: str
    meta: Optional[Dict[str, Any]] = None

DEFAULT_FEATURE_ORDER = None

def dict_to_vector(feature_dict: Dict[str, float], order: List[str]):
    return [float(feature_dict[k]) for k in order]

@app.get("/")
def root():
    return {"status": "ok", "service": "BFSI Predictive Intelligence API"}

@app.post("/predict_fraud", response_model=FraudResponse)
def predict_fraud(body: FraudRequest):
    if fraud_model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Fraud model or scaler not loaded on server.")
    if body.feature_vector is not None:
        x = np.array(body.feature_vector, dtype=float).reshape(1, -1)
    elif body.features is not None:
        if DEFAULT_FEATURE_ORDER is None:
            raise HTTPException(status_code=400, detail="Server requires DEFAULT_FEATURE_ORDER for dict input. Send feature_vector or set order.")
        try:
            vec = dict_to_vector(body.features, DEFAULT_FEATURE_ORDER)
            x = np.array(vec, dtype=float).reshape(1, -1)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Bad features dict or missing keys: {e}")
    else:
        raise HTTPException(status_code=400, detail="No input provided. Send feature_vector or features dict.")

    try:
        x_scaled = scaler.transform(x)
        prob = float(fraud_model.predict_proba(x_scaled)[0, 1]) if hasattr(fraud_model, "predict_proba") else float(fraud_model.predict(x_scaled)[0])
        pred = int(fraud_model.predict(x_scaled)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

    return {"is_fraud": pred, "probability": prob}

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(body: ChatRequest):
    if chatbot is None:
        raise HTTPException(status_code=500, detail="Chatbot not initialized on server.")
    try:
        reply, meta = chatbot.get_reply(body.message, history=body.history)
        return {"reply": reply, "meta": meta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {e}")

@app.get("/csv_data")
def get_csv_data():
    """Read CSV data from the specified file path and return as JSON"""
    if not PANDAS_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="pandas library is not installed. Please run: pip install pandas"
        )
    
    csv_path = r"C:\Users\jaink\Downloads\finaldata (1).csv"
    
    # Check if file exists
    if not os.path.exists(csv_path):
        raise HTTPException(
            status_code=404, 
            detail=f"CSV file not found at: {csv_path}. Please verify the file path is correct."
        )
    
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)
        
        # Check if dataframe is empty
        if df.empty:
            return {
                "data": [],
                "columns": [],
                "total_rows": 0,
                "displayed_rows": 0,
                "message": "CSV file is empty"
            }
        
        # Limit to first 100 rows for performance
        df_limited = df.head(100)
        
        # Convert to list of dictionaries (each row as a dict)
        # Handle NaN values by converting them to None (which becomes null in JSON)
        data = df_limited.replace({pd.NA: None, pd.NaT: None}).to_dict(orient='records')
        
        # Get column names
        columns = df_limited.columns.tolist()
        
        return {
            "data": data,
            "columns": columns,
            "total_rows": len(df),
            "displayed_rows": len(df_limited)
        }
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty or has no valid data")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV file: {str(e)}")
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Permission denied: Cannot read file at {csv_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading CSV file: {str(e)}")
