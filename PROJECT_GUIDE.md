# HealthTrust Project Guide

This guide is the setup and runbook for HealthTrust. The README explains the app; this file explains how to install, configure, run, test, and reset it locally.

Commands below are written for PowerShell on Windows from the project root:

```text
c:\Users\3arab\code\healthTrust
```

## 1. Prerequisites

Install these before starting:

- Node.js 18 or newer
- Python 3.10 or newer
- PostgreSQL 14 or newer
- Git
- MetaMask browser extension
- Sepolia test ETH for wallets that deploy contracts or send transactions
- Pinata API key and secret
- Sepolia RPC URL from Alchemy, Infura, or another provider

Recommended ports:

| Service | Default URL |
| --- | --- |
| Backend | `http://localhost:5000` |
| ML service | `http://localhost:8000` |
| Frontend | `http://localhost:5173` |
| PostgreSQL | `localhost:5432` |

## 2. Install Dependencies

Install each project area separately:

```powershell
cd blockchain
npm install
```

```powershell
cd ..\backend
npm install
```

```powershell
cd ..\frontend
npm install
```

```powershell
cd ..\ml_service
py -3 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Return to the project root when done:

```powershell
cd ..
```

## 3. Environment Files

Create local environment files from the examples:

```powershell
copy backend\.env.example backend\.env
copy blockchain\.env.example blockchain\.env
copy frontend\.env.example frontend\.env
```

Do not commit `.env` files.

### Backend `.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthtrust?schema=public
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
PRIVATE_KEY=your_backend_wallet_private_key
PORT=5000
ML_SERVICE_URL=http://localhost:8000
```

Notes:

- `DATABASE_URL` must match your local PostgreSQL username, password, host, port, and database.
- `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` are required for encrypted record upload.
- `CONTRACT_ADDRESS` must be replaced after deploying the contract.
- `PRIVATE_KEY` is only for optional backend blockchain proxy routes on Sepolia. Use a test wallet only.
- `ML_SERVICE_URL` should point to the FastAPI service.

### Blockchain `.env`

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
PRIVATE_KEY=your_test_wallet_private_key
```

Use a Sepolia test wallet with test ETH. Never use a mainnet wallet/private key here.

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_ML_URL=http://localhost:8000
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
```

`VITE_SEPOLIA_RPC_URL` is used by the frontend service-status check. For reliable demos, use the same provider family as backend/blockchain `SEPOLIA_RPC_URL`.

## 4. Database Setup

Create the PostgreSQL database:

```powershell
createdb -U postgres healthtrust
```

Generate the Prisma client and apply migrations:

```powershell
cd backend
npx prisma generate
npx prisma migrate dev
```

For an existing database in a cloned environment, this is also fine:

```powershell
npx prisma migrate deploy
```

Useful Prisma commands:

```powershell
npx prisma studio
```

```powershell
npx prisma db pull
```

## 5. ML Service Setup

The training dataset should be located here:

```text
ml_service\diabetes_prediction_dataset.csv
```

The project expects the Kaggle diabetes prediction dataset:

```text
https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset
```

Expected CSV fields:

```text
gender, age, hypertension, heart_disease, smoking_history, bmi, HbA1c_level, blood_glucose_level, diabetes
```

The prediction API accepts the same fields except the `diabetes` target column.

Train the model:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

Training writes:

```text
ml_service\model.pkl
```

## 6. Smart Contract Setup

Compile the contract:

```powershell
cd blockchain
npx hardhat compile
```

Deploy to Sepolia:

```powershell
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment:

1. Copy the deployed address into `backend\.env` as `CONTRACT_ADDRESS`.
2. Confirm `shared\contractConfig.js` was updated by the deploy script.
3. Restart the backend and frontend if they were already running.

If you change `blockchain/contracts/HealthTrust.sol`, redeploy before testing browser workflows against Sepolia.

## 7. Run The App

Use three terminals.

Terminal 1, backend:

```powershell
cd backend
npm start
```

Expected backend URL:

```text
http://localhost:5000/api/health
```

Terminal 2, ML service:

```powershell
cd ml_service
.\.venv\Scripts\activate
uvicorn main:app --reload
```

Expected ML URL:

```text
http://localhost:8000
```

