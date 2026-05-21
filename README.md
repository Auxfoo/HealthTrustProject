# HealthTrust: Decentralized Medical Records with Predictive Analytics

HealthTrust is a prototype medical record sharing system for patients, doctors, and healthcare institutions. Patients encrypt records in the browser, upload only encrypted files to IPFS through Pinata, and store record references and permissions on a Sepolia smart contract. Doctors can view records only after the patient grants access and shares the encrypted AES key envelope. Institution admins can manage doctors and see records granted to their institution.

The project also includes a FastAPI diabetes prediction service. The prediction feature is not a diagnosis; it is a prototype decision-support feature trained from `diabetes_prediction_dataset.csv`.

## Problem Statement

Healthcare records in the Kurdistan region are often fragmented between hospitals, clinics, and individual doctors. Patients may need to carry paper reports, repeat laboratory tests, or manually send files between providers. Traditional centralized systems can improve storage, but they still depend on one organization controlling access, audit logs, and server security. If records are changed, deleted, or shared without clear permission history, patients and doctors may not have a trustworthy record of what happened.

HealthTrust addresses this problem by giving patients a secure digital workspace where medical records are encrypted before upload, stored off-chain on IPFS, and referenced by blockchain permissions. The blockchain layer provides transparent access history, while doctors and institutions receive access only when the patient grants it.

## Objectives

- Build secure patient-controlled medical record sharing.
- Store encrypted medical files off-chain using IPFS/Pinata instead of storing files on blockchain.
- Store record CIDs, access permissions, institutions, and audit events on a Sepolia smart contract.
- Support doctor and institution access workflows, including membership requests and revocation.
- Provide a diabetes risk prediction prototype using a separate FastAPI ML service.
- Document privacy limits clearly, including revocation limits and the non-diagnostic nature of ML output.

## Scope

Included in this prototype:

- React frontend for patient, doctor, and institution admin roles.
- Sepolia smart contract for CIDs, permissions, institutions, memberships, and audit events.
- Client-side encryption before upload.
- IPFS/Pinata encrypted file storage.
- PostgreSQL/Prisma backend for profiles, metadata, encrypted key envelopes, notes, documents, requests, notifications, and prediction history.
- Diabetes risk prediction prototype using `diabetes_prediction_dataset.csv`.

Excluded from this prototype:

- Production hospital deployment.
- Clinical diagnosis or certified medical decision-making.
- Real institution KYC/verification.
- Legal compliance certification.
- Formal smart contract/security audit.
- Mainnet deployment and production recovery procedures.

## Methodology

1. Requirement analysis: identify patient, doctor, and institution workflows for secure medical record sharing.
2. System design: separate sensitive file storage, blockchain permissions, backend workflow data, and ML prediction into focused components.
3. Implementation: build the Solidity contract, Express API, Prisma schema, React dashboards, client-side encryption, IPFS upload, and FastAPI ML service.
4. Testing: run backend auth tests, smart contract tests, frontend build checks, ML training checks, and manual browser workflow tests.
5. Evaluation: review security limitations, usability test plans, role workflows, and prototype readiness for demonstration.

## Current Features

| Role | Can do |
| --- | --- |
| Patient | Register profile, upload encrypted PDF/image records with visible upload status, add metadata, archive records, mark important and emergency-visible records, grant/revoke doctor access, grant/revoke institution access, resend/share keys, approve/reject access requests, view doctor notes, view care documents, download branded care-document PDFs, export branded audit-report PDFs, see notifications, view audit history, and review the security model. |
| Doctor | Register profile and MetaMask encryption public key, choose an institution during signup to create an automatic membership request, view only accessible records with matching key envelopes, decrypt/download original records, request emergency access from an emergency-record dropdown that hides already accessible records, auto-fill diabetes prediction inputs from readable diabetes vitals PDFs, run predictions, view prediction history, add notes to records, send care documents linked to records, request institution membership, and see notifications. |
| Institution admin | Register a hospital or clinic, approve/reject doctor membership requests, manually add/remove doctors, notify removed doctors, view records granted to the institution, inspect shared-key counts, review analytics/audit history, export branded institution audit-report PDFs, see notifications, and review the security model. |

## Architecture

```text
React Frontend
  | MetaMask, ethers.js, client-side AES encryption
  | REST API
  v
Node/Express Backend
  | Prisma -> PostgreSQL
  | Pinata -> IPFS encrypted file storage
  | axios  -> FastAPI ML service
  | ethers -> contract read/proxy routes
  v
Sepolia Smart Contract
  | record CIDs, permissions, institutions, doctor membership, audit events

FastAPI ML Service
  | scikit-learn RandomForestClassifier
  v
Diabetes prediction and probability
```

