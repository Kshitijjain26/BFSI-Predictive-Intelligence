import encoders from "./encoders_full.js";

const API_BASE_URL = 'http://127.0.0.1:8000';

async function apiCall(endpoint, method='POST', data=null) {
    const options = { method, headers:{'Content-Type':'application/json'} };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(API_BASE_URL + endpoint, options);
    return res.json();
}

export async function predictFraud(raw) {
    const encoded = {
        Transaction_Amount: raw.Transaction_Amount,
        Transaction_Location: encoders.Transaction_Location[String(raw.Transaction_Location)],
        Merchant_ID: encoders.Merchant_ID[String(raw.Merchant_ID)],
        Device_ID: encoders.Device_ID[String(raw.Device_ID)],
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

    return apiCall('/predict_fraud','POST',{feature_vector});
}
