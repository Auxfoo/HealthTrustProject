# HealthTrust Project Guide

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

## 1. PROJECT OVERVIEW

HealthTrust is a decentralized medical record system designed for patients, doctors, hospitals, and clinics. In plain English, it gives patients a way to upload medical records securely, decide exactly who can access each record, and keep a permanent history of permission changes. It also gives doctors a simple diabetes prediction tool based on eight medical vitals. The project combines a React frontend, a Node.js backend, a Solidity smart contract, IPFS storage through Pinata, PostgreSQL identity records managed through Prisma, and a Python FastAPI machine learning service.

The healthcare context in the Kurdistan region creates a practical need for this type of system. Patient records are often separated between hospitals, clinics, and doctors. Sharing can be slow, duplicated, paper-based, or dependent on manual trust. A patient may visit one clinic, then another hospital, and the second provider may not have the earlier record. This can delay treatment and create confusion. HealthTrust addresses this by giving the patient a digital record list and access controls that can be checked by any connected system.

Blockchain was chosen over a traditional database for the trust layer. A normal database can be changed by administrators, attacked by insiders, or silently modified if the server is compromised. Blockchain is not used here to store private medical files. Instead, it stores record references, access permissions, institution registration, doctor membership, and audit events. This makes permission history tamper-resistant and transparent. The patient does not need to trust a single hospital server to remember who was granted or revoked.

IPFS was chosen instead of storing files directly on-chain because medical files are large and blockchains are expensive. Storing a PDF or image directly inside a smart contract would cost too much gas and would permanently expose data in an unsuitable location. IPFS stores content by its cryptographic content identifier, called a CID. If the encrypted file changes, the CID changes. The blockchain stores only the CID, which proves which encrypted file belongs to the record.

Machine learning was added to make the system more useful to doctors. The ML service predicts diabetes risk using the Pima Indians Diabetes Dataset and a RandomForestClassifier model. The model is served separately through FastAPI. It does not receive raw uploaded medical records. Instead, a doctor manually enters eight vitals into a prediction form. This supports the abstract’s idea of analyzing medical data without revealing personal details, because the prediction is based only on entered numerical features, not decrypted files or patient identity.

## 2. SYSTEM ARCHITECTURE

HealthTrust uses multiple services that each have a focused responsibility. The frontend handles the user interface, MetaMask connection, client-side encryption, and user-confirmed blockchain transactions. The backend handles PostgreSQL profiles through Prisma, Pinata uploads, API routing, and proxying prediction requests. The smart contract stores decentralized records and permissions. The ML service handles diabetes prediction. PostgreSQL stores only user and institution metadata, not medical records.

ASCII architecture diagram:

React Frontend
  | MetaMask wallet connection
  | ethers.js contract calls
  | crypto-js AES encryption and decryption
  | REST API calls
  v
Node.js / Express Backend
  | Prisma
  v
PostgreSQL Users and Institutions

Node.js / Express Backend
  | Pinata REST API v1
  v
IPFS encrypted file storage

React Frontend and Backend
  | ethers.js
  v
Sepolia Blockchain
  | HealthTrust.sol smart contract
  v
Records, access permissions, institution membership, audit events

Node.js / Express Backend
  | axios
  v
FastAPI ML Service
  | scikit-learn RandomForestClassifier
  v
Diabetes prediction and probability

Patient upload flow: the patient connects MetaMask, chooses a PDF or image, and signs a fixed message in the browser. The signature and wallet address are used to derive an AES key. The file is encrypted before it leaves the browser. The encrypted text blob is sent to the Express backend. The backend pins it to IPFS through Pinata and receives a CID. The frontend then calls addRecord on the smart contract with that CID. The contract stores the record ID, CID, uploader address, and timestamp, then emits RecordAdded.

