from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "diabetes_prediction_dataset.csv"
MODEL_PATH = BASE_DIR / "model.pkl"

GENDER_CATEGORIES = ["Female", "Male", "Other"]
SMOKING_CATEGORIES = ["No Info", "current", "ever", "former", "never", "not current"]
CATEGORICAL_FEATURES = ["gender", "smoking_history"]
NUMERIC_FEATURES = [
    "age",
    "hypertension",
    "heart_disease",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
]


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError("diabetes_prediction_dataset.csv was not found. Place it in ml_service/.")

    data = pd.read_csv(DATASET_PATH).drop_duplicates()
    x = data.drop("diabetes", axis=1)
    y = data["diabetes"]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    categories=[GENDER_CATEGORIES, SMOKING_CATEGORIES],
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
                CATEGORICAL_FEATURES,
            ),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ]
    )

    monotonic_constraints = [0] * (len(GENDER_CATEGORIES) + len(SMOKING_CATEGORIES)) + [1] * len(NUMERIC_FEATURES)

    base_model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                HistGradientBoostingClassifier(
                    max_iter=350,
                    learning_rate=0.05,
                    l2_regularization=0.1,
                    monotonic_cst=monotonic_constraints,
                    random_state=42,
                ),
            ),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    model = CalibratedClassifierCV(base_model, method="isotonic", cv=5)
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
