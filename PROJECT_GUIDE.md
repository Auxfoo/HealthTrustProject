# HealthTrust Project Guide

## Abstract

HealthTrust is a prototype decentralized medical record system for patients, doctors, hospitals, and clinics. Patients encrypt records in the browser, upload only encrypted files to IPFS through Pinata, and store record references and permission state on a Sepolia smart contract. Doctors and institution doctors can view a record only when blockchain access and an encrypted AES key envelope are both available. The system also includes a FastAPI diabetes prediction service for non-diagnostic predictive analytics.

## 1. Project Overview

HealthTrust gives patients control over who can access each medical record. The patient uploads a PDF or image, the browser encrypts it with a random AES key, the backend pins the encrypted content to IPFS, and the smart contract stores only the resulting CID and permission state.

The current role workflows are:

| Role | Main workflows |
| --- | --- |
| Patient | Upload encrypted records, edit metadata, archive records, mark important records, grant/revoke doctor access, grant/revoke institution access, share/resend AES key envelopes, view doctor notes, view care documents, download care-document PDFs, view notifications, and view audit history. |
| Doctor | Register encryption public key, view accessible records, decrypt records through MetaMask key envelopes, auto-fill diabetes prediction fields from readable PDFs, run predictions, view prediction history, add notes, send care documents, request institution membership, and view notifications. |
| Institution admin | Register a hospital or clinic, approve/reject doctor membership requests, manually add/remove doctors, notify removed doctors, view records granted to the institution, and inspect shared key counts. |

The project combines React, Node/Express, PostgreSQL/Prisma, Solidity, Sepolia, IPFS/Pinata, FastAPI, and scikit-learn.

## 2. System Architecture

```text
React Frontend
  | MetaMask wallet connection
  | ethers.js contract calls
  | client-side AES encryption/decryption
  | REST API calls
  v
Node.js / Express Backend
  | Prisma
  v
PostgreSQL profiles and workflow metadata

Node.js / Express Backend
  | Pinata REST API
  v
IPFS encrypted file storage

React Frontend and Backend
  | ethers.js
  v
Sepolia Blockchain
  | HealthTrust.sol
  v
Record CIDs, permissions, institutions, doctor membership, audit events

Node.js / Express Backend
  | axios
  v
FastAPI ML Service
  | scikit-learn RandomForestClassifier
  v
Diabetes prediction and probability
```

## 3. Main Data Flows

Patient upload flow: the patient connects MetaMask, chooses a PDF or image, and the browser generates a random AES key. The file is encrypted before upload. The encrypted blob is sent to the backend, pinned to IPFS through Pinata, and returned as a CID. The frontend then calls `addRecord(cid)` on the smart contract.

Patient grants doctor access: the patient opens a record's access modal, enters a doctor wallet, and confirms the smart contract transaction in MetaMask. The frontend also encrypts the record AES key for that doctor using the doctor's registered MetaMask encryption public key. The doctor can view the record only when on-chain access and the key envelope both exist.

Patient grants institution access: the patient chooses an institution from the access modal. The smart contract grants the institution access to that record. The frontend creates encrypted key envelopes for doctors currently in the institution. If a new doctor joins later, the patient can use Share keys to send the AES key envelope to that doctor.

Doctor views and decrypts a record: the doctor opens Records, clicks View, and MetaMask decrypts the key envelope for the connected doctor wallet. The browser uses the decrypted AES key to decrypt and download the IPFS file. The backend and Pinata never receive plaintext.

Doctor notes and care documents: the doctor chooses an accessible record from a dropdown, adds a note, or sends a care document. Patients can see notes and care documents in their dashboard. Care documents are linked to existing records and stored in PostgreSQL; they do not create a new blockchain record.

Doctor prediction flow: the doctor enters diabetes inputs manually or auto-fills them from a readable diabetes vitals PDF. The frontend posts to the backend, the backend forwards to FastAPI, and FastAPI returns prediction and probability.

## 4. Blockchain and Smart Contract

The smart contract is the trust layer. It does not store private medical files. It stores record CIDs, record ownership, doctor permissions, institution permissions, institution registration, doctor membership, and audit events.

