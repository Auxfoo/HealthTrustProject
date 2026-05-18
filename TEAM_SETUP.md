# HealthTrust Team Setup Checklist

Use this when a teammate clones the repository.

## 1. Install tools

- Node.js v18+
- Python 3.10+
- PostgreSQL v14+
- MetaMask
- Git

## 2. Create local environment files

From the project root:

```powershell
copy backend\.env.example backend\.env
copy blockchain\.env.example blockchain\.env
copy frontend\.env.example frontend\.env
```

Fill in the real values in `.env` files. Do not commit `.env`.

## 3. Install dependencies

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
cd ..\backend
npx prisma generate
npx prisma migrate dev --name init
```

## 5. Prepare ML dataset

Download `diabetes.csv` from:

https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database

Place it at:

```text
ml_service\diabetes.csv
```

Then:

```powershell
cd ..\ml_service
.\.venv\Scripts\activate
python train.py
```

## 6. Deploy contract

```powershell
cd ..\blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed address into `backend\.env` as `CONTRACT_ADDRESS`.

## 7. Run the app

Use three terminals:

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

Open:

```text
http://localhost:5173
```
