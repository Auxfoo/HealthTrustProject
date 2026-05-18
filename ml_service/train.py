from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "diabetes.csv"
MODEL_PATH = BASE_DIR / "model.pkl"


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            "diabetes.csv was not found. Download it from Kaggle and place it in ml_service/diabetes.csv."
        )

    data = pd.read_csv(DATASET_PATH)
    x = data.drop("Outcome", axis=1)
    y = data["Outcome"]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Accuracy: {accuracy:.4f}")

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
