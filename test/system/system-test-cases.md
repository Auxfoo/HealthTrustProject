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

## Manual End-To-End Test Cases

| Test Case | Input | Expected Output | Status |
| --- | --- | --- | --- |
| TC01: Patient registration | New wallet registers as patient | Patient dashboard opens | Manual |
| TC02: Doctor registration | New wallet registers as doctor and encryption key is registered | Doctor dashboard opens and can receive key envelopes | Manual |
| TC03: Institution registration | Admin wallet registers hospital/clinic | Institution saved and registered on-chain | Manual |
| TC04: Upload medical record | Patient uploads sample PDF | File is encrypted, pinned to IPFS, and record appears | Manual |
| TC05: Empty patient records | Patient has no records | Records tab shows empty-state text | Manual |
| TC06: Grant doctor access | Patient grants record to doctor | Doctor sees record after key envelope is shared | Manual |
| TC07: Revoke doctor access | Patient revokes doctor access | Doctor loses future authorized access | Manual |
| TC08: Grant institution access | Patient grants institution access | Institution admin sees shared record | Manual |
| TC09: New institution doctor | Admin adds or approves a new doctor | Patient must Share keys before doctor can decrypt old records | Manual |
| TC10: Remove doctor from institution | Admin removes doctor | Doctor receives notification and loses institution-based access | Manual |
| TC11: Doctor decrypts record | Doctor clicks View | Record decrypts/downloads if key envelope is valid | Manual |
| TC12: PDF prediction auto-fill | Doctor views `sample_diabetes_vitals.pdf` | Prediction form auto-fills patient wallet and diabetes fields | Manual |
| TC13: Doctor note | Doctor chooses record and saves note | Patient sees note | Manual |
| TC14: Doctor care document | Doctor chooses record and sends document | Patient sees document content and can download PDF | Manual |
| TC15: Diabetes prediction | Doctor submits prediction form | Risk result and history appear | Manual |
| TC16: Doctor membership request | Doctor requests institution membership | Admin sees request in Doctor Requests | Manual |
| TC17: Empty role tabs | Empty notes, docs, history, requests, shared records | UI shows messages such as No history or No documents | Manual |
| TC18: Invalid wallet input | Invalid wallet address | Error toast appears | Manual |
| TC19: Unsupported file or wrong key | Invalid encrypted record/key | Error toast appears and content is not shown | Manual |
| TC20: Notifications | Doctor removed or prediction run for patient | Notification appears and can be marked read | Manual |

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

## Result Summary

Automated terminal checks passed on 2026-05-19. Manual browser execution is still required for MetaMask, IPFS upload, Sepolia transaction confirmation, and real multi-wallet role workflows.
