# HealthTrust Team Setup Checklist

Use this when a teammate clones the repository or when you need to rebuild the project from scratch.

## 1. Install Tools

- Node.js v18+
- Python 3.10+
- PostgreSQL v14+
- MetaMask
- Git
- Sepolia test ETH
- Pinata API key and secret

## 2. Create Environment Files

From the project root:

```powershell
copy backend\.env.example backend\.env
copy blockchain\.env.example blockchain\.env
copy frontend\.env.example frontend\.env
```

Fill in the real values. Do not commit `.env` files.

## 3. Install Dependencies

```powershell
cd blockchain
npm install

cd ..\backend
npm install

cd ..\frontend
npm install

cd ..\ml_service
py -3 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## 4. Prepare PostgreSQL

```powershell
createdb -U postgres healthtrust

cd backend
npx prisma generate
npx prisma migrate dev --name init
```

For a cloned environment that already has migrations, this also works:

```powershell
npx prisma migrate deploy
```

## 5. Prepare ML Dataset

Download `diabetes_prediction_dataset.csv` from:

```text
https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset
```

Place it at:

```text
ml_service\diabetes_prediction_dataset.csv
```

Train the model:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

The prediction model expects:

```text
gender, age, hypertension, heart_disease, smoking_history, bmi, HbA1c_level, blood_glucose_level
```

## 6. Deploy Contract

```powershell
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment:

- Copy the deployed contract address into `backend\.env` as `CONTRACT_ADDRESS`.
- Confirm `shared\contractConfig.js` was updated by the deploy script.
- If the contract changes, redeploy before testing browser workflows.

## 7. Run The App

Use three terminals.

Backend:

```powershell
cd backend
node server.js
```

ML service:

```powershell
cd ml_service
.\.venv\Scripts\activate
uvicorn main:app --reload
```

Frontend:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:5173
```

## 8. Run Automated Tests

Backend wallet/auth tests:

```powershell
cd backend
npm test
```

Smart contract tests:

```powershell
cd blockchain
npm test
```

Frontend build check:

```powershell
cd frontend
npm run build
```

ML train check:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

ML prediction smoke test:

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

Latest known result:

```text
{'prediction': 0, 'probability': 0.08}
```

## 9. Manual Browser Test Checklist

Use separate MetaMask accounts for patient, doctor, and institution admin.

1. Institution admin registers and creates an institution.
2. Doctor registers and registers the MetaMask encryption public key.
3. Patient registers and uploads a sample PDF from `sample_records`.
4. Patient grants the doctor access from the record list.
5. Doctor opens Records and clicks View. The record should decrypt/download.
6. Patient grants institution access from the same record.
7. Institution admin checks Shared records.
8. Doctor requests membership in the institution.
9. Admin approves the doctor from Doctor Requests.
10. Patient uses Share keys if a newly added institution doctor needs access to an already shared record.
11. Doctor adds a note and sends a care document.
12. Patient checks Notes and Documents.
13. Doctor views `sample_diabetes_vitals.pdf` and confirms prediction auto-fill.
14. Doctor runs prediction and checks History.
15. Admin removes doctor and doctor checks Notifications.

## 10. Test Evidence Files

Testing evidence and manual test cases are kept here:

```text
test\README.md
test\unit\unit-test-results.md
test\integration\integration-test-results.md
test\system\system-test-cases.md
test\usability\usability-test-plan.md
```

## 11. Graduation Evidence Checklist

Before final submission, collect the following evidence:

| Evidence | Location | Status |
| --- | --- | --- |
| Login/register screenshot | `docs\screenshots\01-login-register.png` | To capture |
| Patient dashboard screenshot | `docs\screenshots\02-patient-dashboard.png` | To capture |
| Patient upload screenshot | `docs\screenshots\03-patient-upload.png` | To capture |
| Access modal screenshot | `docs\screenshots\04-access-modal.png` | To capture |
| Doctor records screenshot | `docs\screenshots\05-doctor-records.png` | To capture |
| Prediction result screenshot | `docs\screenshots\06-prediction-result.png` | To capture |
| Institution dashboard screenshot | `docs\screenshots\07-institution-dashboard.png` | To capture |
| Manual system test results | `test\system\system-test-cases.md` | To execute |
| Usability participant notes | `test\usability\usability-test-plan.md` | To execute |

Use fake sample records only. Do not capture private keys, real medical data, or secret environment values.

## Current Prototype Features

- Patient: encrypted upload, record metadata, archive, important flag, grant/revoke doctor access, grant/revoke institution access, resend/share keys, doctor notes, care documents, notifications, and audit trail.
- Doctor: accessible records, MetaMask AES key decryption, PDF prediction auto-fill, notes, care documents, prediction history, membership request, and notifications.
- Institution admin: institution registration, doctor membership approvals, manual doctor management, shared-record overview, key-count visibility, and notifications.

Remember: Sepolia is a testnet. Revocation stops future authorized access but cannot erase copies that were already downloaded or decrypted.
