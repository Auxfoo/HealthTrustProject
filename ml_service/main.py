from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"

app = FastAPI(title="HealthTrust Diabetes Prediction Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None


class DiabetesInput(BaseModel):
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    smoking_history: str
    bmi: float
    HbA1c_level: float
    blood_glucose_level: int


@app.on_event("startup")
def load_model():
    global model
    if not MODEL_PATH.exists():
        raise RuntimeError("model.pkl was not found. Run python train.py before starting the API.")
    model = joblib.load(MODEL_PATH)


@app.get("/")
def root():
    return {"service": "HealthTrust ML Service", "status": "ok"}


@app.post("/predict")
def predict(payload: DiabetesInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    features = pd.DataFrame(
        [
            {
                "gender": payload.gender,
                "age": payload.age,
                "hypertension": payload.hypertension,
                "heart_disease": payload.heart_disease,
                "smoking_history": payload.smoking_history,
                "bmi": payload.bmi,
                "HbA1c_level": payload.HbA1c_level,
                "blood_glucose_level": payload.blood_glucose_level,
            }
        ]
    )

    prediction = int(model.predict(features)[0])
    probability = float(model.predict_proba(features)[0][1])

    return {"prediction": prediction, "probability": probability}
