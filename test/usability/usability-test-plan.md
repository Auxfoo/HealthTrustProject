# Usability Testing Plan

Date: 2026-05-19

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
| Patient grants doctor access | Less than 3 minutes | Doctor can view/decrypt record | Pending |
| Patient grants institution access | Less than 3 minutes | Institution admin sees shared record | Pending |
| Doctor views record and adds note | Less than 3 minutes | Patient can see note | Pending |
| Doctor sends care document | Less than 3 minutes | Patient sees document and can download PDF | Pending |
| Doctor runs diabetes prediction | Less than 2 minutes | Prediction result appears and history updates | Pending |
| Institution admin approves doctor request | Less than 2 minutes | Doctor becomes institution member | Pending |
| Institution admin removes doctor | Less than 2 minutes | Doctor is removed and notified | Pending |

## What To Observe

- Did the user understand which role they were in?
- Did MetaMask prompts make sense?
- Did the user understand that the patient grants access from the patient record list?
- Did empty-state messages help when no notes, documents, history, or shared records existed?
- Did the doctor understand that records require both access and key envelopes?
- Did the admin understand Doctor Requests and doctor removal?
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