Patient grants doctor access flow: the patient opens the access modal for a specific record. The patient enters a doctor wallet address and confirms the grant transaction in MetaMask. The smart contract checks that the caller owns the record. If valid, it updates the recordId to doctorAddress permission mapping and emits AccessGrantedToDoctor. Revocation works the same way, except the mapping value becomes false and AccessRevokedFromDoctor is emitted.

Doctor views and decrypts flow: the doctor connects MetaMask and opens the accessible records tab. The frontend reads all records from the smart contract and checks hasAccess for the doctor wallet. If the doctor has direct access or belongs to an institution that was granted access, the record appears. The doctor fetches the encrypted blob from the IPFS gateway using the CID. Because encryption is client-side and the backend never stores plaintext, the doctor needs the patient-provided AES key or original signature through an approved real-world sharing process. The frontend decrypts the blob in the browser and opens the file.

Doctor prediction flow: the doctor opens the diabetes prediction tab and enters Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, and Age. The frontend posts the data to the backend route. The backend forwards the request to the FastAPI service. FastAPI loads model.pkl, runs the RandomForestClassifier prediction, and returns prediction and probability. The frontend displays Diabetic or Non-Diabetic and a green, yellow, or red risk meter.

## 3. BLOCKCHAIN & SMART CONTRACT

A smart contract is a program stored on a blockchain. In HealthTrust, the smart contract is the authority for medical record ownership, per-record permissions, institution registration, and institution doctor membership. It is used because these actions need a transparent audit trail and should not depend only on a central server.

Sepolia is an Ethereum testnet. It behaves like Ethereum but uses test ETH with no real financial value. HealthTrust uses Sepolia instead of mainnet because this is an academic and prototype system. Testing on mainnet would cost real money and would be inappropriate before audits, security review, and production planning.

MetaMask is the browser wallet used by patients, doctors, and institution admins. It stores the user’s private key locally, exposes the wallet address to the frontend after approval, signs messages for encryption key derivation, and signs blockchain transactions. When a user grants access, registers an institution, adds a doctor, or uploads a CID, MetaMask shows a confirmation prompt.

Hardhat is the development framework used to compile and deploy the Solidity contract. It reads the deployment wallet private key and Sepolia RPC URL from environment variables, deploys HealthTrust.sol, and writes the deployed address and ABI to shared/contractConfig.js. The ABI is required by ethers.js so the frontend and backend know how to call the contract.

OpenZeppelin Ownable is included as a trusted access-control base contract. In the current prototype, the main permissions are based on record owner and institution admin checks. Ownable is included for standard ownership support and future administrative extensions, such as emergency pauses or verified institution approval.

| Function | Plain-English explanation | Gas cost |
| --- | --- | --- |
| addRecord | Stores a new CID for the patient who submits the transaction. | Costs gas |
| grantAccessToDoctor | Gives one doctor wallet access to one record. | Costs gas |
| revokeAccessFromDoctor | Removes one doctor wallet’s access to one record. | Costs gas |
| grantAccessToInstitution | Gives all doctors in one institution access to one record. | Costs gas |
| revokeAccessFromInstitution | Removes institution access from one record. | Costs gas |
| registerInstitution | Creates a hospital or clinic with the caller as admin. | Costs gas |
| addDoctorToInstitution | Adds a doctor wallet to an institution. | Costs gas |
| removeDoctorFromInstitution | Removes a doctor wallet from an institution. | Costs gas |
| hasAccess | Checks direct and institution-based access for a doctor. | Free view call |
| getMyRecords | Returns records uploaded by the caller. | Free view call |
| getInstitutionDoctors | Returns doctor wallets in an institution. | Free view call |
| getAllInstitutions | Returns registered institutions. | Free view call |
| getAllRecords | Returns all record references for frontend access filtering. | Free view call |

On-chain events matter because they create a tamper-resistant audit trail. When access is granted or revoked, the event is stored in blockchain history. The patient dashboard can read these events and show what happened, which target was involved, and which record was affected.

