from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import AsyncIterator

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, field_validator

BASE_DIR = Path(__file__).resolve().parent
_model_path_env = os.getenv("MODEL_PATH")
MODEL_PATH = Path(_model_path_env).expanduser() if _model_path_env else BASE_DIR / "model.pkl"
if not MODEL_PATH.is_absolute():
    MODEL_PATH = BASE_DIR / MODEL_PATH

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

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        allowed = {"Female", "Male", "Other"}
        if value not in allowed:
            raise ValueError("gender must be Female, Male, or Other")
        return value

    @field_validator("smoking_history")
    @classmethod
    def validate_smoking_history(cls, value: str) -> str:
        allowed = {"never", "No Info", "current", "former", "ever", "not current"}
        if value not in allowed:
            raise ValueError("smoking_history is not supported")
        return value

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: float) -> float:
        if value < 0 or value > 120:
            raise ValueError("age must be between 0 and 120")
        return value

    @field_validator("hypertension", "heart_disease")
    @classmethod
    def validate_binary_flags(cls, value: int) -> int:
        if value not in {0, 1}:
            raise ValueError("hypertension and heart_disease must be 0 or 1")
        return value

    @field_validator("bmi")
    @classmethod
    def validate_bmi(cls, value: float) -> float:
        if value < 10 or value > 80:
            raise ValueError("bmi must be between 10 and 80")
        return value

    @field_validator("HbA1c_level")
    @classmethod
    def validate_hba1c(cls, value: float) -> float:
        if value < 3.0 or value > 15.0:
            raise ValueError("HbA1c_level must be between 3.0 and 15.0")
        return value

    @field_validator("blood_glucose_level")
    @classmethod
    def validate_blood_glucose(cls, value: int) -> int:
        if value < 40 or value > 600:
            raise ValueError("blood_glucose_level must be between 40 and 600")
        return value


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