## Prerequisites

- Node.js v18+
- Python 3.10+
- PostgreSQL v14+
- MetaMask browser extension
- Git
- Sepolia test ETH for wallets that deploy or send transactions
- Pinata API key and secret

## Environment Files

From the project root:

```powershell
copy backend\.env.example backend\.env
copy blockchain\.env.example blockchain\.env
copy frontend\.env.example frontend\.env
```

Fill in real values. Do not commit `.env` files.

Backend `.env` needs:

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

Blockchain `.env` needs:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key
PRIVATE_KEY=your_test_wallet_private_key
```

Frontend `.env` needs:

```env
VITE_API_URL=http://localhost:5000
```

Use real Sepolia RPC URLs for demos. The backend can fall back to a public Sepolia provider for some read-only record lookups if `SEPOLIA_RPC_URL` is still the placeholder value, but deploys, server-side proxy writes, and reliable demos should use a real Alchemy/Infura/custom RPC URL.

## Install

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

## Database

```powershell
createdb -U postgres healthtrust

cd backend
npx prisma generate
npx prisma migrate dev --name init
```

For an existing cloned database setup, `npx prisma migrate deploy` is also fine.

## ML Dataset

Download the Kaggle diabetes prediction dataset:

```text
https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset
```

Place the file here:

```text
ml_service\diabetes_prediction_dataset.csv
```

The model expects these fields:

```text
gender, age, hypertension, heart_disease, smoking_history, bmi, HbA1c_level, blood_glucose_level
```

Train the model:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

This creates `ml_service\model.pkl`.

## Smart Contract

Compile and deploy:

```powershell
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment:

- Copy the deployed address into `backend\.env` as `CONTRACT_ADDRESS`.
- The deploy script updates `shared\contractConfig.js`, which the frontend imports.
- If contract code changes, redeploy before browser testing.

## Run The App

Use three terminals.

Terminal 1:

```powershell
cd backend
node server.js
```

Terminal 2:

```powershell
cd ml_service
.\.venv\Scripts\activate
uvicorn main:app --reload
```

Terminal 3:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:5173
```

## Sample Records

Fake test PDFs are available in `sample_records`:

- `sample_diabetes_vitals.pdf`
- `sample_blood_test_report.pdf`
- `sample_radiology_report.pdf`
- `sample_prescription.pdf`
- `sample_discharge_summary.pdf`
- `sample_clinic_visit_note.pdf`

Use `sample_diabetes_vitals.pdf` to test doctor prediction auto-fill. Auto-fill works for readable text PDFs, not scanned image-only PDFs.

## Screenshots For Graduation Report

Final screenshot evidence is stored in `docs/screenshots` with these filenames:

| Screenshot | Filename |
| --- | --- |
| Login/connect wallet screen | `docs/screenshots/01-login-register.png` |
| Patient dashboard | `docs/screenshots/02-patient-dashboard.png` |
| Patient registration and upload flow, including upload status and uploaded record list | `docs/screenshots/03-patient-upload.png` |
| Access grant/revoke modal showing doctor and institution permission controls | `docs/screenshots/04-access-modal.png` |
| Doctor dashboard with accessible records, preview/view action, prediction form, and notes/documents history | `docs/screenshots/05-doctor-records.png` |
| Diabetes prediction result with probability bar and contributing values | `docs/screenshots/06-prediction-result.png` |
| Institution dashboard with doctors, shared records, shared-key count, and Doctor Requests | `docs/screenshots/07-institution-dashboard.png` |
| Notifications tab with mark-read action | `docs/screenshots/08-notifications.png` |
| Security model tab | `docs/screenshots/09-security-model.png` |

Use fake sample records and Sepolia test wallets only. Do not include private keys, real patient data, or real medical files in screenshots.

Suggested report mapping:

| Figure | What to show |
| --- | --- |
| Figure 4.1 | Patient wallet/registration, upload details, upload status indicator, and record list after upload. |
| Figure 4.2 | Doctor dashboard with accessible records, record view/decrypt action, prediction form, and notes/documents history. |
| Figure 4.3 | Institution admin dashboard with doctors, Doctor Requests, and Shared records. |
| Figure 4.4 | Permission lifecycle from upload to Manage Access, grant access, key envelope visibility, revoke access, and removed access state. |

## Run Tests

Automated checks:

Latest automated check date: 2026-05-21.

```powershell
cd backend
npm test
```

```powershell
cd ..\blockchain
npm test
```

```powershell
cd ..\frontend
npm run build
```

```powershell
cd ..\ml_service
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

