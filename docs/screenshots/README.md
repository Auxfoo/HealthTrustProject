# Screenshot Evidence

This folder contains graduation-project screenshot evidence.

Submission screenshot set:

| # | Filename | Evidence shown |
| --- | --- | --- |
| 1 | `01-login-register.png` | Login/register or wallet connection screen. |
| 2 | `02-patient-dashboard.png` | Patient dashboard with records/stat cards/tabs. |
| 3 | `03-patient-upload.png` | Patient upload workflow with status indicator and uploaded record list. |
| 4 | `04-access-modal.png` | Access grant/revoke modal with doctor and institution controls. |
| 5 | `05-doctor-records.png` | Doctor records screen with View action and workflow tabs. |
| 6 | `06-prediction-result.png` | Diabetes prediction result with probability bar, model values, and non-diagnosis notice. |
| 7 | `07-institution-dashboard.png` | Institution dashboard with Doctor Requests, Shared records, and key counts. |
| 8 | `08-notifications.png` | Notifications tab with notification rows and mark-read action. |
| 9 | `09-security-model.png` | Security Model tab explaining encryption, IPFS, blockchain access, and revocation limits. |
| 10 | `10-audit-pdf.png` | Exported HealthTrust audit/care PDF with header and timeline/content evidence. |

Suggested report figure mapping:

| Figure | Screenshot evidence |
| --- | --- |
| Figure 4.1: Patient Registration and Record Upload Screen | `01-login-register.png`, `03-patient-upload.png` |
| Figure 4.2: Doctor Dashboard and Authorized Records Screen | `05-doctor-records.png`, `06-prediction-result.png` |
| Figure 4.3: Institution Dashboard and Membership Management | `07-institution-dashboard.png` |
| Figure 4.4: Access Grant and Revoke Flow | `04-access-modal.png` plus a record list state before/after revoke |
| Figure 4.5: Notifications and Audit Evidence | `08-notifications.png`, `10-audit-pdf.png` |
| Figure 4.6: Security Model | `09-security-model.png` |

Rules:

- Use fake sample records only.
- Use Sepolia test wallets only.
- Do not show private keys, seed phrases, real patient data, or secret environment values.
- Crop screenshots only enough to remove browser clutter; keep the page content visible.
- Keep the visible UI state meaningful: show upload status, key-envelope counts, histories, notifications, prediction results, and section headers where possible.
- When capturing the service status bar, use a frontend `.env` with current `VITE_API_URL`, `VITE_ML_URL`, and `VITE_SEPOLIA_RPC_URL` values so Backend, ML, and Sepolia status indicators match the demo environment.
