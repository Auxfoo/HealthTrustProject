# System Testing

Date: 2026-05-28

System testing checks HealthTrust from the user's point of view across patient, doctor, and institution admin workflows.

## Automated Readiness Results

| Area | Result |
| --- | --- |
| Backend automated tests | PASS, 4 tests passed |
| Blockchain local Hardhat tests | PASS, 3 tests passed |
| Frontend production build | PASS |
| ML model training | PASS, accuracy 0.97 and Brier score 0.0237 |
| ML prediction smoke test | PASS, prediction 1, probability 0.8287, model probability 0.0553, clinical probability 0.8287 |
| Glucose context check | PASS, same glucose value changes risk by context and the 199/200 glucose transition is smooth |

Blockchain tests were verified on 2026-05-28. Backend tests, frontend build, ML prediction smoke test, and glucose-context checks were re-verified on 2026-05-29 after the prediction update.

## Full System Startup

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

## Browser Test Environment

| Requirement | Configuration |
| --- | --- |
| Network | Sepolia testnet |
| Wallets | Separate MetaMask wallets for patient, doctor, and institution admin |
| Test funds | Sepolia ETH for wallets that send transactions |
| Storage | Pinata credentials configured in backend `.env` |
| Contract | `backend\.env` `CONTRACT_ADDRESS` matches `shared\contractConfig.js` |
| Frontend status RPC | `frontend\.env` `VITE_SEPOLIA_RPC_URL` points to a working Sepolia JSON-RPC endpoint |
| Test data | Fake PDFs from `sample_records` |

## End-To-End Validation Matrix

| Test Case | Workflow | Expected Result |
| --- | --- | --- |
| TC01 | Patient registration | Patient dashboard opens for the registered wallet. |
| TC02 | Doctor registration | Doctor dashboard opens and MetaMask encryption public key is saved. |
| TC03 | Institution registration | Hospital or clinic is saved locally and registered on-chain. |
| TC04 | Patient upload | File is encrypted in the browser, pinned to IPFS, written on-chain, and listed in patient records. |
| TC05 | Upload status | UI shows encryption, IPFS upload, MetaMask confirmation, metadata save, and success/error states. |
| TC06 | Record flags | Important and Emergency-visible flags save and remain visible after refresh. |
| TC07 | Empty patient state | Empty records tab shows a clear empty-state message. |
| TC08 | Grant doctor access | Doctor sees the record only after on-chain permission and key envelope both exist. |
| TC09 | Revoke doctor access | Doctor loses future authorized access and the key envelope is removed. |
| TC10 | Grant institution access | Institution admin sees the shared record and doctor key count. |
| TC11 | New institution doctor | Newly added institution doctors need a patient-created key envelope before decrypting old shared records. |
| TC12 | Remove institution doctor | Doctor receives a notification and loses institution-based access. |
| TC13 | Doctor decrypts record | Doctor clicks View, MetaMask decrypts the key envelope, and the original file downloads. |
| TC14 | PDF prediction auto-fill | Readable diabetes vitals PDF fills the prediction form. |
| TC15 | Diabetes prediction | Risk result, probability meter, glucose context, contributing-values card, and prediction history update. |
| TC16 | Doctor note | Patient sees the note and the doctor Notes History updates. |
| TC17 | Doctor care document | Patient sees the care document and doctor Documents History updates. |
| TC18 | Care-document PDF export | Downloaded PDF opens with HealthTrust branding, metadata cards, visual accents, and readable content. |
| TC19 | Patient audit PDF export | Audit report opens with HealthTrust branding, metadata cards, and access timeline. |
| TC20 | Institution audit PDF export | Institution report opens with operational summary, timeline, and security note. |
| TC21 | Doctor membership request | Admin sees the request and doctor Membership History updates. |
| TC22 | Automatic membership request | Selecting an institution during doctor registration creates a membership request. |
| TC23 | Duplicate membership prevention | Existing requested or approved institutions are hidden from the doctor's membership dropdown. |
| TC24 | Emergency access request | Patient sees the emergency request and can approve or reject access/key sharing. |
| TC25 | Emergency dropdown filtering | Records already accessible to the doctor are hidden from the emergency request dropdown. |
| TC26 | Notifications | Toasts auto-dismiss and notification panels show role-specific events. |
| TC27 | Security model tabs | Patient, doctor, and institution dashboards show the Security Model content. |
| TC28 | Empty role tabs | Empty notes, documents, history, requests, and shared-record tabs show clean empty states. |
| TC29 | Invalid wallet input | Invalid wallet addresses show validation errors and do not send transactions. |
| TC30 | Unsupported file or wrong key | Unsupported or incorrectly decrypted files show an error and do not expose content. |
| TC31 | Language toggle | Switching to Kurdish translates all labels in Register, Patient, Doctor, and Institution dashboards, including Notes/Documents forms. English remains the fallback. |
| TC32 | Blood type select | Registration and patient profile show a blood type dropdown with A+, A-, B+, B-, AB+, AB-, O+, O- options. Free text is not accepted. |
| TC33 | Patient notes status labels | Notes tab displays status as "Reviewed", "Follow Up", or "Urgent" rather than raw database values. |
| TC34 | Patient notes and documents headers | Notes tab shows a "Doctor Notes" section header. Documents tab shows a "Care Documents" section header. |
| TC35 | Audit PDF notification rows | Exported patient audit PDF does not include "Record #" prefix for notification-type audit entries. |
| TC36 | Full prediction history | Doctor prediction history shows all records. A doctor with more than 50 predictions can see all of them. |
| TC37 | loadRecords error handling | If backend is unavailable when patient loads dashboard, a toast error appears rather than a silent failure. |
| TC38 | RTL wallet addresses | In Kurdish mode, wallet addresses in doctor Documents and Prediction History tabs remain left-to-right and do not break layout. |
| TC39 | Service status bar | Service status bar shows live status for Backend, ML, and Sepolia using `VITE_API_URL`, `VITE_ML_URL`, and `VITE_SEPOLIA_RPC_URL`. Refresh button updates all three. Sepolia shows offline when the configured RPC endpoint is unreachable. |
| TC40 | Glucose context | Doctor selects unknown, fasting, random, or 2-hour/after-meal context. A glucose value of 180 is interpreted differently by context, and 199/200 does not create a large hard-threshold jump. |