Expected output shape:

```text
{'prediction': 0, 'probability': 0.08}
```

Latest local automated results:

| Check | Result |
| --- | --- |
| Backend tests | PASS, 4 passed |
| Blockchain tests | PASS, 3 passing |
| Frontend production build | PASS |
| ML training | PASS, accuracy 0.9689 |
| ML prediction smoke test | PASS, prediction 0, probability 0.08 |

Testing evidence and manual test cases are stored in `test`.

## Manual Test Results

Manual browser tests require MetaMask, Sepolia transactions, IPFS upload, and multiple wallets. Record the final results in:

```text
test\system\system-test-cases.md
```

For final submission, each manual test case should be updated from `Manual` to `PASS` or `FAIL`, with date and short notes.

## Report Exports

HealthTrust generates polished PDF reports for demo evidence:

- Patient care-document PDFs include the HealthTrust header, visual accent bands, metadata cards, clinical content, and storage reference sections.
- Patient audit PDFs summarize the patient's access and workflow timeline.
- Institution audit PDFs summarize membership, shared-record activity, operational counts, and security notes.

Original uploaded medical PDFs/images are downloaded unchanged after decryption, because those are the actual medical files uploaded by the patient.

## Local Demo Reset

To let the same MetaMask wallets register again, clear local PostgreSQL workflow data. This does not delete MetaMask accounts and does not remove Sepolia/on-chain events.

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

If only the local registered profiles should be cleared:

```powershell
cd backend
"DELETE FROM users;" | npx prisma db execute --schema .\prisma\schema.prisma --stdin
```

## Manual Browser Test Flow

Use at least three MetaMask accounts: one patient, one doctor, and one institution admin. Each account needs Sepolia ETH for transactions.

1. Register institution admin and create an institution.
2. Register doctor and make sure the doctor registers a MetaMask encryption public key.
3. Register patient and upload one sample PDF.
4. Patient opens the record access modal and grants the doctor access.
5. Doctor opens Records and clicks View. The file should decrypt/download.
6. Patient grants institution access to the same record.
7. Admin checks Shared records.
8. Doctor requests institution membership.
9. Admin approves the doctor in Doctor Requests.
10. Patient uses Share keys if a newly added institution doctor needs a key envelope.
11. Doctor adds a note and sends a care document linked to the record.
12. Patient confirms Notes and Documents tabs show content.
13. Patient downloads the branded care-document PDF.
14. Patient exports a branded audit-report PDF.
15. Doctor views `sample_diabetes_vitals.pdf`; prediction fields should auto-fill.
16. Doctor submits prediction and confirms History is updated.
17. Doctor checks the emergency request dropdown and confirms already accessible records are hidden.
18. Admin removes the doctor and doctor receives a notification.

## Test Evidence Folder

```text
test/
  README.md
  unit/unit-test-results.md
  integration/integration-test-results.md
  system/system-test-cases.md
  usability/usability-test-plan.md
```

## Known Limitations

- Sepolia is a testnet; this is not production-ready.
- Revocation blocks future authorized access but cannot erase files already decrypted or downloaded.
- A doctor with legitimate access can copy decrypted content.
- Wallet loss can make records or key-sharing material unrecoverable.
- Pinata/IPFS gateway availability affects retrieval.
- Institution admins are self-registered; there is no real-world KYC.
- The ML result is not a clinical diagnosis.
- No formal security audit has been performed.
- Local database resets do not reset smart-contract state on Sepolia; redeploy the contract for a completely clean on-chain demo.

## References

- Ethereum documentation: https://ethereum.org/developers/docs/
- Sepolia testnet: https://ethereum.org/developers/docs/networks/#sepolia
- IPFS documentation: https://docs.ipfs.tech/
- Pinata documentation: https://docs.pinata.cloud/
- MetaMask developer documentation: https://docs.metamask.io/
- FastAPI documentation: https://fastapi.tiangolo.com/
- scikit-learn RandomForestClassifier: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- Diabetes prediction dataset: https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset

## Conclusion And Future Work

HealthTrust demonstrates a working prototype for patient-controlled medical record sharing. It combines client-side encryption, IPFS storage, Sepolia smart-contract permissions, role-based healthcare workflows, and diabetes risk prediction. The system shows how blockchain can be used for transparency and access history without storing private files on-chain.

Future work includes verified institution onboarding, stronger wallet/key recovery, more disease prediction models, OCR for scanned PDFs, mobile support, formal security auditing, production compliance review, and deployment planning with real healthcare stakeholders.