Per-record access control means permission is not global. A patient can grant Doctor A access to Record 1 but not Record 2. This is more precise than giving a doctor full access to every patient file. The institution model extends this by letting a patient grant an entire hospital or clinic access to one record. Any doctor who is a current member of that institution can pass the hasAccess check for that record.

## 4. IPFS & FILE STORAGE

IPFS is a distributed file storage network. Instead of using a normal URL based on server location, IPFS identifies a file by its content. That identifier is called a CID. If the file content changes, the CID changes. This makes IPFS useful for record integrity because the blockchain can store the CID and later verify that the same encrypted content is being retrieved.

Pinata is an IPFS pinning service. Pinning means asking an IPFS provider to keep the file available. HealthTrust uses Pinata REST API v1 because it gives a simple HTTP upload interface from the backend. The backend receives the encrypted blob and sends it to Pinata. Pinata returns the IPFS CID.

Files are not stored directly on the blockchain because blockchains are public, expensive, and not designed for large file storage. Even encrypted files would be costly to store on-chain. HealthTrust stores only the CID on-chain and keeps the encrypted file in IPFS.

When a patient uploads a file, the browser first encrypts the PDF or image with AES. The encrypted string is sent to the backend as multipart form data. Multer reads the uploaded file into memory. The backend uses axios and form-data to send it to Pinata. Pinata pins the file and returns a CID. The frontend then calls the smart contract to store that CID as a record.

When a doctor downloads a file, the frontend fetches the encrypted content from an IPFS gateway using the CID. The gateway and Pinata only see encrypted content. The doctor’s browser then decrypts it using the patient-provided AES key or signature. If the patient loses the wallet and cannot reproduce or share the needed key material, record recovery can become impossible by design.

## 5. ENCRYPTION

AES encryption is a symmetric encryption method. Symmetric means the same secret key is used to encrypt and decrypt. In HealthTrust, AES is used through crypto-js in the browser. The file is converted into bytes, encrypted, and only then uploaded.

Encryption happens client-side because the server should never see private medical records in plaintext. If encryption happened on the backend, the backend would temporarily receive sensitive medical files. That would weaken the security model and make server compromise more dangerous.

The AES key is derived from the patient wallet address and a MetaMask signature. The patient signs a fixed message. That signature is combined with the wallet address and hashed into a key string. This means the key is tied to control of the patient’s wallet. The private key itself is never exposed to the application.

The server never sees the unencrypted file because the browser encrypts before upload. Pinata also cannot read the original file because it receives the encrypted blob, not the PDF or image. The system still depends on safe key handling. If a patient shares the AES key or signature with a doctor, that doctor can decrypt the record they receive.

## 6. MACHINE LEARNING

The Pima Indians Diabetes Dataset is a public diabetes classification dataset commonly used for beginner and academic machine learning projects. It contains rows of numerical medical features and an Outcome column showing whether diabetes was present in the dataset label.

| Feature | Plain-English meaning |
| --- | --- |
| Pregnancies | Number of pregnancies recorded for the patient. |
| Glucose | Plasma glucose concentration measurement. |
| BloodPressure | Diastolic blood pressure measurement. |
| SkinThickness | Triceps skin fold thickness. |
| Insulin | Two-hour serum insulin measurement. |
| BMI | Body mass index. |
| DiabetesPedigreeFunction | Family-history-related diabetes score. |
| Age | Age in years. |

RandomForestClassifier is a scikit-learn model made of many decision trees. Each tree makes a prediction, and the forest combines those predictions. This often works well for tabular medical-style datasets because it can model non-linear relationships between features.

model.pkl is the saved model file. The train.py script loads diabetes.csv, splits it into training and test sets, trains the RandomForestClassifier, prints accuracy, and saves the model with joblib. Joblib is a Python library commonly used to save and load scikit-learn models efficiently. FastAPI loads model.pkl when the service starts.

The prediction output is 0 or 1. In this project, 0 means Non-Diabetic and 1 means Diabetic. The probability is a number from 0.0 to 1.0 representing the model’s estimated probability for the diabetic class. The frontend converts it to a percentage and displays a color-coded risk meter.

