# HealthTrust Graduation TODO

Use this checklist before final submission and demo.

## Readiness Status

Automated checks passed on 2026-05-21:

- Backend tests: PASS.
- Blockchain tests: PASS.
- Frontend production build: PASS.
- ML training: PASS, accuracy 0.9689.
- ML prediction smoke test: PASS, output `{'prediction': 0, 'probability': 0.08}`.

Not final-submission ready until the screenshot files are captured and `test/system/system-test-cases.md` is filled with real PASS/FAIL browser results from MetaMask/Sepolia/IPFS testing.

## 1. Screenshots

Save screenshots in `docs/screenshots`.

- [ ] `01-login-register.png` - login/connect wallet or register page.
- [ ] `02-patient-dashboard.png` - patient dashboard with cards, tabs, and records.
- [ ] `03-patient-upload.png` - patient registration/upload workflow with metadata controls, upload status indicator, and uploaded record list.
- [ ] `04-access-modal.png` - Manage Access modal with doctor/institution grant, revoke, and key-envelope visibility.
- [ ] `05-doctor-records.png` - doctor accessible records page with View action, notes history, documents history, and membership history styling.
- [ ] `06-prediction-result.png` - diabetes prediction result, probability meter, and main contributing values card.
- [ ] `07-institution-dashboard.png` - institution dashboard with doctors, Doctor Requests, Shared records, and doctor key count.
- [ ] `08-notifications.png` - notifications tab with mark-read action.
- [ ] `09-security-model.png` - Security Model tab.
- [ ] `10-exported-pdf-report.png` - branded HealthTrust PDF report opened in a PDF viewer.

Optional screenshots:

- [ ] Patient audit trail.
- [ ] Patient notifications.
- [ ] Doctor notes tab.
- [ ] Doctor care document tab.
- [ ] Institution doctor request approval.
- [ ] Access revoke state after removing a doctor key envelope.
- [ ] Emergency/Important checkbox states.

## 2. Manual Browser Tests

Update `test/system/system-test-cases.md` after running these.

- [ ] Patient registration works.
- [ ] Doctor registration works and encryption public key is saved.
- [ ] Institution admin registration works.
- [ ] Institution can be registered on Sepolia.
- [ ] Patient can upload a sample PDF.
- [ ] Patient upload status progresses through encryption, IPFS upload, transaction submitted, metadata save, and success/error.
- [ ] Patient can grant doctor access.
- [ ] Doctor can view/decrypt/download the record.
- [ ] Patient can revoke doctor access.
- [ ] Patient can mark records Important and Emergency-visible.
- [ ] Doctor can request emergency access to an emergency-visible record.
- [ ] Patient can grant institution access.
- [ ] Institution admin can see shared record.
- [ ] Doctor can request institution membership.
- [ ] Institution admin can approve doctor membership.
- [ ] Institution admin can remove doctor.
- [ ] Removed doctor receives notification.
- [ ] Doctor can add a note.
- [ ] Patient can see doctor note.
- [ ] Doctor can send care document.
- [ ] Patient can see care document and download PDF.
- [ ] Patient care-document PDF has HealthTrust branding, metadata cards, visual accents, and readable content.
- [ ] Patient can export branded audit PDF.
- [ ] Institution admin can export branded institution audit PDF.
- [ ] Doctor can run diabetes prediction.
- [ ] Prediction history updates.
- [ ] Doctor registration with selected institution creates an automatic membership request.
- [ ] Doctor cannot request the same institution twice while pending or already approved.
- [ ] Doctor emergency dropdown hides records that are already accessible.
- [ ] Empty tabs show clean empty-state messages.
- [ ] Doctor notes, documents, and membership histories are visible.
- [ ] Notifications tab works for patient, doctor, and admin.
- [ ] Security Model tab is available for each dashboard.

## 3. Test Evidence

- [ ] Run backend tests: `cd backend && npm test`.
- [ ] Run blockchain tests: `cd blockchain && npm test`.
- [ ] Run frontend build: `cd frontend && npm run build`.
- [ ] Run ML training: `cd ml_service && python train.py`.
- [ ] Run ML prediction smoke test from `README.md`.
- [ ] Update latest results in `test/README.md`.
- [ ] Update latest results in `test/unit/unit-test-results.md`.
- [ ] Update latest results in `test/integration/integration-test-results.md`.

## 4. Demo Preparation

- [ ] Confirm backend `.env` `CONTRACT_ADDRESS` matches `shared/contractConfig.js`.
- [ ] Confirm backend and blockchain `.env` files use real Sepolia RPC URLs, not `your_api_key`.
- [ ] Confirm MetaMask is on Sepolia.
- [ ] Confirm patient, doctor, and institution admin wallets have Sepolia ETH.
- [ ] Confirm Pinata API keys work.
- [ ] Confirm PostgreSQL is running.
- [ ] Confirm backend is running on `http://localhost:5000`.
- [ ] Confirm ML service is running on `http://localhost:8000`.
- [ ] Confirm frontend is running on `http://localhost:5173`.
- [ ] Upload at least one sample record before demo.
- [ ] Prepare one doctor access grant before demo, or practice doing it live.
- [ ] Prepare one prediction example using `sample_diabetes_vitals.pdf`.
- [ ] Prepare one short fake diabetes prescription/care document for the doctor document demo.
- [ ] Download one care-document PDF and one audit PDF before demo to confirm the browser can open them.

## 5. Documentation Cleanup

- [ ] Add screenshots into the final written report.
- [ ] Replace manual test `Pending` entries with `PASS` or `FAIL`.
- [ ] Add tester name/date/contract address in `test/system/system-test-cases.md`.
- [ ] Add actual SUS/usability results if participants test the app.
- [ ] Check README setup commands one final time.
- [ ] Check `PROJECT_GUIDE.md` for spelling and formatting.
- [ ] Confirm `TEAM_SETUP.md`, `docs/screenshots/README.md`, and all `test/*.md` evidence files match the current UI.
- [ ] Make sure no `.env`, private key, seed phrase, or real medical data is committed.

## 6. Final Defense Talking Points

- [ ] Explain why files are not stored on blockchain.
- [ ] Explain client-side encryption.
- [ ] Explain IPFS CID storage.
- [ ] Explain patient-controlled permissions.
- [ ] Explain revocation limitation: future access only, not already downloaded copies.
- [ ] Explain direct doctor access versus institution access.
- [ ] Explain encrypted AES key envelopes.
- [ ] Explain audit transparency from blockchain events.
- [ ] Explain diabetes prediction inputs and why it is not diagnosis.
- [ ] Explain why key envelopes are needed in addition to on-chain permission.
- [ ] Explain why clearing PostgreSQL data does not clear Sepolia/on-chain demo state.
- [ ] Explain prototype limitations and future work.
