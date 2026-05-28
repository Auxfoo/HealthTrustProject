# Integration Testing Results

Date: 2026-05-28

Integration testing checks whether separate parts of HealthTrust work together correctly.

## How To Run Automated Integration Checks

Backend routes and wallet auth:

```powershell
cd backend
npm test
```

Smart contract with local Hardhat chain:

```powershell
cd blockchain
npm test
```

Frontend integration/build check:

```powershell
cd frontend
npm run build
```

ML pipeline:

```powershell
cd ml_service
.\.venv\Scripts\activate
python train.py
```

ML prediction logic:

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

## Latest Automated Results

| Integrated components | Check performed | Result |
| --- | --- | --- |
| Backend authentication middleware and protected routes | `npm test` in `backend` | PASS |
| Smart contract and Hardhat local chain | `npm test` in `blockchain` | PASS |
| React frontend and shared contract config imports | `npm run build` in `frontend` | PASS |
| ML training pipeline and saved model artifact | `train.py` created `model.pkl` | PASS |
| FastAPI prediction logic and trained model | Direct call to `main.predict(...)` | PASS |

All results verified on 2026-05-28.

## Covered Behavior

| Behavior | Evidence |
| --- | --- |
| Wallet signatures protect backend routes | Backend auth tests passed. |
| Doctor access can be granted and revoked per record | Blockchain tests passed. |
| Institution-level access works for institution doctors | Blockchain tests passed. |
| Contract supports clinician-created patient-owned records | Blockchain tests passed. |
| Frontend compiles with current patient, doctor, institution, modal, and prediction UI | Frontend build passed. |
| ML service accepts the current diabetes prediction dataset fields | Direct prediction returned valid JSON. |
| Patient upload UI can represent each async step without relying only on auto-dismissed toast messages | Frontend build passed; browser confirmation required. |
| Doctor notes/documents/membership histories use the current structured row components | Frontend build passed; browser confirmation required. |
| Institution Shared tab can show doctor key counts | Frontend build passed; browser confirmation required. |
| Branded PDF report utility is imported by patient and institution dashboards | Frontend build passed; browser confirmation required. |
| Doctor membership requests are duplicate-safe in the UI/backend flow | Frontend build passed and backend routes are covered by app-level checks; browser confirmation required. |
| Emergency record dropdown hides already accessible records | Frontend build passed; browser confirmation required. |
| Full Kurdish/English bilingual support on Register, Notes form, Documents form, and all tabs | Frontend build passed; Kurdish toggle browser confirmation required. |
| Blood type select options in registration and patient profile | Frontend build passed; browser confirmation required. |
| Patient Notes tab renders section header and formats status labels | Frontend build passed; browser confirmation required. |
| Patient Documents tab renders section header | Frontend build passed; browser confirmation required. |
| Audit PDF rows skip Record # prefix for notification entries (null recordId guard) | Frontend build passed; browser PDF download confirmation required. |
| Prediction history returns all records with no 50-record backend cap | Backend change verified; browser history list confirmation required. |
| `loadRecords()` error handling surfaces failures as toast notifications | Frontend build passed; browser error-state confirmation required. |
| Wallet addresses in doctor Documents and History tabs render inside `<bdi>` for RTL | Frontend build passed; Kurdish RTL browser confirmation required. |
| ServiceStatus uses `VITE_ML_URL` and performs a live Sepolia JSON-RPC check | Frontend build passed; browser service bar confirmation required. |

## Browser Integration Checks

These require the app running and MetaMask available.

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

Then test:

| Workflow | Expected result |
| --- | --- |
| Patient uploads sample PDF | Encrypted file is pinned and record appears. |
| Patient grants doctor access | Doctor sees record after key envelope exists. |
| Doctor clicks View | MetaMask decrypts key envelope and file downloads. |
| Patient grants institution access | Institution admin sees record in Shared tab. |
| New doctor joins institution | Patient must Share keys before that doctor can decrypt old shared records. |
| Admin removes doctor | Doctor receives notification and loses institution-based access. |
| Doctor sends note/document | Patient sees note/document content. |
| Doctor runs prediction | Result and history update. Full history is visible with no count cap. |
| Doctor requests emergency access | Patient sees access request and can approve/reject access/key sharing. |
| Doctor already has access to an emergency record | That record is hidden from the emergency request dropdown. |
| Doctor selects an institution during registration | A membership request is created automatically. |
| Doctor has an existing requested or approved institution membership | That institution is not offered again for another request. |
| Patient or institution exports audit PDF | Branded PDF opens with HealthTrust header, metadata, timeline/summary sections, and footer. Notification rows show no Record # prefix. |
| Patient toggles Important/Emergency flags | Flag state updates and metadata saves in the background. |
| Notifications tab | Unread notifications can be marked read. |

## Not Fully Automated

These workflows require real browser/MetaMask interaction:

- Sepolia transaction confirmations
- Pinata upload using real API keys
- Multi-wallet role testing
- Real decrypt/download using MetaMask
- Visual checks for UI details such as checkboxes, badges, notifications, and history rows
- Usability testing with participants