| Function | Purpose | Cost |
| --- | --- | --- |
| `addRecord` | Stores a new CID for the patient caller. | Gas |
| `addRecordForPatient` | Contract support for clinician-created patient-owned records. The current care-document UI does not use this for normal care docs. | Gas |
| `grantAccessToDoctor` | Grants one doctor wallet access to one record. | Gas |
| `revokeAccessFromDoctor` | Revokes one doctor wallet's access to one record. | Gas |
| `grantAccessToInstitution` | Grants an institution access to one record. | Gas |
| `revokeAccessFromInstitution` | Revokes institution access to one record. | Gas |
| `registerInstitution` | Registers a hospital or clinic. | Gas |
| `addDoctorToInstitution` | Adds a doctor wallet to an institution. | Gas |
| `removeDoctorFromInstitution` | Removes a doctor wallet from an institution. | Gas |
| `hasAccess` | Checks direct or institution-based access for a doctor. | Free view |
| `getMyRecords` | Returns caller-owned records. | Free view |
| `getInstitutionDoctors` | Returns doctors in an institution. | Free view |
| `getAllInstitutions` | Returns registered institutions. | Free view |
| `getAllRecords` | Returns record references for frontend filtering. | Free view |

Revocation stops future authorized access, but it cannot erase copies already downloaded or decrypted by an authorized user.

## 5. IPFS and File Storage

IPFS stores encrypted files by CID. Pinata keeps the encrypted content available. HealthTrust stores only encrypted content in IPFS and only CIDs on-chain. This keeps large files off-chain and keeps plaintext away from the backend.

Files are encrypted before they leave the browser. The backend receives only encrypted text blobs and forwards them to Pinata. A changed encrypted file produces a different CID.

## 6. Encryption and Key Sharing

AES is used for file encryption. Each uploaded record receives a random AES key in the browser.

MetaMask encryption public keys are used for key envelopes:

1. The doctor registers an encryption public key.
2. The patient grants access.
3. The frontend encrypts the AES key for the doctor.
4. The backend stores only the encrypted key envelope.
5. The doctor clicks View.
6. MetaMask decrypts the envelope for the connected doctor wallet.
7. The browser decrypts the file locally.

The backend never stores plaintext records or plaintext AES keys. If key material is lost and no envelope exists for an authorized user, record recovery may not be possible.

## 7. Machine Learning

The ML service uses the Kaggle diabetes prediction dataset:

```text
ml_service\diabetes_prediction_dataset.csv
```

Expected features:

| Feature | Meaning |
| --- | --- |
| `gender` | Gender category from the dataset. |
| `age` | Age in years. |
| `hypertension` | 0 for no, 1 for yes. |
| `heart_disease` | 0 for no, 1 for yes. |
| `smoking_history` | Smoking category such as never, current, former, ever, not current, or No Info. |
| `bmi` | Body mass index. |
| `HbA1c_level` | Hemoglobin A1c level. |
| `blood_glucose_level` | Blood glucose level. |

`train.py` trains a `RandomForestClassifier` pipeline with one-hot encoding for categorical fields and saves `model.pkl`. `main.py` loads `model.pkl` and exposes `/predict`.

Latest local training result:

```text
Accuracy: 0.9689
```

This result is not a diagnosis and should not replace medical judgment.

