# Usability Testing Plan

Date: 2026-05-21

This plan defines how HealthTrust can be evaluated with representative patient, doctor, and institution admin users. The plan is included as supporting evaluation material for the graduation project.

## Participants

| Role | Target participants |
| --- | --- |
| Patients | 4 |
| Doctors | 4 |
| Institution admins | 2 |

## Test Environment

Use the local app with fake sample records and Sepolia test wallets:

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

## Usability Tasks

| Task | Target time | Success criteria |
| --- | --- | --- |
| Register and connect wallet | Less than 3 minutes | User reaches the correct dashboard. |
| Patient uploads a medical record | Less than 4 minutes | Record appears with metadata. |
| Patient reads upload progress | Less than 1 minute | User understands encryption, IPFS upload, MetaMask, metadata, and completion states. |
| Patient grants doctor access | Less than 3 minutes | Doctor can view/decrypt record. |
| Patient toggles Important/Emergency flags | Less than 1 minute | User understands the selected flag state. |
| Patient grants institution access | Less than 3 minutes | Institution admin sees shared record. |
| Doctor views record and adds note | Less than 3 minutes | Patient can see note. |
| Doctor sends care document | Less than 3 minutes | Patient sees document and can download PDF. |
| Patient downloads branded care-document PDF | Less than 1 minute | PDF opens and user can identify title, metadata, and content. |
| Patient exports audit report PDF | Less than 1 minute | PDF opens and user can identify the audit timeline. |
| Doctor reviews Notes/Documents/Membership history | Less than 2 minutes | User can identify record, status/type, date, and message. |
| Doctor runs diabetes prediction | Less than 2 minutes | Prediction result appears and history updates. |
| Doctor submits institution membership request | Less than 2 minutes | User can identify available institutions and cannot choose the same requested or approved institution again. |
| Doctor requests emergency access | Less than 2 minutes | Dropdown is understandable and excludes already accessible records. |
| Institution admin approves doctor request | Less than 2 minutes | Doctor becomes institution member. |
| Institution admin reviews Shared records | Less than 2 minutes | User understands the doctor key count. |
| Institution admin exports audit report PDF | Less than 1 minute | PDF opens and user can identify operational summary and timeline. |
| Institution admin removes doctor | Less than 2 minutes | Doctor is removed and notified. |

## Observation Questions

- Does the user understand which role they are using?
- Are MetaMask prompts understandable during transactions and key decryption?
- Does the patient understand that access is granted from the patient record list?
- Does upload progress explain the current system state?
- Are Important/Emergency flag states clear?
- Do empty-state messages help when no notes, documents, history, or shared records exist?
- Does the doctor understand that records require both access permission and a key envelope?
- Are notes, documents, prediction history, and membership history easy to scan?
- Does the admin understand Doctor Requests, Shared records, key counts, and doctor removal?
- Do exported PDFs read as reports rather than replacements for original uploaded records?
- Does the doctor understand why some emergency records or institutions are hidden from dropdowns?
- Are success/error notifications visible without blocking important controls?

## SUS Questionnaire

After completing the tasks, each participant answers the standard System Usability Scale questions from 1 strongly disagree to 5 strongly agree. A score above 68/100 is the usability target.
