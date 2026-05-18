# HealthTrust: A Decentralized Medical Record System with Predictive Analytics

## Abstract

The healthcare system in the Kurdistan region still faces many problems
in managing and sharing patient records safely between hospitals and
clinics. To solve this, our project introduces HealthTrust, a system
that uses blockchain and machine learning to make health data more
secure and useful. Blockchain helps protect medical records from being
changed or accessed without permission, giving patients full control
over their information. At the same time, machine learning analyzes
medical data without showing personal details to predict possible
diseases and help doctors make better decisions. With this project, we
aim to make healthcare in Kurdistan more secure, transparent, and
intelligent.

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

Patient flow: connect MetaMask, register as a patient, choose a PDF or image, sign the encryption message, upload the encrypted record, confirm `addRecord(cid)` in MetaMask, then open Manage Access to grant a doctor wallet or institution ID access.

Doctor flow: connect MetaMask, register as a doctor, optionally choose an institution, view records where direct or institution access was granted, decrypt authorized records using the patient-provided AES key or signature, and submit the 8 diabetes vitals to view Diabetic or Non-Diabetic with a probability meter.

Institution flow: connect MetaMask, register as an institution admin, register a hospital or clinic on-chain, add verified doctor wallet addresses, and have patients grant the institution access to records.

## Known Limitations

- Wallet loss = permanent record loss (by design)
- Sepolia testnet only, not production-ready
- ML output is not a medical diagnosis
- Institution admins are self-registered (no real-world KYC)
- No mobile support
