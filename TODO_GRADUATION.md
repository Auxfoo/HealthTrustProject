# Graduation TODO

Last updated: 2026-05-30

## Automated Readiness

- ✅ Backend tests pass: 4 passed, 0 failed.
- ✅ Blockchain tests pass: 5 passed, 0 failed.
- ✅ Frontend production build passes.
- ✅ ML training passes and writes `ml_service\model.pkl`.
- ✅ ML prediction smoke script passes with the project venv: `.\.venv\Scripts\python.exe smoke_test.py`.
- ✅ Prisma schema validation and client generation pass.
- ✅ Backend lint command exits successfully with `--if-present`.
- ✅ Frontend lint command exits successfully with `--if-present`.

## Completed Fixes

- ✅ Backend protected record/access routes require signed wallet auth.
- ✅ Backend error responses include a consistent `error` string.
- ✅ Encrypted upload route validates file type and size.
- ✅ ML service validates bad numeric/category inputs.
- ✅ Smart contract includes audited access and membership methods.
- ✅ Shared contract config has a non-zero address and populated ABI.
- ✅ Documentation reflects the 15 sample diabetes PDFs.

## Remaining Manual Work

- ⬜ Complete 18 manual browser workflow tests with MetaMask and Sepolia ETH.
- ⬜ Capture final screenshots `docs\screenshots\01` through `10`.
- ⬜ Verify Pinata upload with real credentials in local `.env`.
- ⬜ Redeploy contract if the team wants the new ABI on Sepolia.
- ⬜ Reset local demo DB before defense if stale demo data exists.
