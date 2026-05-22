from contextlib import asynccontextmanager
import math
from pathlib import Path
from typing import AsyncIterator

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"

model = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    global model
    if not MODEL_PATH.exists():
        raise RuntimeError("model.pkl was not found. Run `python train.py` before starting the API.")
    model = joblib.load(MODEL_PATH)
    yield


app = FastAPI(title="HealthTrust Diabetes Prediction Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DiabetesInput(BaseModel):
    gender: str = "Female"
    age: float
    hypertension: int
    heart_disease: int
    smoking_history: str = "never"
    bmi: float
    HbA1c_level: float
    blood_glucose_level: int


REALISTIC_RANGES = {
    "age": {"min": 0, "max": 120, "unit": "years"},
    "bmi": {"min": 10, "max": 80, "unit": "kg/m^2"},
    "HbA1c_level": {"min": 3.5, "max": 18.0, "unit": "%"},
    "blood_glucose_level": {"min": 40, "max": 600, "unit": "mg/dL"},
}

ALLOWED_CATEGORIES = {
    "gender": ["Female", "Male", "Other"],
    "smoking_history": ["No Info", "current", "ever", "former", "never", "not current"],
}


def payload_values(payload: DiabetesInput) -> dict:
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    return payload.dict()


def validate_payload(payload: DiabetesInput) -> list[dict]:
    errors = []
    values = payload_values(payload)

    for field, allowed_values in ALLOWED_CATEGORIES.items():
        if values[field] not in allowed_values:
            errors.append({
                "field": field,
                "message": f"{field} must be one of: {', '.join(allowed_values)}.",
            })

    for field, bounds in REALISTIC_RANGES.items():
        value = float(values[field])
        if value < bounds["min"] or value > bounds["max"]:
            errors.append({
                "field": field,
                "message": f"{field} must be between {bounds['min']} and {bounds['max']} {bounds['unit']}.",
            })

    for field in ("hypertension", "heart_disease"):
        if values[field] not in (0, 1):
            errors.append({"field": field, "message": f"{field} must be 0 or 1."})

    return errors


def sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def clinical_probability(values: dict) -> float:
    age = float(values["age"])
    bmi = float(values["bmi"])
    hba1c = float(values["HbA1c_level"])
    glucose = float(values["blood_glucose_level"])
    hypertension = int(values["hypertension"])
    heart_disease = int(values["heart_disease"])
    smoking = values["smoking_history"]

    score = -5.9
    score += max(0.0, hba1c - 5.3) * 1.25
    score += max(0.0, glucose - 90) / 48.0
    score += max(0.0, bmi - 24) / 10.0
    score += max(0.0, age - 35) / 36.0
    score += hypertension * 0.55
    score += heart_disease * 0.45

    if 5.7 <= hba1c < 6.5:
        score += 1.15 + (hba1c - 5.7) * 0.65
    if 100 <= glucose < 126:
        score += 0.95 + (glucose - 100) / 80.0
    if 25 <= bmi < 30:
        score += 0.25

    if smoking == "current":
        score += 0.25
    elif smoking in {"former", "ever"}:
        score += 0.12
    elif smoking == "No Info":
        score += 0.05

    probability = sigmoid(score)
    risk_strength = (
        max(0.0, age - 45) / 55
        + max(0.0, bmi - 30) / 30
        + hypertension * 0.25
        + heart_disease * 0.20
    )

    if hba1c >= 6.5:
        probability = max(probability, sigmoid((hba1c - 6.1) * 2.2 + max(0.0, glucose - 90) / 160 + risk_strength))
    if glucose >= 200:
        probability = max(probability, sigmoid((glucose - 185) / 18 + max(0.0, hba1c - 5.7) * 0.4 + risk_strength))
    if 5.7 <= hba1c < 6.5 and 100 <= glucose < 126:
        probability = max(probability, sigmoid(-2.0 + (hba1c - 5.7) * 1.1 + (glucose - 100) / 28 + risk_strength))
    if glucose >= 126 and (age >= 45 or bmi >= 30 or hypertension or heart_disease):
        probability = max(probability, sigmoid((glucose - 118) / 34 + risk_strength))
    if hba1c >= 5.7 and sum([age >= 45, bmi >= 30, bool(hypertension), bool(heart_disease)]) >= 2:
        probability = max(probability, sigmoid((hba1c - 5.45) * 1.8 + risk_strength))

    return min(max(probability, 0.01), 0.99)


def combine_probabilities(model_probability: float, clinical_probability_value: float) -> float:
    if model_probability > clinical_probability_value:
        return min(0.99, clinical_probability_value + (model_probability - clinical_probability_value) * 0.35)
    return clinical_probability_value


@app.get("/")
def root() -> dict:
    return {"service": "HealthTrust ML Service", "status": "ok"}


@app.post("/predict")
def predict(payload: DiabetesInput) -> dict:
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    validation_errors = validate_payload(payload)
    if validation_errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "One or more inputs are outside the realistic range.",
                "fields": validation_errors,
            },
        )

    values = payload_values(payload)
    features = pd.DataFrame(
        [
            {
                "gender": values["gender"],
                "age": values["age"],
                "hypertension": values["hypertension"],
                "heart_disease": values["heart_disease"],
                "smoking_history": values["smoking_history"],
                "bmi": values["bmi"],
                "HbA1c_level": values["HbA1c_level"],
                "blood_glucose_level": values["blood_glucose_level"],
            }
        ]
    )

    model_probability = float(model.predict_proba(features)[0][1])
    clinical_probability_value = clinical_probability(values)
    probability = combine_probabilities(model_probability, clinical_probability_value)
    prediction = int(probability >= 0.5)

    return {
        "prediction": prediction,
        "probability": probability,
        "modelProbability": model_probability,
        "clinicalProbability": clinical_probability_value,
    }
