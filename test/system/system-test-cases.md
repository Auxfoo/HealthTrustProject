# System Testing

Date: 2026-05-21

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
| UI theme tested | Light / Dark / Both |

## Manual End-To-End Test Cases

| Test Case | Input | Expected Output | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| TC01: Patient registration | New wallet registers as patient | Patient dashboard opens | To run | Pending |  |
| TC02: Doctor registration | New wallet registers as doctor and encryption key is registered | Doctor dashboard opens and can receive key envelopes | To run | Pending |  |
| TC03: Institution registration | Admin wallet registers hospital/clinic | Institution saved and registered on-chain | To run | Pending |  |
| TC04: Upload medical record | Patient uploads sample PDF | File is encrypted, pinned to IPFS, and record appears | To run | Pending |  |
| TC05: Upload status indicator | Patient uploads sample PDF and confirms MetaMask | Status shows encrypting, IPFS upload, transaction submitted, metadata save, and success/error with View tx when available | To run | Pending |  |
| TC06: Important/Emergency flags | Patient toggles record flags | Flag state changes and metadata remains saved after refresh | To run | Pending |  |
| TC07: Empty patient records | Patient has no records | Records tab shows empty-state text | To run | Pending |  |
| TC08: Grant doctor access | Patient grants record to doctor from Manage Access | Doctor sees record after key envelope exists and Grant button shows key icon | To run | Pending |  |
| TC09: Revoke doctor access | Patient revokes doctor access | Doctor loses future authorized access and key envelope is removed from the modal | To run | Pending |  |
| TC10: Grant institution access | Patient grants institution access | Institution admin sees shared record and doctor key count | To run | Pending |  |
| TC11: New institution doctor | Admin adds or approves a new doctor | Patient must Share keys before doctor can decrypt old records | To run | Pending |  |
| TC12: Remove doctor from institution | Admin removes doctor | Doctor receives notification and loses institution-based access | To run | Pending |  |
| TC13: Doctor decrypts record | Doctor clicks View | Record decrypts/downloads if key envelope is valid | To run | Pending |  |
| TC14: PDF prediction auto-fill | Doctor views `sample_diabetes_vitals.pdf` | Prediction form auto-fills patient wallet and diabetes fields | To run | Pending |  |
| TC15: Diabetes prediction | Doctor submits prediction form | Risk result, probability bar, contributing-values card, and history appear | To run | Pending |  |
| TC16: Doctor note | Doctor chooses record and saves note | Patient sees note and doctor Notes History updates | To run | Pending |  |
| TC17: Doctor care document | Doctor chooses record and sends document | Patient sees document content, can download PDF, and doctor Documents History updates | To run | Pending |  |
| TC18: Branded care-document PDF | Patient downloads care document PDF | PDF opens with HealthTrust header, metadata cards, visual accents, and readable content | To run | Pending |  |
| TC19: Patient audit PDF export | Patient exports audit report | PDF opens with HealthTrust header, metadata cards, and audit timeline | To run | Pending |  |
| TC20: Institution audit PDF export | Institution admin exports audit report | PDF opens with operational summary, audit timeline, and security note | To run | Pending |  |
| TC21: Doctor membership request | Doctor requests institution membership | Admin sees request in Doctor Requests and doctor Membership History updates | To run | Pending |  |
| TC22: Automatic membership request | Doctor selects institution during registration | Membership request is created automatically | To run | Pending |  |
| TC23: Duplicate membership prevention | Doctor has pending/approved request | Same institution is hidden from membership dropdown and duplicate request is blocked | To run | Pending |  |
| TC24: Emergency access request | Doctor requests access to emergency-visible record | Patient sees request and can approve/reject access/key sharing | To run | Pending |  |
| TC25: Emergency dropdown filtering | Doctor already has access to a record | Already accessible record does not appear in emergency request dropdown | To run | Pending |  |
| TC26: Notifications | Doctor removed or prediction run for patient | Notification appears, auto-dismiss toast closes after a few seconds, and notification panel can mark read | To run | Pending |  |
| TC27: Security model tabs | Patient, doctor, and admin open Security tab | Security Model content appears | To run | Pending |  |
| TC28: Empty role tabs | Empty notes, docs, history, requests, shared records | UI shows clean empty-state messages | To run | Pending |  |
| TC29: Invalid wallet input | Invalid wallet address | Error toast appears | To run | Pending |  |
| TC30: Unsupported file or wrong key | Invalid encrypted record/key | Error toast appears and content is not shown | To run | Pending |  |

## Recommended Manual Test Order

1. Register institution admin.
2. Register institution.
3. Register doctor.
4. Register patient.
5. Patient uploads `sample_diabetes_vitals.pdf`.
6. Confirm upload status and record list.
7. Patient toggles Important and Emergency flags.
8. Patient grants doctor access.
9. Doctor clicks View and confirms decrypt/download and prediction auto-fill.
10. Doctor submits prediction.
11. Doctor adds note.
12. Doctor sends care document.
13. Patient confirms note and document.
14. Patient downloads branded care-document PDF and exports patient audit PDF.
15. Patient grants institution access.
16. Doctor requests membership, or registers with an institution selected to create the automatic request.
17. Confirm duplicate institution requests are hidden/blocked.
18. Admin approves membership.
19. Institution admin exports branded institution audit PDF.
20. Patient shares keys if needed.
21. Doctor checks emergency dropdown filtering.
22. Admin removes doctor.
23. Doctor confirms removal notification.

## Screenshot Evidence Checklist

| Screenshot | File | Status |
| --- | --- | --- |
| Login/register | `docs/screenshots/01-login-register.png` | To capture |
| Patient dashboard | `docs/screenshots/02-patient-dashboard.png` | To capture |
| Upload controls | `docs/screenshots/03-patient-upload.png` | To capture |
| Access grant/revoke modal | `docs/screenshots/04-access-modal.png` | To capture |
| Doctor records, prediction form, and histories | `docs/screenshots/05-doctor-records.png` | To capture |
| Prediction result | `docs/screenshots/06-prediction-result.png` | To capture |
| Institution dashboard | `docs/screenshots/07-institution-dashboard.png` | To capture |
| Notifications | `docs/screenshots/08-notifications.png` | Optional |
| Security model | `docs/screenshots/09-security-model.png` | Optional |
| Exported PDF report | `docs/screenshots/10-exported-pdf-report.png` | Optional |

## Result Summary

Automated terminal checks passed on 2026-05-21. Manual browser execution is still required for MetaMask, IPFS upload, Sepolia transaction confirmation, PDF export visual confirmation, and real multi-wallet role workflows.
