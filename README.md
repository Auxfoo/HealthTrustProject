# HealthTrust: A Decentralized Medical Record System with Predictive Analytics

## Abstract

The healthcare system in the Kurdistan region still faces problems in
safe record sharing between hospitals and clinics. HealthTrust is a
prototype that combines client-side encryption, IPFS/Pinata storage,
Sepolia smart-contract permissions, and a diabetes-risk ML service.
Blockchain does not store the files themselves; encrypted files go to
IPFS, while only CIDs, permissions, and tamper-resistant audit events go
on-chain. Patients control on-chain permissions, but revocation cannot
erase copies already decrypted or downloaded by an authorized doctor.
The ML service predicts diabetes risk only from eight medical vitals and
does not receive patient identity or full uploaded medical files by
default. The result is not a clinical diagnosis.

## Overview

HealthTrust is a decentralized medical record system for patients, doctors, and healthcare institutions. Patients encrypt records in the browser, upload the encrypted file to IPFS through Pinata, and store only the IPFS CID on a Sepolia smart contract. Per-record blockchain permissions let a patient grant or revoke access for a single doctor or for an entire registered hospital or clinic. Doctors can view authorized records and use a FastAPI machine learning service to estimate diabetes risk from the Pima Indians Diabetes Dataset features.

## Architecture

```text
React Frontend
  <-> ethers.js (blockchain)
  <-> REST API
Node/Express Backend
  <-> Prisma     -> PostgreSQL
  <-> Pinata API -> IPFS
  <-> ethers.js  -> Sepolia Blockchain
  <-> axios      -> FastAPI ML Service
```

## Prerequisites

- Node.js v18+
- Python 3.10+
- MetaMask browser extension
- PostgreSQL v14+ (local or hosted)
- Git
- Hardhat (installed via npm)

## Setup

### Step 1 - Blockchain

```powershell
cd blockchain
npm install
copy ..\backend\.env.example .env
```

Edit `blockchain\.env` and set `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.

```powershell
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

The deploy script writes the deployed contract address and full ABI to `shared/contractConfig.js`.

### Step 2 - Backend

```powershell
cd ..\backend
npm install
copy .env.example .env
```

Edit `backend\.env` with PostgreSQL, Pinata, Sepolia, contract, and ML service values.
Create the PostgreSQL database if it does not exist yet:

```powershell
createdb -U postgres healthtrust
```

```powershell
npx prisma generate
npx prisma migrate dev --name init
node server.js
```

### Step 3 - ML Service

```powershell
cd ..\ml_service
py -3 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Download `diabetes.csv` from Kaggle and place it at `ml_service\diabetes.csv`.

```powershell
py -3 train.py
uvicorn main:app --reload
```

### Step 4 - Frontend

```powershell
cd ..\frontend
npm install
npm start
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Environment Variables

Use this content for `backend\.env`. The blockchain folder can reuse `SEPOLIA_RPC_URL` and `PRIVATE_KEY`.

```env
# PostgreSQL connection string used by Prisma.
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/healthtrust?schema=public

# Pinata API key from pinata.cloud > API Keys.
PINATA_API_KEY=your_pinata_api_key

# Pinata secret API key from pinata.cloud > API Keys.
PINATA_SECRET_API_KEY=your_pinata_secret_api_key

# Deployed HealthTrust contract address on Sepolia, also written to shared/contractConfig.js by deploy.js.
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Sepolia RPC URL from a provider such as Alchemy or Infura.
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_api_key

# Backend signer wallet private key for optional server-side blockchain proxy routes on Sepolia only.
PRIVATE_KEY=your_backend_wallet_private_key

# Express server port.
PORT=5000

# FastAPI ML service base URL.
ML_SERVICE_URL=http://localhost:8000
```

## Pinata API Key

1. Go to `https://pinata.cloud`.
2. Sign up for a free account.
3. Open API Keys.
4. Create a key and copy the API key and secret API key into `backend\.env`.

## Free Sepolia ETH

Use either faucet:

- `https://sepoliafaucet.com`
- `https://www.alchemy.com/faucets/ethereum-sepolia`

## Diabetes Dataset

Download the Pima Indians Diabetes Dataset from:

`https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database`

Download the file named `diabetes.csv` and place it here:

`ml_service\diabetes.csv`

## Run Commands

```powershell
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia

cd ..\ml_service
py -3 train.py
uvicorn main:app --reload

cd ..\backend
createdb -U postgres healthtrust
npx prisma generate
npx prisma migrate dev --name init
node server.js

cd ..\frontend
npm start
```

## Usage Walkthrough

Patient flow: connect MetaMask, register as a patient, register the MetaMask encryption public key, choose a PDF or image, upload the encrypted record, confirm `addRecord(cid)` in MetaMask, then open Manage Access to grant a doctor wallet or institution access. Patients can review key-sharing status, revoke future access, respond to access requests, edit medical profile details, see notifications, and download doctor care documents as PDFs.

Doctor flow: connect MetaMask, register as a doctor, request record access, request institution membership, view records where direct or institution access was granted, decrypt authorized records through encrypted key envelopes, add notes, send care documents to patients, and submit the eight diabetes vitals to view a non-clinical diabetes risk result.

Institution flow: connect MetaMask, register as an institution admin, register a hospital or clinic on-chain, approve or reject doctor membership requests, manage doctors, request patient record access, view shared-record key envelopes, and monitor notifications.

## Known Limitations

- Wallet loss or lost AES/key envelope material can mean permanent record loss.
- Revocation stops future authorized access; it cannot delete files already decrypted or downloaded.
- Sepolia testnet only, not production-ready.
- ML output is diabetes-risk support only, not a medical diagnosis.
- Institution admins are self-registered with no real-world KYC.
- No mobile app or formal security audit yet.
