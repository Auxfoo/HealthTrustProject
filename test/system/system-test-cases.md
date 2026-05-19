# System Testing

Date: 2026-05-19

System testing checks the full HealthTrust application from the user's point of view.

## Start The Full System

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

## Required Browser Setup

- Use MetaMask on Sepolia.
- Use separate wallets for patient, doctor, and institution admin.
- Give each wallet enough Sepolia ETH for transactions.
- Configure backend Pinata keys.
- Deploy the latest contract and confirm `shared\contractConfig.js` and `backend\.env` use the same address.
- Use fake PDFs from `sample_records`.

## Automated System Readiness

| Area | Status |
| --- | --- |
| Backend automated tests | PASS |
| Blockchain local Hardhat tests | PASS |
| Frontend production build | PASS |
| ML model training and prediction smoke test | PASS |
| Full browser testing with MetaMask | Manual |

## Manual Test Execution Log

Fill this table after running the browser test flow with real MetaMask Sepolia test accounts.

| Field | Value |
| --- | --- |
| Tester name | To fill |
| Test date | To fill |
| Contract address | To fill |
| Patient wallet | To fill |
| Doctor wallet | To fill |
| Institution admin wallet | To fill |
| Pinata upload verified | To fill |
| ML service running | To fill |

## Manual End-To-End Test Cases

| Test Case | Input | Expected Output | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| TC01: Patient registration | New wallet registers as patient | Patient dashboard opens | To run | Pending |  |
| TC02: Doctor registration | New wallet registers as doctor and encryption key is registered | Doctor dashboard opens and can receive key envelopes | To run | Pending |  |
| TC03: Institution registration | Admin wallet registers hospital/clinic | Institution saved and registered on-chain | To run | Pending |  |
| TC04: Upload medical record | Patient uploads sample PDF | File is encrypted, pinned to IPFS, and record appears | To run | Pending |  |
| TC05: Empty patient records | Patient has no records | Records tab shows empty-state text | To run | Pending |  |
| TC06: Grant doctor access | Patient grants record to doctor | Doctor sees record after key envelope is shared | To run | Pending |  |
| TC07: Revoke doctor access | Patient revokes doctor access | Doctor loses future authorized access | To run | Pending |  |
| TC08: Grant institution access | Patient grants institution access | Institution admin sees shared record | To run | Pending |  |
| TC09: New institution doctor | Admin adds or approves a new doctor | Patient must Share keys before doctor can decrypt old records | To run | Pending |  |
| TC10: Remove doctor from institution | Admin removes doctor | Doctor receives notification and loses institution-based access | To run | Pending |  |
| TC11: Doctor decrypts record | Doctor clicks View | Record decrypts/downloads if key envelope is valid | To run | Pending |  |
| TC12: PDF prediction auto-fill | Doctor views `sample_diabetes_vitals.pdf` | Prediction form auto-fills patient wallet and diabetes fields | To run | Pending |  |
| TC13: Doctor note | Doctor chooses record and saves note | Patient sees note | To run | Pending |  |
| TC14: Doctor care document | Doctor chooses record and sends document | Patient sees document content and can download PDF | To run | Pending |  |
| TC15: Diabetes prediction | Doctor submits prediction form | Risk result and history appear | To run | Pending |  |
| TC16: Doctor membership request | Doctor requests institution membership | Admin sees request in Doctor Requests | To run | Pending |  |
| TC17: Empty role tabs | Empty notes, docs, history, requests, shared records | UI shows messages such as No history or No documents | To run | Pending |  |
| TC18: Invalid wallet input | Invalid wallet address | Error toast appears | To run | Pending |  |
| TC19: Unsupported file or wrong key | Invalid encrypted record/key | Error toast appears and content is not shown | To run | Pending |  |
| TC20: Notifications | Doctor removed or prediction run for patient | Notification appears and can be marked read | To run | Pending |  |

## Recommended Manual Test Order

1. Register institution admin.
2. Register institution.
3. Register doctor.
4. Register patient.
5. Patient uploads `sample_diabetes_vitals.pdf`.
6. Patient grants doctor access.
7. Doctor clicks View and confirms decrypt/download and prediction auto-fill.
8. Doctor submits prediction.
9. Doctor adds note.
10. Doctor sends care document.
11. Patient confirms note and document.
12. Patient grants institution access.
13. Doctor requests membership.
14. Admin approves membership.
15. Patient shares keys if needed.
16. Admin removes doctor.
17. Doctor confirms removal notification.

## Screenshot Evidence Checklist

| Screenshot | File | Status |
| --- | --- | --- |
| Login/register | `docs/screenshots/01-login-register.png` | To capture |
| Patient dashboard | `docs/screenshots/02-patient-dashboard.png` | To capture |
| Upload controls | `docs/screenshots/03-patient-upload.png` | To capture |
| Access modal | `docs/screenshots/04-access-modal.png` | To capture |
| Doctor records | `docs/screenshots/05-doctor-records.png` | To capture |
| Prediction result | `docs/screenshots/06-prediction-result.png` | To capture |
| Institution dashboard | `docs/screenshots/07-institution-dashboard.png` | To capture |

## Result Summary

Automated terminal checks passed on 2026-05-19. Manual browser execution is still required for MetaMask, IPFS upload, Sepolia transaction confirmation, and real multi-wallet role workflows.
