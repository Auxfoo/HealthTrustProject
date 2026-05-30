# HealthTrust Test Evidence

This folder stores testing evidence and manual validation plans. Keep detailed run output here instead of duplicating it in the root README.

## Folders

| Folder | Purpose |
| --- | --- |
| `unit/` | Automated backend, blockchain, frontend build, and ML run results. |
| `integration/` | Cross-component integration evidence and integration gaps to automate next. |
| `system/` | Manual browser workflow test cases for patient, doctor, and institution admin flows. |

## Where To Look

- Latest automated terminal results: `unit/unit-test-results.md`
- Integration coverage and missing automated integrations: `integration/integration-test-results.md`
- Manual 18-step browser checklist: `system/system-test-cases.md`

Manual browser tests require MetaMask, Sepolia ETH, real Pinata/IPFS credentials in local `.env`, and multiple wallets.
