from pathlib import Path

import joblib
import numpy as np
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
    Pregnancies: int
    Glucose: int
    BloodPressure: int
    SkinThickness: int
    Insulin: int
    BMI: float
    DiabetesPedigreeFunction: float
    Age: int


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

    features = np.array(
        [[
            payload.Pregnancies,
            payload.Glucose,
            payload.BloodPressure,
            payload.SkinThickness,
            payload.Insulin,
            payload.BMI,
            payload.DiabetesPedigreeFunction,
            payload.Age,
        ]]
    )

    prediction = int(model.predict(features)[0])
    probability = float(model.predict_proba(features)[0][1])

    return {"prediction": prediction, "probability": probability}