This is not a medical diagnosis. The model is trained on a small public dataset, is not clinically certified, and should not replace a doctor’s judgment or laboratory testing. It is included to demonstrate predictive analytics. It connects to the abstract’s privacy wording because the doctor enters vitals manually and no raw uploaded records are fed into the ML model.

## 7. BACKEND API

Express is the Node.js web framework used for the backend. The backend connects the frontend to PostgreSQL through Prisma, Pinata, optional blockchain proxy routes, and the ML service. It also keeps the frontend from needing Pinata API secrets.

| Method | Route | Purpose | Caller |
| --- | --- | --- | --- |
| POST | /api/users/register | Save or update a user profile. | Frontend registration page |
| GET | /api/users/:wallet | Fetch a profile by wallet. | WalletContext |
| POST | /api/records/upload | Upload encrypted file blob to Pinata/IPFS. | Patient dashboard |
| GET | /api/records/:wallet | Fetch blockchain records for a patient wallet. | Patient dashboard |
| POST | /api/access/grant/doctor | Optional backend proxy for granting doctor access. | API clients or demos |
| POST | /api/access/revoke/doctor | Optional backend proxy for revoking doctor access. | API clients or demos |
| POST | /api/access/grant/institution | Optional backend proxy for granting institution access. | API clients or demos |
| POST | /api/access/revoke/institution | Optional backend proxy for revoking institution access. | API clients or demos |
| GET | /api/access/check | Check whether a doctor has access to a record. | Frontend or API clients |
| POST | /api/institutions/register | Save institution metadata and optionally proxy registration. | Registration and institution dashboard |
| POST | /api/institutions/addDoctor | Optional backend proxy for adding doctors. | API clients or demos |
| POST | /api/institutions/removeDoctor | Optional backend proxy for removing doctors. | API clients or demos |
| GET | /api/institutions | Return registered institutions from PostgreSQL. | Registration, modal, dashboard |
| GET | /api/institutions/:id/doctors | Return institution doctors from the smart contract. | Institution dashboard |
| POST | /api/predict | Forward diabetes vitals to FastAPI. | Doctor dashboard |

Prisma is the database toolkit used to define the PostgreSQL schema and query the database from Node.js. It defines User and Institution models, validates role and institution type enums at the schema layer, and generates a type-aware client used by the controllers. Multer handles multipart file uploads. In this system it stores encrypted uploads in memory long enough for the backend to forward them to Pinata.

ethers.js is used server-side for read calls and optional proxy write routes. Some contract calls go through the backend because the backend route list requires those endpoints. However, user-sensitive writes are done directly from the frontend through MetaMask so the patient or institution admin sees and approves the transaction.

## 8. FRONTEND

The frontend is a React app. Register.js lets a wallet owner create a patient, doctor, or institution admin profile. PatientDashboard.js lets patients upload encrypted records, view their own records, manage access, and view audit events. DoctorDashboard.js lets doctors see accessible records and submit diabetes predictions. InstitutionDashboard.js lets institution admins register their institution and manage doctors.

Navbar.js shows the connected wallet, user name, and role. RecordCard.js displays one record with CID and timestamp. AccessModal.js contains doctor and institution tabs for grant and revoke actions. PredictionForm.js renders the eight input fields. RiskMeter.js renders the probability bar.

WalletContext.js stores walletAddress, userProfile, role, connection state, and helper functions. React Context is used so every page can access the wallet and profile without passing props through many layers. encryption.js derives the AES key and encrypts or decrypts file bytes. contractHelper.js centralizes ethers.js provider, signer, contract, and wrapper functions.

MetaMask transaction toasts are handled with React Toastify. When a transaction starts, the UI shows a pending toast. After tx.wait resolves, the toast changes to confirmed. If MetaMask rejects or the contract reverts, the toast shows the error.

## 9. INSTITUTION MODEL

