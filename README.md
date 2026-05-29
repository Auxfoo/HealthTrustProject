# HealthTrust

HealthTrust is a prototype healthcare app for patient-controlled medical record sharing. It combines browser-side encryption, IPFS storage, Sepolia smart-contract permissions, and a diabetes risk prediction service to demonstrate how patients, doctors, and institutions can collaborate without putting private medical files directly on-chain.

The app is designed for a graduation/demo environment, not production clinical use. It uses Sepolia testnet wallets, fake medical records, and a local PostgreSQL database.

## What The App Does

HealthTrust gives each role a focused workspace:

| Role | Main capabilities |
| --- | --- |
| Patient | Register a medical profile, upload encrypted PDF/image records, manage metadata, mark records as important or emergency-visible, grant or revoke doctor/institution access, share encrypted record keys, respond to access requests, view notes and care documents, export audit/care PDFs, and receive notifications. |
| Doctor | Register with a wallet encryption public key, request institution membership, view only authorized records, decrypt/download records through MetaMask key envelopes, request emergency access, add notes, send care documents, run diabetes predictions, and review prediction history. |
| Institution admin | Register a hospital/clinic, approve or reject doctor membership requests, add/remove doctors, view institution-shared records, inspect shared-key counts, export institution audit reports, and receive notifications. |

## Why It Exists

Medical records are often fragmented across clinics, hospitals, laboratories, and individual doctors. Patients may need to carry paper reports, repeat tests, or manually send files between providers. Centralized systems can help, but they usually place one organization in control of storage, permissions, and audit history.

HealthTrust explores a different model:

- Patients encrypt files before upload.
- IPFS/Pinata stores encrypted content only.
- Sepolia smart contracts store record references, permissions, institution membership, and audit events.
- Doctors can decrypt a record only when both blockchain access and an encrypted key envelope exist.
- A separate ML service provides a non-diagnostic diabetes risk prediction prototype.

## Core Workflows

### Patient Upload

The patient selects a PDF or image. The browser generates an AES key, encrypts the file locally, sends only the encrypted blob to the backend, and the backend pins it to IPFS through Pinata. The frontend then stores the CID on the HealthTrust smart contract.

### Access Grant

When a patient grants a doctor access, the app records permission on-chain and creates an encrypted AES key envelope for that doctor's MetaMask encryption key. The doctor needs both pieces before a record can be opened.

### Institution Sharing

A patient can grant an institution access to a record. Doctors in that institution still need key envelopes to decrypt files. If a new doctor joins later, the patient can share the key for already granted institution records.

### Doctor Care

Doctors can view accessible records, add notes, send care documents, and run diabetes prediction from manually entered values or readable diabetes-vitals PDFs.

### Audit And Reports

Patients and institution admins can export branded PDF audit reports. Patients can also download branded PDFs for doctor care documents. Original uploaded files are downloaded unchanged after decryption.

## Architecture

```text
React frontend
  | MetaMask, ethers.js, AES encryption/decryption
  | REST API
  v
Node/Express backend
  | Prisma -> PostgreSQL
  | Pinata -> IPFS encrypted file storage
  | axios  -> FastAPI ML service
  | ethers -> Sepolia contract reads/proxy routes
  v
Sepolia smart contract
  | record CIDs, permissions, institutions, membership, audit events

FastAPI ML service
  | scikit-learn model + clinical-rule probability blend
  v
Diabetes prediction result
```

## Tech Stack

- Frontend: React, Vite, ethers.js, MetaMask, CryptoJS, lucide-react
- Backend: Node.js, Express, Prisma, PostgreSQL
- Blockchain: Solidity, Hardhat, Sepolia
- Storage: IPFS through Pinata
- ML service: FastAPI, scikit-learn, pandas, joblib
- Testing: Node test runner, Hardhat tests, Vite production build, ML smoke checks

## Repository Layout

```text
backend/        Express API, Prisma schema, workflow data, Pinata/ML integration
blockchain/     Solidity contract, Hardhat config, deployment script, contract tests
frontend/       React app for patient, doctor, and institution workflows
ml_service/     FastAPI diabetes prediction service and model training script
sample_records/ Fake PDF records for demo/testing
shared/         Shared deployed contract config used by the frontend
test/           Unit, integration, system, and usability test documentation
docs/           Screenshot evidence and supporting documentation
```

## Diabetes Prediction

The prediction feature is a prototype decision-support demo. It is trained from `ml_service/diabetes_prediction_dataset.csv` and accepts:

- gender
- age
- hypertension
- heart disease
- smoking history
- BMI
- HbA1c level
- blood glucose level
- glucose context: unknown, fasting, random, or post-meal

The service returns the final prediction, final probability, trained model probability, and clinical-rule probability. It is not a diagnosis and must not replace medical judgment.

## Demo Assets

Fake diabetes-gradient PDF records are available in `sample_records/`. They are intended for upload, sharing, decryption, and prediction auto-fill demos. Do not use real patient data in this prototype.

Screenshot evidence for reports is stored in `docs/screenshots/`.

## Known Limitations

- Sepolia is a testnet; this is not production-ready.
- Revocation blocks future authorized access but cannot erase files already decrypted or downloaded.
- A doctor with legitimate access can copy plaintext after decrypting it.
- Wallet loss or missing key envelopes can make record recovery impossible.
- Pinata/IPFS availability affects retrieval.
- Institution admins are self-registered; there is no real institution verification/KYC.
- No formal smart-contract or security audit has been completed.
- The diabetes prediction feature is non-diagnostic.
- Local database resets do not reset Sepolia smart-contract state.

## Setup

For installation, environment variables, database setup, contract deployment, ML training, running services, testing, and demo reset commands, see [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

## References

- Ethereum developer documentation: https://ethereum.org/developers/docs/
- Sepolia testnet: https://ethereum.org/developers/docs/networks/#sepolia
- IPFS documentation: https://docs.ipfs.tech/
- Pinata documentation: https://docs.pinata.cloud/
- MetaMask developer documentation: https://docs.metamask.io/
- FastAPI documentation: https://fastapi.tiangolo.com/
- scikit-learn documentation: https://scikit-learn.org/stable/
- Diabetes prediction dataset: https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset
