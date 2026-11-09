# Verification and pilot acceptance

For the subsequent fixes and fresh verification, see [September 12 improvement review](REVIEW_2026-09-12.md). The results below remain the September 8 historical record.

Verified locally on 8 September 2026 with Node 24.15.0, npm 11.12.1, Windows, Vitest 5 and installed Chrome via Playwright. These results describe this working tree; they do not certify every possible input, browser, provider or device.

## Executed results

| Check                                                                | Result                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run check`                                                      | Passed: coverage, production build, desktop/mobile browser suite  |
| Unit, API, component, transport and deployment tests                 | 169 passed in 10 test files                                       |
| Production browser tests                                             | 8 passed: 4 desktop and 4 Pixel 7 emulation                       |
| Instrumented function coverage                                       | 100%, 261/261                                                     |
| Line coverage                                                        | 97.90%, 933/953                                                   |
| Statement coverage                                                   | 97.17%, 998/1027                                                  |
| Branch coverage                                                      | 89.94%, 626/696                                                   |
| Approved network `npm audit --json`                                  | Zero reported vulnerabilities, including development dependencies |
| Direct `node server/index.js` startup and `scripts/checks/smoke.mjs` | All eight local HTTP checks passed                                |
| `git diff --check`                                                   | Passed; Git reports only Windows line-ending notices              |
| Desktop and mobile visual inspection                                 | Passed; screenshots in `docs/records/screenshots/`                |

The test configuration enforces 100% function, 95% line/statement and 85% branch coverage. Coverage means execution, not proof of correctness. Uncovered paths remain, principally defensive fallbacks, BLE setup/queue failures and deployment-race rejection. Inspect the generated `coverage/index.html` for individual branches. `src/main.jsx` is outside unit instrumentation and is executed by the real production-browser tests, including actual worker registration and storage cleanup. Build/test/smoke scripts are exercised by the commands above; the precache plugin also has regression tests. Static pages, manifest, icon dimensions, build metadata and Render YAML have contract/browser checks. Documentation and historical image assets do not contain executable functions.

## Behavior exercised

| Area                         | Evidence                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server and provider adapters | Route contracts, input limits, image signatures, numeric bounds, cent arithmetic, secrets isolation, disabled services, sanitized failures, malformed upstream results, timeouts, rate limits, no-store headers and private-file rejection |
| Inventory and budgeting      | Photo consent/upload/cancel with provider fixtures; local inventory parsing, overspending, result rendering and clear-session behavior                                                                                                     |
| Benefits and recycling       | Local topic selection and official links; user-confirmed rates and counts; photo count fixtures; no random quotes or eligibility verdicts                                                                                                  |
| Nearby services              | Explicit location consent, zero coordinates, failed/cancelled requests, result rendering, Google directions links and map loader/marker cleanup with fixtures                                                                              |
| Mesh                         | Actual Meshtastic protobuf encoding/decoding, serial framing, BLE characteristic contracts, configuration handshake, duplicate suppression, timeouts, reconnect races, unplug errors and cleanup; transports simulated                     |
| Privacy                      | No participant persistence writes, legacy browser cleanup, empty local/session/IndexedDB storage after browser workflows, disabled reports and no Firebase dependency                                                                      |
| Offline and updates          | Real browser network disabled while manual tools and policies remain usable; only static assets cached; generated worker bytes change with the application; no intercepted API/upload/provider requests                                    |
| Responsive interface         | Complete navigation and core flows at desktop and Pixel 7 sizes; no horizontal overflow or browser page errors in tested flows                                                                                                             |

## Live provider results and deployment status

The existing Gemini credential successfully listed models (HTTP 200). A synthetic text request confirmed that `gemini-2.5-flash` is no longer available to new users (HTTP 404); Google's error recommended `gemini-3.6-flash`. The template now uses that replacement. Generation with a generated 128x128 solid-color PNG returned HTTP 503 twice on `gemini-3.6-flash`; a further check on available `gemini-3.8-flash` also returned 503. No participant photo was sent. The precise provider-side cause is unresolved. **Live photo analysis has not passed acceptance.** The app exposes a recoverable error and manual entry remains available.

Places, Maps JavaScript and Routes are covered by controlled fixtures; their production credentials, enabled APIs, restrictions, quotas and billing have not been verified. Weather has adapter tests, but no live provider acceptance. No physical radio was connected, and no radio message was transmitted to another person.

No Render deployment was created or verified in this session. The repository contains one-service frontend/backend configuration and a launch guide. No Render connector is available in this environment. The Blueprint defaults to external services disabled, so local tools work before provider acceptance. No paid hosting plan or provider account was purchased. Existing Firebase records and live cloud rules were not modified.

## Acceptance before inviting institutions

1. Follow [instructions.md, section 3](../instructions.md#3-host-frontend-and-backend-on-render) to connect the reviewed branch and configure the service. Review the displayed hosting plan, then deploy and run `npm run smoke -- https://YOUR-SERVICE.onrender.com`.
2. For photo analysis, configure an appropriate billing-enabled Gemini project and available model. Run `node scripts/checks/provider-smoke.mjs --live`, then check representative non-personal supply images and both analysis/count workflows. Enable external services only after this succeeds and the institution accepts provider processing.
3. Verify nearby search and optional Maps/Routes on the actual HTTPS host using non-sensitive test coordinates. Check both enabled and unavailable-provider behavior. Restrict the browser-visible Maps key to the correct API and host.
4. If offering mesh messaging, test USB and Bluetooth separately on the intended devices and firmware: configuration, both-direction text with consenting testers, channel selection, disconnect/reconnect, unavailable browser APIs and clear-session behavior. Confirm receipts on the recipient radio; a successful write alone is insufficient.
5. On a shared pilot device, check initial caching, real airplane-mode manual use, reconnect/update/rollback, and session clearing. Review the privacy/TOS with participant-facing materials. Retire any legacy Firebase deployment separately if it still holds records.

