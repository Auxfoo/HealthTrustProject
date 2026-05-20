# Usability Testing Plan

Date: 2026-05-21

## Status

Usability testing requires real participants. It cannot be completed from the terminal because users must interact with the UI, think aloud, and complete the System Usability Scale questionnaire.

Current status: Prepared, not yet executed with participants.

## Participants

Recommended participant mix:

| Role | Target participants |
| --- | --- |
| Patients | 4 |
| Doctors | 4 |
| Institution admins | 2 |

## Test Environment

Use the local app:

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

Each participant needs access to a MetaMask wallet on Sepolia. Use fake sample records only.

## Tasks

| Task | Target time | Success criteria | Result |
| --- | --- | --- | --- |
| Register and connect wallet | Less than 3 minutes | User reaches correct dashboard | Pending |
| Patient uploads a medical record | Less than 4 minutes | Record appears with metadata | Pending |
| Patient reads upload progress | Less than 1 minute | User understands whether upload is encrypting, waiting for MetaMask, saving metadata, or complete | Pending |
| Patient grants doctor access | Less than 3 minutes | Doctor can view/decrypt record | Pending |
| Patient toggles Important/Emergency flags | Less than 1 minute | User understands the selected flag state | Pending |
| Patient grants institution access | Less than 3 minutes | Institution admin sees shared record | Pending |
| Doctor views record and adds note | Less than 3 minutes | Patient can see note | Pending |
| Doctor sends care document | Less than 3 minutes | Patient sees document and can download PDF | Pending |
| Patient downloads branded care-document PDF | Less than 1 minute | PDF opens and user can identify title, doctor/patient metadata, and content | Pending |
| Patient exports audit report PDF | Less than 1 minute | PDF opens and user can identify the audit timeline | Pending |
| Doctor reviews Notes/Documents/Membership history | Less than 2 minutes | User can identify record, status/type, date, and message without confusion | Pending |
| Doctor runs diabetes prediction | Less than 2 minutes | Prediction result appears and history updates | Pending |
| Doctor submits institution membership request | Less than 2 minutes | User can identify available institutions and cannot choose the same pending/approved institution again | Pending |
| Doctor requests emergency access | Less than 2 minutes | Dropdown is understandable and excludes already accessible records | Pending |
| Institution admin approves doctor request | Less than 2 minutes | Doctor becomes institution member | Pending |
| Institution admin reviews Shared records | Less than 2 minutes | User understands the doctor key count | Pending |
| Institution admin exports audit report PDF | Less than 1 minute | PDF opens and user can identify operational summary and timeline | Pending |
| Institution admin removes doctor | Less than 2 minutes | Doctor is removed and notified | Pending |

## What To Observe

- Did the user understand which role they were in?
- Did MetaMask prompts make sense?
- Did the user understand that the patient grants access from the patient record list?
- Did the upload status indicator explain what was happening after MetaMask confirmation?
- Did Important/Emergency flag states make sense?
- Did empty-state messages help when no notes, documents, history, or shared records existed?
- Did the doctor understand that records require both access and key envelopes?
- Did the doctor histories for notes, documents, and membership make sense?
- Did the admin understand Doctor Requests and doctor removal?
- Did the admin understand the shared-record doctor key count?
- Did participants understand the exported PDFs as reports, not replacements for original uploaded records?
- Did the doctor understand why some emergency records or institutions are hidden from dropdowns?
- Were success/error notifications visible without blocking important controls?

## SUS Questionnaire

After completing the tasks, each participant should answer the standard System Usability Scale questions from 1 strongly disagree to 5 strongly agree.

Target score: above 68/100.

Actual average SUS score: Pending.

## Observations Template

| Participant | Role | Completed tasks | Issues observed | Suggestions | SUS score |
| --- | --- | --- | --- | --- | --- |
| P01 | Patient | Pending | Pending | Pending | Pending |
| P02 | Patient | Pending | Pending | Pending | Pending |
| D01 | Doctor | Pending | Pending | Pending | Pending |
| D02 | Doctor | Pending | Pending | Pending | Pending |
| A01 | Institution admin | Pending | Pending | Pending | Pending |
