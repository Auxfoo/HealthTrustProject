# HealthTrust Testing Folder

This folder stores testing evidence, repeatable commands, and manual test plans for the HealthTrust project.

## Folder Structure

| Folder | Purpose |
| --- | --- |
| `unit` | Individual component test results and commands. |
| `integration` | Multi-component test results and commands. |
| `system` | End-to-end browser test cases for patient, doctor, and institution admin workflows. |
| `usability` | Usability testing plan, participant tasks, and SUS questionnaire tracking. |

## Quick Automated Test Run

Run these from the project root in separate commands:

```powershell
cd backend
npm test
```

```powershell
cd ..\blockchain
npm test
```

```powershell
cd ..\frontend
npm run build
```

```powershell
cd ..\ml_service
.\.venv\Scripts\activate
python train.py
```

ML prediction smoke test:

```powershell
cd ml_service
@'
import main
main.load_model()
payload = main.DiabetesInput(
    gender="Female",
    age=54,
    hypertension=0,
    heart_disease=0,
    smoking_history="never",
    bmi=27.32,
    HbA1c_level=6.6,
    blood_glucose_level=140,
)
print(main.predict(payload))
'@ | .\.venv\Scripts\python.exe -
```

## Latest Automated Result

Date: 2026-05-21

| Test area | Latest result |
| --- | --- |
| Backend auth tests | 4 passed, 0 failed |
| Smart contract tests | 3 passed, 0 failed |
| Frontend build | Passed |
| ML training | Passed, accuracy 0.9689 |
| ML prediction smoke test | Passed, prediction 0, probability 0.08 |

## Manual Testing Requirement

Some workflows cannot be completed by terminal commands because they require browser interaction and MetaMask confirmations:

- Patient registration and upload
- Patient upload status indicator and transaction link
- Sepolia transaction confirmations
- Doctor decrypting a real uploaded record
- Patient sharing AES key envelopes
- Patient Important/Emergency flags and emergency access request flow
- Institution membership approval/removal
- Notifications in the browser
- Auto-dismiss toast behavior
- Doctor notes/documents/membership history layout
- Institution shared-key count visibility
- Branded patient care-document PDF export
- Branded patient and institution audit PDF export
- Automatic doctor membership request during registration
- Duplicate-safe institution membership dropdown/request blocking
- Emergency request dropdown filtering for already accessible records
- Security Model tab in each role dashboard
- Usability testing with real participants

Use `system/system-test-cases.md` and `usability/usability-test-plan.md` for those.
