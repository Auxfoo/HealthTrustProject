import joblib

import main


def run_smoke_test() -> dict:
    main.model = joblib.load(main.MODEL_PATH)
    payload = main.DiabetesInput(
        gender="Female",
        age=54,
        hypertension=0,
        heart_disease=0,
        smoking_history="never",
        bmi=27.32,
        HbA1c_level=6.6,
        blood_glucose_level=140,
    )
    return main.predict(payload)


if __name__ == "__main__":
    print(run_smoke_test())