Terminal 3, frontend:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:5173
```

## 8. First Demo Checklist

Use at least three MetaMask accounts:

- one patient
- one doctor
- one institution admin

Each account that sends transactions needs Sepolia ETH.

Recommended first flow:

1. Connect the institution admin wallet and register a hospital or clinic.
2. Connect the doctor wallet and register as a doctor with an encryption public key.
3. Connect the patient wallet and register as a patient.
4. Upload a fake PDF from `sample_records`.
5. Patient opens Manage Access and grants doctor access.
6. Doctor opens Records and clicks View to decrypt/download the file.
7. Patient grants institution access.
8. Doctor requests institution membership.
9. Institution admin approves the doctor.
10. Patient uses Share keys if a newly added institution doctor needs a key envelope.
11. Doctor adds a note and sends a care document.
12. Patient confirms Notes and Documents show the new items.
13. Doctor runs a diabetes prediction.
14. Patient or admin exports an audit PDF.

## 9. Sample Records

Fake PDFs are stored in:

```text
sample_records\
```

Current files:

```text
diabetes_sample_01_very_low.pdf
diabetes_sample_02_low_normal.pdf
diabetes_sample_03_elevated_glucose.pdf
diabetes_sample_04_prediabetes_mild.pdf
diabetes_sample_05_prediabetes_plus_bmi.pdf
diabetes_sample_06_glucose_126_plus_age.pdf
diabetes_sample_07_prediabetes_risk_factors.pdf
diabetes_sample_08_near_threshold.pdf
diabetes_sample_09_hba1c_threshold.pdf
diabetes_sample_10_glucose_threshold.pdf
diabetes_sample_11_both_thresholds.pdf
diabetes_sample_12_extreme_high.pdf
diabetes_sample_13_elderly_normal.pdf
diabetes_sample_14_low_glucose.pdf
diabetes_sample_15_out_of_range_glucose.pdf
```

Use fake records and Sepolia test wallets only. Do not upload real patient files.

## 10. Automated Checks

Run backend tests:

```powershell
cd backend
npm test
```

Run blockchain tests:

```powershell
cd blockchain
npm test
```

Run frontend production build:

```powershell
cd frontend
npm run build
```

Run ML training:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

Run ML prediction smoke test:

```powershell
cd ml_service
.\.venv\Scripts\python.exe smoke_test.py
```

Expected output shape:

```text
{'prediction': 1, 'probability': 0.5260096618629037}
```

Current automated results and testing evidence live in:

```text
test\
```

Start with `test\unit\unit-test-results.md` for the latest terminal run.

## 11. Manual Browser Tests

Manual tests require MetaMask, Sepolia transactions, IPFS upload, and multiple wallets.

Primary manual workflows:

- patient registration
- doctor registration with encryption public key
- institution admin registration
- encrypted record upload
- direct doctor access grant and revoke
- institution access grant and revoke
- doctor decrypt/download
- key sharing for institution doctors
- access request approval/rejection
- emergency-visible record request
- doctor note creation
- care document creation and patient download
- diabetes prediction and prediction history
- notification read/unread flow
- patient and institution audit PDF export

Record final manual results in:

```text
test\system\system-test-cases.md
```

## 12. Local Demo Reset

This clears local PostgreSQL workflow data. It does not delete MetaMask accounts, IPFS pins, or Sepolia/on-chain events.

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

To clear only local registered profiles:

```powershell
cd backend
"DELETE FROM users;" | npx prisma db execute --schema .\prisma\schema.prisma --stdin
```

For a completely clean on-chain demo, deploy a new contract and update `CONTRACT_ADDRESS` plus `shared\contractConfig.js`.

## 13. Troubleshooting

| Problem | Check |
| --- | --- |
| Backend exits on startup | Verify PostgreSQL is running and `DATABASE_URL` is correct. |
| Upload fails | Verify Pinata credentials in `backend\.env`. |
| Frontend cannot reach API | Verify backend is running on `PORT=5000` and `VITE_API_URL` matches it. |
| ML status is offline | Start `uvicorn main:app --reload` and verify `VITE_ML_URL` / `ML_SERVICE_URL`. |
| MetaMask transaction fails | Confirm wallet is on Sepolia and has test ETH. |
| Contract calls fail | Confirm `CONTRACT_ADDRESS` and `shared\contractConfig.js` point to the deployed contract. |
| Doctor can see permission but cannot decrypt | Confirm an encrypted key envelope exists for that doctor wallet. Use patient Share keys if needed. |
| Institution doctor cannot open older shared record | Patient must share/resend the key envelope after the doctor joins. |
| ML smoke test fails with `ModuleNotFoundError` | Run `.\.venv\Scripts\python.exe smoke_test.py`; do not use global Python for the ML service. |
| Record metadata requests return 401 | Protected record metadata routes now require signed wallet session headers from the frontend. |
| Local reset did not clear records in UI | Sepolia state remains. Redeploy contract for clean on-chain state. |

## 14. Useful Files

| Path | Purpose |
| --- | --- |
| `backend/server.js` | Express entrypoint and route registration. |
| `backend/prisma/schema.prisma` | PostgreSQL schema. |
| `backend/.env.example` | Backend environment template. |
| `blockchain/contracts/HealthTrust.sol` | Smart contract. |
| `blockchain/scripts/deploy.js` | Sepolia deploy script and shared config writer. |
| `blockchain/.env.example` | Blockchain environment template. |
| `frontend/src/App.js` | Main React app routing/state. |
| `frontend/src/pages/PatientDashboard.js` | Patient UI. |
| `frontend/src/pages/DoctorDashboard.js` | Doctor UI. |
| `frontend/src/pages/InstitutionDashboard.js` | Institution admin UI. |
| `frontend/src/components/AccessModal.js` | Grant/revoke and key-sharing UI. |
| `frontend/src/components/PredictionForm.js` | Diabetes prediction form. |
| `frontend/src/utils/encryption.js` | AES file encryption/decryption helpers. |
| `frontend/src/utils/keySharing.js` | MetaMask key-envelope helpers. |
| `frontend/src/utils/pdfReport.js` | Branded PDF report generator. |
| `frontend/.env.example` | Frontend environment template. |
| `ml_service/train.py` | Model training script. |
| `ml_service/main.py` | FastAPI prediction service. |
| `shared/contractConfig.js` | Deployed contract address and ABI for frontend imports. |
| `sample_records/` | Fake PDFs for demo/testing. |
| `docs/screenshots/` | Screenshot evidence for reports. |
| `test/` | Test plans and results. |

## 15. Security Notes

- HealthTrust stores encrypted files in IPFS, not plaintext.
- The backend stores metadata and encrypted key envelopes, not plaintext medical records.
- Sepolia smart-contract events provide transparent permission history.
- Revocation prevents future authorized access but cannot erase files already downloaded.
- Wallet compromise means account compromise.
- This prototype has not had a formal security audit.