An institution in this project is a registered hospital or clinic. It has an on-chain ID, name, type, admin wallet, and verification flag. The model was added to fulfill the requirement that records can be shared between hospitals and clinics, not only individual doctors.

Institution access works in steps. First, an admin wallet registers a hospital or clinic. Second, the admin adds doctor wallet addresses to that institution. Third, a patient grants that institution access to a specific record. Fourth, when a doctor tries to view the record, hasAccess checks both direct doctor access and institution membership. If the doctor belongs to an institution that has access to the record, access is allowed.

This differs from direct doctor access because direct access names one doctor wallet. Institution access names an organization and automatically covers current doctors in that organization. Removing a doctor from the institution removes their institution-based access without requiring every patient to revoke that doctor individually.

## 10. SECURITY MODEL

| Protected threat | Protection mechanism |
| --- | --- |
| Unauthorized record access | Smart contract access control checks direct doctor grants and institution membership. |
| Record tampering | IPFS CIDs change if encrypted file content changes. |
| Server-side data leaks | Files are encrypted in the browser before backend upload. |
| Audit trail manipulation | Grant and revoke events are stored on-chain and are immutable. |

| Not protected threat | Honest limitation |
| --- | --- |
| Wallet private key theft | A stolen wallet can sign transactions and messages as the user. |
| Malicious authorized doctor | A doctor with legitimate access can copy decrypted data. |
| Pinata service unavailability | If Pinata or an IPFS gateway is unavailable, retrieval may fail. |
| Unaudited smart contract bugs | The contract is a prototype and has not received formal security audit. |

## 11. FILE & FOLDER REFERENCE

| File or folder | Purpose |
| --- | --- |
| blockchain/contracts/HealthTrust.sol | Solidity smart contract for records, access, institutions, doctors, and audit events. |
| blockchain/scripts/deploy.js | Deploys the contract and writes shared contract address and ABI. |
| blockchain/hardhat.config.js | Hardhat compiler and Sepolia network configuration. |
| blockchain/package.json | Blockchain dependencies and scripts. |
| backend/server.js | Starts Express, connects PostgreSQL through Prisma, and mounts API routes. |
| backend/controllers/userController.js | Handles user registration and lookup. |
| backend/controllers/recordController.js | Handles Pinata uploads and record reads. |
| backend/controllers/accessController.js | Handles access-control proxy routes and access checks. |
| backend/controllers/institutionController.js | Handles institution storage and institution doctor reads. |
| backend/controllers/predictController.js | Forwards prediction requests to FastAPI. |
| backend/lib/prisma.js | Shared Prisma client used by backend controllers. |
| backend/prisma/schema.prisma | PostgreSQL schema for users and institutions. |
| backend/routes/users.js | User API routes. |
| backend/routes/records.js | Record API routes. |
| backend/routes/access.js | Access-control API routes. |
| backend/routes/institutions.js | Institution API routes. |
| backend/routes/predict.js | Prediction API route. |
| backend/.env.example | Documented backend environment template. |
| backend/package.json | Backend dependencies and scripts. |
| frontend/index.html | Vite HTML entrypoint. |
| frontend/vite.config.js | Vite configuration for React JSX files and shared contract config imports. |
| frontend/src/main.jsx | React render entrypoint. |
| frontend/src/App.js | Main role-based app flow. |
| frontend/src/styles.css | Frontend layout and component styling. |
| frontend/src/context/WalletContext.js | Global wallet and profile state. |
| frontend/src/utils/encryption.js | AES key derivation, encryption, and decryption. |
| frontend/src/utils/contractHelper.js | ethers.js contract helper functions. |
| frontend/src/pages/Register.js | Role registration page. |
| frontend/src/pages/PatientDashboard.js | Patient record upload, records list, and audit view. |
| frontend/src/pages/DoctorDashboard.js | Doctor accessible records and diabetes prediction. |
| frontend/src/pages/InstitutionDashboard.js | Institution registration and doctor management. |
| frontend/src/components/Navbar.js | Header with wallet and user status. |
| frontend/src/components/RecordCard.js | Reusable record display component. |
| frontend/src/components/AccessModal.js | Grant and revoke modal for doctors and institutions. |
| frontend/src/components/PredictionForm.js | Eight-field diabetes prediction form. |
| frontend/src/components/RiskMeter.js | Color-coded probability display. |
| frontend/package.json | Frontend dependencies and scripts. |
| ml_service/train.py | Trains RandomForestClassifier and saves model.pkl. |
| ml_service/main.py | FastAPI prediction service. |
| ml_service/requirements.txt | Python dependencies. |
| ml_service/diabetes.csv | User-downloaded dataset, ignored by git. |
| ml_service/model.pkl | Generated trained model, ignored by git. |
| shared/contractConfig.js | Shared contract address and ABI. |
| README.md | Setup and usage documentation. |
| PROJECT_GUIDE.md | Full explanatory project guide. |
| .gitignore | Prevents secrets, datasets, and generated models from being committed. |

