# Unit Testing Results

Date: 2026-05-28

## How To Run

Backend wallet authentication tests:

```powershell
cd backend
npm test
```

Smart contract unit tests:

```powershell
cd blockchain
npm test
```

Frontend build/component validation:

```powershell
cd frontend
npm run build
```

ML training validation:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

ML direct prediction smoke test:

```powershell
cd ml_service
@'
import main
main.load_model()
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
print(main.predict(payload))
'@ | .\.venv\Scripts\python.exe -
```

## Latest Results

| Area | Command | Result |
| --- | --- | --- |
| Backend wallet authentication | `cd backend && npm test` | PASS |
| Smart contract access control | `cd blockchain && npm test` | PASS |
| Frontend build validation | `cd frontend && npm run build` | PASS |
| ML model training | `cd ml_service && python train.py` | PASS |
| ML direct prediction | Import `main.py` and call `main.predict(...)` | PASS |

All results verified on 2026-05-28.

## Backend Unit Test Summary

| Test | Result |
| --- | --- |
| Wallet auth accepts a fresh matching signature | PASS |
| Wallet auth rejects mismatched actions | PASS |
| Wallet auth accepts a signed reusable session | PASS |
| Wallet auth rejects expired sessions | PASS |

Total backend tests: 4 passed, 0 failed.

## Smart Contract Unit Test Summary

| Test | Result |
| --- | --- |
| Grants and revokes direct doctor access per record | PASS |
| Allows institution doctors to use institution-level access | PASS |
| Lets a clinician create a patient-owned record | PASS |

Total blockchain tests: 3 passed, 0 failed.

## ML Test Summary

Training accuracy:

```text
0.9689
```

Prediction smoke test input:

```json
{
  "gender": "Female",
  "age": 54,
  "hypertension": 0,
  "heart_disease": 0,
  "smoking_history": "never",
  "bmi": 27.32,
  "HbA1c_level": 6.6,
  "blood_glucose_level": 140
}
```

Prediction output:

```json
{
  "prediction": 0,
  "probability": 0.08
}
```

## Notes

The frontend build passed. Vite reported a chunk-size warning because the generated JavaScript bundle is larger than 500 kB. This is a performance warning, not a functional failure.

The current frontend build covers patient upload status, Important/Emergency flags, notifications, doctor history rows, the access modal key icon, institution shared-key counts, duplicate-safe institution request UI, emergency dropdown filtering, and branded PDF report generation imports. These are validated by build/import success only; visual confirmation still belongs in system/usability testing.

Additional components validated by the 2026-05-28 build:

- Full Kurdish/English bilingual support across Register, Doctor Notes form, Doctor Documents form, and all dashboard tabs.
- Blood type select in registration and patient profile (A+, A-, B+, B-, AB+, AB-, O+, O-).
- Patient Notes tab section header and `formatLabel()` status formatting (Reviewed / Follow Up / Urgent).
- Patient Documents tab section header.
- Audit PDF generation skips Record # prefix for notification rows (null recordId guard).
- Prediction history backend query returns all records without a 50-record cap.
- `loadRecords()` in PatientDashboard wrapped in try/catch for error handling.
- Wallet addresses in doctor documents history and prediction history wrapped in `<bdi dir="ltr">` for RTL layout.
- ServiceStatus reads `VITE_ML_URL` env var and performs a live JSON-RPC check for Sepolia status.
