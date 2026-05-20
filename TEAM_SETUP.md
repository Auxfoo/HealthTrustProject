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
- A real Sepolia RPC URL from Alchemy, Infura, or another provider

## 2. Create Environment Files

From the project root:

```powershell
copy backend\.env.example backend\.env
copy blockchain\.env.example blockchain\.env
copy frontend\.env.example frontend\.env
```

Fill in the real values. Do not commit `.env` files.

Important environment notes:

- `backend\.env` and `blockchain\.env` both need a real `SEPOLIA_RPC_URL` for reliable demos.
- `backend\.env` `CONTRACT_ADDRESS` must match `shared\contractConfig.js`.
- The backend has a read-only fallback if `SEPOLIA_RPC_URL` still contains `your_api_key`, but deploys and server-side proxy writes require a real RPC URL.

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

If `py -3` is not available, use `python -m venv .venv`.

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

Latest known result, verified on 2026-05-21:

```text
{'prediction': 0, 'probability': 0.08}
```

## 9. Manual Browser Test Checklist

Use separate MetaMask accounts for patient, doctor, and institution admin.

1. Institution admin registers and creates an institution.
2. Doctor registers and registers the MetaMask encryption public key.
   - If the doctor chooses an institution during signup, confirm an automatic membership request is created.
3. Patient registers and uploads a sample PDF from `sample_records`.
4. Confirm the patient upload status shows encryption, IPFS upload, MetaMask transaction, metadata save, and success/error.
5. Patient grants the doctor access from the record list using the Manage Access modal.
6. Doctor opens Records and clicks View. The record should decrypt/download.
7. Patient revokes doctor access and confirms the key envelope disappears.
8. Patient grants institution access from the same record.
9. Institution admin checks Shared records and the doctor key count.
10. Doctor requests membership in the institution.
11. Confirm the same institution does not appear again in the doctor's membership dropdown while a request is pending or approved.
12. Admin approves the doctor from Doctor Requests.
13. Patient uses Share keys if a newly added institution doctor needs access to an already shared record.
14. Doctor adds a note and sends a care document.
15. Patient checks Notes and Documents and downloads the branded care-document PDF.
16. Patient exports a branded audit-report PDF.
17. Institution admin exports a branded institution audit-report PDF.
18. Doctor views `sample_diabetes_vitals.pdf` and confirms prediction auto-fill.
19. Doctor checks the Emergency dropdown and confirms records already accessible to the doctor are hidden.
20. Doctor runs prediction and checks History.
21. Admin removes doctor and doctor checks Notifications.
22. Check Important/Emergency flags, Notifications, and the Security Model tab.

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

| Evidence                         | Location                                        | Status     |
| -------------------------------- | ----------------------------------------------- | ---------- |
| Login/register screenshot        | `docs\screenshots\01-login-register.png`        | To capture |
| Patient dashboard screenshot     | `docs\screenshots\02-patient-dashboard.png`     | To capture |
| Patient upload/status screenshot | `docs\screenshots\03-patient-upload.png`        | To capture |
| Access grant/revoke modal        | `docs\screenshots\04-access-modal.png`          | To capture |
| Doctor records/history screenshot | `docs\screenshots\05-doctor-records.png`       | To capture |
| Prediction result screenshot     | `docs\screenshots\06-prediction-result.png`     | To capture |
| Institution dashboard screenshot | `docs\screenshots\07-institution-dashboard.png` | To capture |
| Notifications screenshot         | `docs\screenshots\08-notifications.png`         | Optional   |
| Security model screenshot        | `docs\screenshots\09-security-model.png`        | Optional   |
| Exported PDF report screenshot   | `docs\screenshots\10-exported-pdf-report.png`   | Optional   |
| Manual system test results       | `test\system\system-test-cases.md`              | To execute |
| Usability participant notes      | `test\usability\usability-test-plan.md`         | To execute |

Use fake sample records only. Do not capture private keys, real medical data, or secret environment values.

## Current Prototype Features

- Patient: encrypted upload with persistent status indicator, record metadata, archive, important flag, emergency-visible flag, grant/revoke doctor access, grant/revoke institution access, resend/share keys, access request approval, doctor notes, care documents with branded PDF export, branded audit PDF export, notifications, audit trail, and Security Model tab.
- Doctor: accessible records, MetaMask AES key decryption, emergency access request dropdown that hides already accessible records, PDF prediction auto-fill, prediction result/risk meter, notes/documents/membership histories, care documents, prediction history, duplicate-safe membership requests, automatic membership request from registration when an institution is selected, notifications, and Security Model tab.
- Institution admin: institution registration, doctor membership approvals, manual doctor management, shared-record overview, key-count visibility, analytics, audit timeline, branded institution audit PDF export, notifications, and Security Model tab.

Remember: Sepolia is a testnet. Revocation stops future authorized access but cannot erase copies that were already downloaded or decrypted.

## 12. Local Demo Reset Commands

Use this when you need the same MetaMask accounts to register again locally. This clears PostgreSQL app data only; it does not delete MetaMask accounts or Sepolia/on-chain records.

Clear registered profiles only:

```powershell
cd backend
"DELETE FROM users;" | npx prisma db execute --schema .\prisma\schema.prisma --stdin
```

Clear local workflow/demo data:

```powershell
cd backend
@"
DELETE FROM notifications;
DELETE FROM institution_join_requests;
DELETE FROM access_requests;
DELETE FROM record_keys;
DELETE FROM doctor_notes;
DELETE FROM doctor_documents;
DELETE FROM prediction_history;
DELETE FROM record_metadata;
DELETE FROM institutions;
DELETE FROM users;
"@ | npx prisma db execute --schema .\prisma\schema.prisma --stdin
```