## 8. Backend API

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/users/register` | Save or update user profile and encryption public key. |
| `GET` | `/api/users/:wallet` | Fetch profile by wallet. |
| `POST` | `/api/records/upload` | Upload encrypted file blob to Pinata/IPFS. |
| `GET` | `/api/records/:wallet` | Fetch blockchain records for a patient wallet. |
| `POST` | `/api/records/metadata` | Save record metadata. |
| `GET` | `/api/records/metadata/bulk` | Fetch metadata for multiple record IDs. |
| `POST` | `/api/record-keys` | Store encrypted AES key envelope. |
| `GET` | `/api/record-keys/:recordId` | Fetch signed wallet's key envelope. |
| `GET` | `/api/record-keys/owned` | Fetch key envelopes for records owned by signed wallet. |
| `GET` | `/api/record-keys/institution/:id` | Fetch institution key envelopes. |
| `DELETE` | `/api/record-keys` | Delete key envelopes after revoke. |
| `POST` | `/api/notes` | Save doctor note. |
| `GET` | `/api/notes` | Fetch notes involving signed wallet. |
| `POST` | `/api/doctor-documents` | Send care document to patient. |
| `GET` | `/api/doctor-documents` | Fetch care documents involving signed wallet. |
| `POST` | `/api/membership-requests` | Doctor requests institution membership. |
| `GET` | `/api/membership-requests` | Fetch membership requests for signed wallet. |
| `PATCH` | `/api/membership-requests/:id` | Approve or reject doctor membership. |
| `GET` | `/api/institutions` | Return registered institutions. |
| `POST` | `/api/institutions/register` | Save institution metadata. |
| `GET` | `/api/institutions/:id/doctors` | Return doctors in institution. |
| `POST` | `/api/predict` | Forward diabetes prediction to FastAPI and save history. |
| `GET` | `/api/predict/history` | Fetch signed doctor's prediction history. |
| `GET` | `/api/notifications` | Fetch signed wallet notifications. |
| `POST` | `/api/notifications` | Create a notification, such as doctor removal. |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read. |
| `GET/POST/PATCH` | `/api/access-requests` | Legacy access-request API. Current doctor UI uses patient-granted access from records instead. |

Most protected routes require signed wallet authentication headers.

## 9. Frontend

Main frontend files:

| File | Purpose |
| --- | --- |
| `Register.js` | Role registration and encryption public key registration. |
| `PatientDashboard.js` | Patient records, upload, metadata, access modal, notes, documents, profile, notifications, and audit trail. |
| `DoctorDashboard.js` | Accessible records, decrypt/download, notes, care documents, membership requests, prediction, history, notifications. |
| `InstitutionDashboard.js` | Institution registration, doctors, doctor requests, shared records, notifications. |
| `AccessModal.js` | Patient grant/revoke doctor/institution access, resend/share keys. |
| `PredictionForm.js` | Diabetes prediction form. |
| `NotificationsPanel.js` | Notification list and mark-read action. |
| `RecordCard.js` | Shared record display component. |

The UI includes empty states for tabs/lists with no records, notes, documents, requests, notifications, history, or shared records.

## 10. Institution Model

An institution is a hospital or clinic registered by an admin wallet. Doctors can request membership. Admins can approve or reject requests, manually add doctors, and remove doctors.

Institution access grants the organization access on-chain. Doctors still need an encrypted key envelope to decrypt the record. Newly added institution doctors do not automatically receive old AES keys; the patient can use Share keys for already shared institution records.

When an admin removes a doctor, the doctor receives a notification and loses institution-based access.

## 11. Security Model

| Protected threat | Protection |
| --- | --- |
| Unauthorized blockchain access | Smart contract ownership and permission checks. |
| Backend plaintext leaks | Browser encrypts files before upload. |
| Pinata/IPFS reading medical files | Only encrypted blobs are pinned. |
| Silent permission changes | Grant/revoke events are on-chain. |
| Doctor key isolation | AES key envelopes are encrypted to specific MetaMask public keys. |

| Limitation | Explanation |
| --- | --- |
| Authorized doctor copying data | A doctor who can decrypt a record can copy it. |
| Wallet theft | A stolen wallet can sign and decrypt as that user. |
| Lost keys | Lost local AES material can make recovery impossible. |
| Testnet deployment | Sepolia is not production. |
| No formal audit | Prototype contract and app have not been formally audited. |
| Institution verification | Institution admins are self-registered in the prototype. |

## 12. Testing and Validation

### 12.1 Unit Testing

Run backend tests:

```powershell
cd backend
npm test
```

Latest result:

```text
4 passed, 0 failed
```

Run smart contract tests:

```powershell
cd blockchain
npm test
```

Latest result:

```text
3 passing
```

Run frontend build validation:

```powershell
cd frontend
npm run build
```

Run ML training validation:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

Run ML prediction smoke test:

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

### 12.2 Integration Testing

Integration evidence is stored in:

```text
test\integration\integration-test-results.md
```

The automated integration checks cover backend auth, smart contract permission logic, frontend build/import compatibility, ML training, and ML prediction logic.

Browser integration tests require running the full app with MetaMask:

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

### 12.3 System Testing

System test cases are stored in:

```text
test\system\system-test-cases.md
```

The main manual workflows are patient upload, patient grant, doctor decrypt, doctor note, doctor care document, institution grant, membership approval/removal, notifications, and prediction auto-fill.

### 12.4 Usability Testing

The usability plan is stored in:

```text
test\usability\usability-test-plan.md
```

Usability testing requires real participants. The recommended participants are four patients, four doctors, and two institution admins. The target SUS score is above 68/100.

## 13. Setup and Run Commands

Install dependencies:

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

## 14. Sample Records

Fake test PDFs are available in `sample_records`:

| File | Use |
| --- | --- |
| `sample_diabetes_vitals.pdf` | Prediction auto-fill test. |
| `sample_blood_test_report.pdf` | General lab upload/share test. |
| `sample_radiology_report.pdf` | Imaging-style upload/share test. |
| `sample_prescription.pdf` | Prescription upload/share test. |
| `sample_discharge_summary.pdf` | Discharge summary upload/share test. |
| `sample_clinic_visit_note.pdf` | Clinic note upload/share test. |

## 15. File and Folder Reference

| File or folder | Purpose |
| --- | --- |
| `blockchain/contracts/HealthTrust.sol` | Solidity smart contract. |
| `blockchain/scripts/deploy.js` | Deploys contract and writes shared config. |
| `backend/server.js` | Express app entrypoint. |
| `backend/prisma/schema.prisma` | PostgreSQL schema. |
| `frontend/src/pages/PatientDashboard.js` | Patient role UI. |
| `frontend/src/pages/DoctorDashboard.js` | Doctor role UI. |
| `frontend/src/pages/InstitutionDashboard.js` | Institution admin role UI. |
| `frontend/src/components/AccessModal.js` | Patient access and key-sharing modal. |
| `frontend/src/components/PredictionForm.js` | Diabetes prediction form. |
| `frontend/src/utils/encryption.js` | AES file encryption/decryption helpers. |
| `frontend/src/utils/keySharing.js` | MetaMask encryption key envelope helpers. |
| `frontend/src/utils/recordSharing.js` | Stores doctor/institution key envelopes. |
| `ml_service/train.py` | Trains model and writes `model.pkl`. |
| `ml_service/main.py` | FastAPI prediction service. |
| `sample_records/` | Fake PDFs for testing. |
| `test/` | Testing evidence and plans. |
| `shared/contractConfig.js` | Deployed contract address and ABI. |

## 16. Glossary

| Term | Definition |
| --- | --- |
| AES | Symmetric encryption algorithm used for file encryption. |
| CID | IPFS content identifier. |
| IPFS | Distributed content-addressed file storage. |
| Pinata | IPFS pinning provider. |
| MetaMask | Browser wallet for account access, encryption operations, and transaction signing. |
| Sepolia | Ethereum test network. |
| Smart contract | Blockchain program that stores record and permission rules. |
| Key envelope | AES key encrypted for a specific doctor wallet. |
| Prisma | Node.js database toolkit. |
| FastAPI | Python API framework used for the ML service. |
| RandomForestClassifier | scikit-learn model used for diabetes prediction. |

## 17. Known Limitations and Future Improvements

Known limitations:

- Sepolia is a testnet.
- The system is not production-ready.
- Revocation cannot erase already downloaded/decrypted files.
- A malicious authorized doctor can copy plaintext after decrypting.
- Wallet loss or lost key material can make recovery impossible.
- Pinata/IPFS gateway outages can affect retrieval.
- Institution admins are self-registered with no real-world KYC.
- The ML result is not a medical diagnosis.
- No formal security audit has been performed.

Future improvements:

- Verified institution onboarding.
- Stronger recovery model for lost wallets/keys.
- More disease prediction models.
- OCR support for scanned PDFs.
- Mobile app support.
- Formal smart contract and security audit.
- Production deployment plan with real compliance review.
