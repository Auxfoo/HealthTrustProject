# Screenshot Evidence

This folder contains graduation-project screenshot evidence.

Use these filenames:

| Screenshot | Filename |
| --- | --- |
| Login/register or wallet connection | `01-login-register.png` |
| Patient dashboard | `02-patient-dashboard.png` |
| Patient registration/upload workflow with status indicator and uploaded record list | `03-patient-upload.png` |
| Access grant/revoke modal with doctor and institution controls | `04-access-modal.png` |
| Doctor records with View action, prediction form, and notes/documents history | `05-doctor-records.png` |
| Diabetes prediction result with probability bar, glucose context, and contributing values | `06-prediction-result.png` |
| Institution dashboard with Doctor Requests, Shared records, and key count | `07-institution-dashboard.png` |
| Notifications tab with mark-read action | `08-notifications.png` |
| Security Model tab | `09-security-model.png` |

Suggested report figure mapping:

| Figure | Screenshot evidence |
| --- | --- |
| Figure 4.1: Patient Registration and Record Upload Screen | `01-login-register.png`, `03-patient-upload.png` |
| Figure 4.2: Doctor Dashboard and Authorized Records Screen | `05-doctor-records.png`, `06-prediction-result.png` |
| Figure 4.3: Institution Dashboard and Membership Management | `07-institution-dashboard.png` |
| Figure 4.4: Access Grant and Revoke Flow | `04-access-modal.png` plus a record list state before/after revoke |

Rules:

- Use fake sample records only.
- Use Sepolia test wallets only.
- Do not show private keys, seed phrases, real patient data, or secret environment values.
- Crop screenshots only enough to remove browser clutter; keep the page content visible.
- Keep the visible UI state meaningful: show upload status, key-envelope counts, histories, notifications, glucose context, and section headers where possible.
- When capturing the service status bar, use a frontend `.env` with current `VITE_API_URL`, `VITE_ML_URL`, and `VITE_SEPOLIA_RPC_URL` values so Backend, ML, and Sepolia status indicators match the demo environment.