## 12. GLOSSARY

| Term | Definition |
| --- | --- |
| Blockchain | A shared ledger where transactions are recorded in a tamper-resistant way. |
| Smart Contract | Code deployed to a blockchain that executes rules automatically. |
| Solidity | Programming language used to write Ethereum smart contracts. |
| Sepolia | Ethereum test network used for development. |
| Testnet | Blockchain network for testing with no real-value currency. |
| MetaMask | Browser wallet used to manage accounts, sign messages, and sign transactions. |
| Wallet Address | Public identifier for a blockchain account. |
| Private Key | Secret key that controls a wallet and must never be shared. |
| Gas | Fee paid to run blockchain transactions. |
| Transaction | A signed blockchain action that changes state. |
| IPFS | Distributed content-addressed file storage network. |
| CID | Content identifier for an IPFS file. |
| Pinata | Service that pins files to IPFS and keeps them available. |
| AES Encryption | Symmetric encryption algorithm used to protect files. |
| Symmetric Encryption | Encryption where one secret key encrypts and decrypts. |
| Client-side Encryption | Encryption performed in the browser before upload. |
| PostgreSQL | Relational database used for profiles and institution metadata. |
| Prisma | Node.js database toolkit and ORM used for PostgreSQL schema and queries. |
| REST API | HTTP API style using routes and JSON. |
| ethers.js | JavaScript library for Ethereum wallet and contract interaction. |
| Hardhat | Ethereum development framework for compile and deploy tasks. |
| OpenZeppelin | Library of audited Solidity building blocks. |
| RandomForestClassifier | scikit-learn machine learning model using many decision trees. |
| joblib | Python tool for saving and loading trained models. |
| FastAPI | Python web framework used for the ML prediction API. |
| CORS | Browser policy configuration for cross-origin API requests. |
| React Context | React state-sharing mechanism used for wallet and user profile data. |
| ABI | Contract interface description used by ethers.js. |
| Institution | In this project, a registered hospital or clinic that can manage doctor membership. |

## 13. KNOWN LIMITATIONS & FUTURE IMPROVEMENTS

Known limitations are important because this project is a prototype, not a hospital-ready production system. Wallet loss can mean permanent record loss because encryption depends on wallet-based key material. Sepolia is a testnet only. The ML model is not a certified medical tool. The smart contract has not received a formal security audit. Institution admins are self-registered, so there is no real-world KYC or authority verification. There is also no mobile app, and the interface is designed for desktop browsers with MetaMask.

Future improvements include mainnet deployment with gas optimization, social recovery or multi-signature wallets for patients, federated learning for the ML model, a mobile app using React Native, real hospital KYC verification, support for more diseases beyond diabetes, and integration with existing Kurdish hospital systems. Another important improvement would be a formal key-sharing design so patients can grant encrypted record access without sharing raw signatures outside the application. That would make the privacy model stronger and more practical for real healthcare use.