## Demonstration Flow

1. Register institution admin and create an institution.
2. Register doctor and save the MetaMask encryption public key.
3. Register patient and upload `sample_diabetes_vitals.pdf`.
4. Patient toggles Important and Emergency-visible flags.
5. Patient grants doctor access from Manage Access.
6. Doctor views and decrypts the record.
7. Doctor selects glucose test context, runs the diabetes prediction, and reviews History.
8. Doctor adds a note and sends a care document.
9. Patient reviews notes/documents and downloads the branded care-document PDF.
10. Patient exports the audit PDF.
11. Patient grants institution access.
12. Doctor requests membership or creates the automatic request during registration.
13. Admin approves membership and reviews Shared records.
14. Institution admin exports the institution audit PDF.
15. Patient shares keys if a new institution doctor needs access to an old shared record.
16. Doctor checks emergency request filtering.
17. Admin removes doctor and doctor receives a notification.

## Screenshot Evidence

| Screenshot | File |
| --- | --- |
| Login/register | `docs/screenshots/01-login-register.png` |
| Patient dashboard | `docs/screenshots/02-patient-dashboard.png` |
| Upload controls | `docs/screenshots/03-patient-upload.png` |
| Access grant/revoke modal | `docs/screenshots/04-access-modal.png` |
| Doctor records, prediction form, and histories | `docs/screenshots/05-doctor-records.png` |
| Prediction result | `docs/screenshots/06-prediction-result.png` |
| Institution dashboard | `docs/screenshots/07-institution-dashboard.png` |
| Notifications | `docs/screenshots/08-notifications.png` |
| Security model | `docs/screenshots/09-security-model.png` |
