from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import brier_score_loss, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "diabetes_prediction_dataset.csv"
MODEL_PATH = BASE_DIR / "model.pkl"

CATEGORICAL_FEATURES = ["gender", "smoking_history"]
NUMERIC_FEATURES = [
    "age",
    "hypertension",
    "heart_disease",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
]
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
TARGET_COLUMN = "diabetes"


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError("diabetes_prediction_dataset.csv was not found. Place it in ml_service/.")

    data = pd.read_csv(DATASET_PATH).drop_duplicates()
    expected_columns = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing_columns = [column for column in expected_columns if column not in data.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required column(s): {', '.join(missing_columns)}")

    x = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                CATEGORICAL_FEATURES,
            ),
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    probs = model.predict_proba(x_test)[:, 1]

    print(f"Training data : {DATASET_PATH.name}")
    print(f"\n{classification_report(y_test, predictions)}")
    print(f"Brier score   : {brier_score_loss(y_test, probs):.4f}")

    extreme = ((probs < 0.05) | (probs > 0.95)).mean()
    mid = ((probs >= 0.2) & (probs <= 0.8)).mean()
    print("\nProbability distribution check:")
    print(f"  At extremes (<5% or >95%) : {extreme:.1%}")
    print(f"  In mid-range (20%-80%)     : {mid:.1%}")

    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
