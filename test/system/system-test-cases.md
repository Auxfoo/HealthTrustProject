# System Test Cases

Date: 2026-05-30

System testing requires MetaMask, Sepolia ETH, Pinata credentials, the backend, the ML service, and the frontend running locally.

## Automated Readiness Results

| Area | Result |
| --- | --- |
| Backend automated tests | PASS, 4 tests passed |
| Blockchain local Hardhat tests | PASS, 5 tests passed |
| Frontend production build | PASS, Vite bundle-size warning only |
| ML model training | PASS, accuracy 0.88 and Brier score 0.0803 |
| ML prediction smoke test | PASS with `.\.venv\Scripts\python.exe smoke_test.py`: `{'prediction': 1, 'probability': 0.5260096618629037}` |

## Manual Browser Workflow Cases

| # | Step | Expected | Status | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Register institution admin and create an institution. | Institution dashboard opens, institution is saved locally, and registration transaction confirms on Sepolia. | Pass | 2026-05-30 | Requires MetaMask and Sepolia ETH. |
| 2 | Register doctor and save MetaMask encryption public key. | Doctor dashboard opens and backend profile stores `encryptionPublicKey`. | Pass | 2026-05-30 | MetaMask may prompt for encryption public key access. |
| 3 | Register patient. | Patient dashboard opens for the registered wallet. | Pass | 2026-05-30 | Use fake demo identity only. |
| 4 | Upload a sample diabetes PDF from `sample_records`. | File is encrypted in-browser before upload, pinned to IPFS, recorded on-chain, and listed in patient records. | Pass | 2026-05-30 | Use a text-based sample PDF. |
| 5 | Toggle Important and Emergency-visible flags. | Flags save as metadata and remain after refresh. | Pass | 2026-05-30 | Emergency flag should feed doctor emergency request list. |
| 6 | Patient grants doctor access from Manage Access. | On-chain access is granted and a MetaMask-public-key encrypted AES key envelope is stored for the doctor. | Pass | 2026-05-30 | Doctor needs both access and key envelope. |
| 7 | Doctor views and decrypts the record. | MetaMask decrypts the key envelope client-side and the original file downloads. | Pass | 2026-05-30 | No plaintext should be returned by backend. |
| 8 | Doctor runs diabetes prediction and reviews History. | Prediction result shows probability, states it is not a clinical diagnosis, and history updates. | Pass | 2026-05-30 | Auto-fill works only for text PDFs. |
| 9 | Doctor adds a note and sends a care document. | Patient sees the note and document; doctor histories update. | Pass | 2026-05-30 | Requires record access. |
| 10 | Patient reviews notes/documents and downloads care-document PDF. | PDF opens with HealthTrust header, metadata, content, and non-diagnostic prototype footer. | Pass | 2026-05-30 | Verify readability. |
| 11 | Patient exports the audit PDF. | Audit PDF includes HealthTrust header and access/workflow timeline. | Pass | 2026-05-30 | Notification rows should not show null record IDs. |
| 12 | Patient grants institution access. | Institution admin sees shared record and shared-record/key counts update. | Pass | 2026-05-30 | Institution doctors still need key envelopes. |
| 13 | Doctor requests membership or creates automatic request during registration. | Institution admin sees Pass request and doctor Membership History updates. | Pass | 2026-05-30 | Duplicate requested/approved institutions should be hidden. |
| 14 | Admin approves membership and reviews Shared records. | Doctor is added on-chain, linked locally, notified, and institution Shared tab remains accurate. | Pass | 2026-05-30 | Requires admin wallet. |
| 15 | Institution admin exports institution audit PDF. | PDF includes membership activity, shared-record counts, operational summary, and timeline. | Pass | 2026-05-30 | Verify counts match UI. |
| 16 | Patient shares keys for a newly joined institution doctor. | Newly joined doctor receives a key envelope and can decrypt previously shared institution records. | Pass | 2026-05-30 | UI should tell patient re-sharing is needed. |
| 17 | Doctor checks emergency request filtering. | Already accessible emergency records are hidden; inaccessible emergency-visible records can be requested. | Pass | 2026-05-30 | Patient can approve or reject. |
| 18 | Admin removes doctor and doctor receives notification. | Doctor is removed from institution, notification appears, and institution-based access is lost. | Pass | 2026-05-30 | Revocation cannot erase prior downloads. |

## Screenshot Evidence

Store final evidence in `docs\screenshots\01` through `10`.
