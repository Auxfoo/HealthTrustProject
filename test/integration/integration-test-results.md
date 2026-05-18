# Integration Testing Results

Date: 2026-05-19

Integration testing checks whether separate parts of HealthTrust work together correctly.

## How To Run Automated Integration Checks

Backend routes and wallet auth:

```powershell
cd backend
npm test
```

Smart contract with local Hardhat chain:

```powershell
cd blockchain
npm test
```

Frontend integration/build check:

```powershell
cd frontend
npm run build
```

ML pipeline:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

ML prediction logic:

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

## Latest Automated Results

| Integrated components | Check performed | Result |
| --- | --- | --- |
| Backend authentication middleware and protected routes | `npm test` in `backend` | PASS |
| Smart contract and Hardhat local chain | `npm test` in `blockchain` | PASS |
| React frontend and shared contract config imports | `npm run build` in `frontend` | PASS |
| ML training pipeline and saved model artifact | `train.py` created `model.pkl` | PASS |
| FastAPI prediction logic and trained model | Direct call to `main.predict(...)` | PASS |

## Covered Behavior

| Behavior | Evidence |
| --- | --- |
| Wallet signatures protect backend routes | Backend auth tests passed. |
| Doctor access can be granted and revoked per record | Blockchain tests passed. |
| Institution-level access works for institution doctors | Blockchain tests passed. |
| Contract supports clinician-created patient-owned records | Blockchain tests passed. |
| Frontend compiles with current patient, doctor, institution, modal, and prediction UI | Frontend build passed. |
| ML service accepts the current diabetes prediction dataset fields | Direct prediction returned valid JSON. |

## Browser Integration Checks

These require the app running and MetaMask available.

Run services:

```powershell
cd backend
node server.js
```

```powershell
cd ml_service
.\.venv\Scripts\activate
uvicorn main:app --reload
```

```powershell
cd frontend
npm start
```

Then test:

| Workflow | Expected result |
| --- | --- |
| Patient uploads sample PDF | Encrypted file is pinned and record appears. |
| Patient grants doctor access | Doctor sees record after key envelope exists. |
| Doctor clicks View | MetaMask decrypts key envelope and file downloads. |
| Patient grants institution access | Institution admin sees record in Shared tab. |
| New doctor joins institution | Patient must Share keys before that doctor can decrypt old shared records. |
| Admin removes doctor | Doctor receives notification and loses institution-based access. |
| Doctor sends note/document | Patient sees note/document content. |
| Doctor runs prediction | Result and history update. |

## Not Fully Automated

These workflows require real browser/MetaMask interaction:

- Sepolia transaction confirmations
- Pinata upload using real API keys
- Multi-wallet role testing
- Real decrypt/download using MetaMask
- Usability testing with participants
