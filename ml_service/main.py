from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"

model = None

FEATURE_COLUMNS = [
    "gender",
    "age",
    "hypertension",
    "heart_disease",
    "smoking_history",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
]


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
    model_config = ConfigDict(extra="forbid")

    gender: str
    age: float
    hypertension: int
    heart_disease: int
    smoking_history: str
    bmi: float
    HbA1c_level: float
    blood_glucose_level: int


def payload_values(payload: DiabetesInput) -> dict:
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    return payload.dict()


@app.get("/")
def root() -> dict:
    return {"service": "HealthTrust ML Service", "status": "ok"}


@app.post("/predict")
def predict(payload: DiabetesInput) -> dict:
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    values = payload_values(payload)
    features = pd.DataFrame([{field: values[field] for field in FEATURE_COLUMNS}], columns=FEATURE_COLUMNS)

    probability = float(model.predict_proba(features)[0][1])
    prediction = int(model.predict(features)[0])

    return {
        "prediction": prediction,
        "probability": probability,
    }