The local application repair and automated checks are complete. Provider, hosted deployment and physical-device acceptance remain necessary before describing the whole institutional pilot as operational.

## Per-file instrumentation

Generated from the final coverage summary. Paths are relative to the repository.

| File                                | Functions | Lines  |
| ----------------------------------- | --------- | ------ |
| server/index.js                     | 100%      | 100%   |
| public/sw.js                        | 100%      | 97.77% |
| server/providers.js                 | 100%      | 100%   |
| server/validation.js                | 100%      | 100%   |
| src/App.jsx                         | 100%      | 100%   |
| src/config.js                       | 100%      | 100%   |
| src/components/InstallPrompt.jsx    | 100%      | 100%   |
| src/components/ItemList.jsx         | 100%      | 100%   |
| src/components/LocationSearch.jsx   | 100%      | 96.62% |
| src/components/OfflineIndicator.jsx | 100%      | 100%   |
| src/components/UploadForm.jsx       | 100%      | 100%   |
| src/utils/client.js                 | 100%      | 97.61% |
| src/utils/maps.js                   | 100%      | 96.96% |
| src/utils/mesh/meshClient.js        | 100%      | 98.41% |
| src/utils/mesh/meshProtocol.js      | 100%      | 97.77% |
| src/utils/mesh/meshTransport.js     | 100%      | 89.41% |
| src/utils/planning.js               | 100%      | 100%   |
| src/utils/offline/offlineStorage.js | 100%      | 100%   |
| src/utils/programs.js               | 100%      | 100%   |
| src/utils/offline/pwa.js            | 100%      | 100%   |
| src/utils/recycling.js              | 100%      | 100%   |
| server/guide/guide211.js            | 100%      | 100%   |
| server/guide/redact.js              | 100%      | 100%   |
| src/components/ProcessingNotice.jsx | 100%      | 100%   |
| src/utils/lang.js                   | 100%      | 100%   |
| src/screens/CashForCans.jsx         | 100%      | 100%   |
| src/screens/EligibilityForm.jsx     | 100%      | 100%   |
| src/screens/Guide.jsx               | 100%      | 100%   |
| src/screens/ImageAnalysis.jsx       | 100%      | 100%   |
| src/screens/MapSection.jsx          | 100%      | 100%   |
| src/screens/MeshtasticChat.jsx      | 100%      | 100%   |
| src/components/Settings.jsx         | 100%      | 100%   |
| src/utils/mesh/detect.js            | 100%      | 100%   |
| server/guide/answer.js              | 100%      | 100%   |
| server/weather.js                   | 100%      | 100%   |
| src/components/BudgetPlan.jsx       | 100%      | 100%   |
| src/components/LocationWeather.jsx  | 100%      | 100%   |
| src/components/NearbyStores.jsx     | 100%      | 100%   |
