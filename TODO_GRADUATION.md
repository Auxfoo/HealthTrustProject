# HealthTrust Graduation TODO

Use this checklist before final submission and demo.

## 1. Screenshots

Save screenshots in `docs/screenshots`.

- [ ] `01-login-register.png` - login/connect wallet or register page.
- [ ] `02-patient-dashboard.png` - patient dashboard with cards, tabs, and records.
- [ ] `03-patient-upload.png` - upload button and metadata controls.
- [ ] `04-access-modal.png` - Manage Access modal with doctor/institution sharing.
- [ ] `05-doctor-records.png` - doctor accessible records page.
- [ ] `06-prediction-result.png` - diabetes prediction result and probability meter.
- [ ] `07-institution-dashboard.png` - institution dashboard with doctors/shared records/requests.

Optional screenshots:

- [ ] Patient audit trail.
- [ ] Patient notifications.
- [ ] Doctor notes tab.
- [ ] Doctor care document tab.
- [ ] Institution doctor request approval.

## 2. Manual Browser Tests

Update `test/system/system-test-cases.md` after running these.

- [ ] Patient registration works.
- [ ] Doctor registration works and encryption public key is saved.
- [ ] Institution admin registration works.
- [ ] Institution can be registered on Sepolia.
- [ ] Patient can upload a sample PDF.
- [ ] Patient can grant doctor access.
- [ ] Doctor can view/decrypt/download the record.
- [ ] Patient can revoke doctor access.
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
- [ ] Doctor can run diabetes prediction.
- [ ] Prediction history updates.
- [ ] Empty tabs show clean empty-state messages.

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

## 5. Documentation Cleanup

- [ ] Add screenshots into the final written report.
- [ ] Replace manual test `Pending` entries with `PASS` or `FAIL`.
- [ ] Add tester name/date/contract address in `test/system/system-test-cases.md`.
- [ ] Add actual SUS/usability results if participants test the app.
- [ ] Check README setup commands one final time.
- [ ] Check `PROJECT_GUIDE.md` for spelling and formatting.
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
- [ ] Explain prototype limitations and future work.
