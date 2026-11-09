# Resourcify: complete setup, hosting and institutional pilot guide

Updated September 12, 2026. This is the single owner instruction document. It combines local setup, testing, Render deployment, privacy boundaries, homelessness-focused contacts, email templates, the shareable brief, release checks and ongoing operation. Older guide files point here. Dated test reports remain evidence, not competing instructions.

Start with a staff-only review for organizations serving people experiencing homelessness. Use fictional examples, manual tools and feedback by email. External services stay disabled. No public deployment, sent email, institutional agreement or measured benefit is established by this guide.

## Contents

1. [Open the website locally](#1-open-the-website-locally)
2. [Test the application and understand current readiness](#2-test-the-application-and-understand-current-readiness)
3. [Host frontend and backend on Render](#3-host-frontend-and-backend-on-render)
4. [Check the demo and prepare a release](#4-check-the-demo-and-prepare-a-release)
5. [Choose homelessness-service organizations](#5-choose-homelessness-service-organizations)
6. [Email institutions and follow up](#6-email-institutions-and-follow-up)
7. [Copy the institution-facing brief](#7-copy-the-institution-facing-brief)
8. [Optional integrations and privacy changes](#8-optional-integrations-and-privacy-changes)

## 1. Open the website locally

Install Node.js **24.x**, which is required by package.json. Open PowerShell in the project directory (or the integrated terminal in your editor). On this computer:

```powershell
Set-Location 'C:\Users\chenh\OneDrive - San Dieguito Union High School District\Documents\GitHub\Resourcify'
node --version
npm --version
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

On another computer, use that computer's repository path. The conditional copy preserves an existing .env. Do not print or commit credentials. For the manual edition, set these values in .env; leave provider keys blank:

```dotenv
PORT=3000
TRUST_PROXY=0
ENABLE_EXTERNAL_SERVICES=false
```

### Development preview

```powershell
npm run dev
```

Wait for Vite's ready message, then open **[http://localhost:5173](http://localhost:5173)** in your browser. This starts React and Express together. React changes update during development; API calls are proxied to port 3000. Keep the terminal running. Press **Ctrl+C** there to stop both processes. Vite requires port 5173 and exits if it is occupied. Stop the previous Vite terminal with Ctrl+C and retry.

Localhost means this computer. Sending someone your localhost URL will not give them access to your app; share the Render HTTPS URL after deployment.

### Preview the same build used for hosting

Stop the development command first so port 3000 is free, then run:

```powershell
npm run build
npm start
```

Open **[http://localhost:3000](http://localhost:3000)**. Express serves both the built frontend and API. Keep this terminal open; stop with Ctrl+C. Rebuild and restart after source changes. Opening index.html directly or using npm run preview alone does not start the complete backend.

From a second terminal in the repository, check the running production app:

```powershell
npm run smoke -- http://localhost:3000
```

### If the local page does not work

| Symptom                       | What to check                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| node or npm is not recognized | Install Node 24 and reopen the terminal; verify the version commands above                                                                       |
| PowerShell blocks npm.ps1     | Use npm.cmd in place of npm, and npx.cmd in place of npx; no execution-policy change is needed                                                   |
| Connection refused            | Keep the server terminal open, inspect its error, and use the URL for the command you actually started                                           |
| Port 3000 already in use      | Stop your previous dev/server terminal with Ctrl+C; keep PORT=3000 for the configured Vite proxy                                                 |
| Frontend loads but API fails  | Confirm Express started on 3000; inspect /api/health in that browser                                                                             |
| Missing production build      | Run npm run build successfully before npm start                                                                                                  |
| Old interface after a build   | Reload; if needed clear site data for this localhost origin in browser settings and reopen. This removes cached app files and any in-tab session |
| Photos or maps unavailable    | Expected with external services disabled; use the manual tools                                                                                   |

## 2. Test the application and understand current readiness

After setup, run the full release checks from the repository:

```powershell
npm run check
```

If the browser runner reports a missing browser, install its Chromium and retry:

```powershell
npx playwright install chromium
npm run check
```

Alternatively, if Google Chrome is already installed, set `$env:PLAYWRIGHT_CHANNEL='chrome'` before the check. Remove this override with `Remove-Item Env:PLAYWRIGHT_CHANNEL` when no longer needed.

| Command                     | Purpose                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------- |
| npm test                    | Unit, API, React component, offline, protocol and deployment-contract tests        |
| npm run test:coverage       | Automated tests plus instrumented coverage in reports/coverage/                    |
| npm run test:e2e            | Production build plus desktop/mobile browser workflows; test server uses port 3100 |
| npm run check               | Format check, coverage tests and production/browser tests together                 |
| npm run format              | Rewrites every file in the shared Prettier style                                   |
| npm audit                   | Fresh dependency audit; sends dependency metadata to the npm registry              |
| npm run smoke -- ACTUAL_URL | Check an already-running local or hosted service                                   |

These commands do not establish successful live Google calls or physical radio delivery. Resolve failures before release; do not bypass assertions to make deployment pass. The qs dependency override is intentional; reassess it when upgrading Express.

Latest saved evidence is the [September 12 review](records/REVIEW_2026-09-12.md): 179 automated tests and 8 browser tests passed; 262/262 instrumented functions covered, 97.64% line coverage; dependency audit had zero findings. The report also records an unexplained intermittent combined-run exit followed by successful separate runs. These are dated results, not a fresh run performed by consolidating this guide or proof of every possible behavior.

Render hosted acceptance remains outstanding in this record. Gemini's September 12 synthetic live check timed out; live Places/Maps/Routes and physical radios remain unaccepted. The [September 8 verification](records/VERIFICATION.md) is historical evidence. Keep external services disabled for the initial review.

## 3. Host frontend and backend on Render

Prepared September 12, 2026. Recommendation: **one Render Node Web Service**. It runs Express and serves the built React frontend from the same HTTPS origin. This follows the user's Render choice and the checked repository configuration.

### Component map

| Component                                | Location                                   | Owner action                                                                            |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Source, tests and release history        | Existing GitHub repository                 | Review the branch; keep secrets and private correspondence out of commits               |
| React frontend                           | Built `dist/`, served by Express on Render | Render runs the build; no separate frontend host                                        |
| Express `/api/...`                       | Same Render web service                    | Set the runtime, build/start commands and health path below                             |
| Privacy, Terms and static assets         | Same service, from `public/` and the build | Check `/privacy.html`, `/terms.html`, icons and worker after deployment                 |
| Offline app shell                        | Browser Cache Storage, static assets only  | Verify after an initial successful online load; it contains no saved participant inputs |
| Participant database/files               | None                                       | Do not provision Postgres, Firebase, object storage or a persistent disk for this pilot |
| Optional Gemini/Places/Routes processing | Google APIs called by Express              | Leave disabled initially; configure server-only keys and verify later                   |
| Optional Maps JavaScript                 | Browser connects to Google when loaded     | Separate restricted browser key; leave unset initially                                  |
| Mesh messaging                           | Browser and a connected physical radio     | No cloud mesh server; not part of initial review                                        |
| Institutional contact                    | Owner's email                              | Send the demo and receive feedback by email; no contact script or in-app form           |

Express is server-side code, so choose a **Web Service**. The provider's service-type distinction is documented in [Your First Render Deploy](https://render.com/docs/your-first-deploy). The application would be incomplete if only its frontend files were hosted as a static site.

### Cost and plan choice

Prices checked September 12, 2026; confirm the actual dashboard quote before creating a paid service.

| Use                                 | Starting budget                                                                      | Practical choice                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Local preparation                   | $0 incremental hosting                                                               | Run on localhost                                                                                                   |
| Hosted rehearsal                    | $0 compute within Free limits                                                        | Free web-service instance; tolerate wake-up delay                                                                  |
| Scheduled small institutional pilot | $7/month starting web-service compute on a $0 Hobby workspace, before overages/taxes | Smallest paid Services & Workers instance, currently 512 MB (`0.5c-512mb`); verify memory with the actual workload |
| Manual tools' provider calls        | $0                                                                                   | External services disabled and keys unset                                                                          |
| Optional provider features          | Separately billed, usage-dependent                                                   | Do not enable until verified; set provider quotas and review billing                                               |
| Domain                              | Optional separate cost                                                               | Use Render's supplied `onrender.com` URL initially                                                                 |

Render lists workspace and compute charges separately. Its Free web service sleeps after 15 minutes idle and can take about a minute to wake; it is unsuitable for promised always-on operation. Bandwidth/build limits and billing can still apply. A billing alert is not necessarily a hard spending cap. [Pricing](https://render.com/pricing), [Free service limits](https://render.com/docs/free).

There is no basis yet to promise a concurrent-user capacity or fixed all-inclusive bill. Rehearse on the actual plan. The current Blueprint omits a compute plan, so review Render's proposed selection instead of assuming it is Free. No Pro workspace, database or custom domain is required by the current code.

### Exact first deployment: manual tools

1. Sign in to Render using the account that will own and maintain the pilot. Connect the intended GitHub repository. Decide who handles bills and service incidents before inviting reviewers.
2. Choose **New → Web Service**, select the repository and reviewed branch. Use the repository root; leave Root Directory blank. Select Node as the runtime. Keep the existing Oregon region unless the institution has a reason to choose another available region.
3. Enter these settings. They match `render.yaml`:

| Setting                    | Value                                               |
| -------------------------- | --------------------------------------------------- |
| Build command              | `npm ci --include=dev && npm test && npm run build` |
| Start command              | `npm start`                                         |
| Health check path          | `/api/health`                                       |
| `NODE_VERSION`             | `24`                                                |
| `NODE_ENV`                 | `production`                                        |
| `TRUST_PROXY`              | `1`                                                 |
| `ENABLE_EXTERNAL_SERVICES` | `false`                                             |
| Automatic deploys          | Off for the reviewed pilot edition                  |

4. Leave Gemini, Places, Maps and Routes keys unset for this edition. Render supplies `PORT`; do not hardcode a different port. Choose Free for rehearsal or review the smallest paid instance price for scheduled use.
5. Create/deploy the service. The backend listens on `0.0.0.0` and calls from React use relative `/api/` paths. No separate CORS domain, Vercel site, Heroku proxy or reverse-proxy service is needed.
6. Copy the actual generated HTTPS URL, run `npm run smoke -- ACTUAL_HTTPS_URL`, and complete [section 4, Check the demo and prepare a release](#4-check-the-demo-and-prepare-a-release). Record results before using the URL in outreach.

The alternative **New → Blueprint** route uses [render.yaml](../render.yaml). If it prompts for optional secrets that the initial manual edition does not need, use the manual Web Service settings above rather than inventing keys. See the [existing technical deployment guide](#8-optional-integrations-and-privacy-changes) for optional-provider setup. Dashboard labels may change; the required service and commands remain the same. [Official deployment workflow](https://render.com/docs/your-first-deploy).

### What may be published

Render deploys the application from the connected code repository; Express serves only its designated static directories and API routes. Keep `.env`, private replies, internal release notes, client records and service-account files outside `public/` and `dist/`. A `.gitignore` entry does not remove an already tracked file or protect an intentionally uploaded file. Review the staged change list before each push.

Share the verified application URL and a reviewed copy of the pilot brief. Keep the repository private if that is its current intended visibility. Institution-facing documents need only the public owner contact, honest feature scope, policy links and current acceptance status; they do not need credentials, private audit material or account screenshots.

### Operation and shutdown

- Before each scheduled review, open the hosted site, run the smoke check and perform the short manual demo. Confirm the deployed commit is the intended one.
- Record product defects using fictional reproduction steps. Do not turn on participant request logging or analytics for troubleshooting. Hosting providers can independently retain connection metadata; follow the shipped privacy wording.
- Apply dependency/security updates on a reviewed branch and run `npm run check` before deploying. Recheck dated verification claims; September 8's audit is not a permanent guarantee.
- For a broken release, stop using its link, restore the previous known-good deployment through Render, and retest. Reload cached browsers and confirm that the expected worker/app version activates. Static files may remain cached on devices after a service is stopped.
- For an external-service failure, set `ENABLE_EXTERNAL_SERVICES=false` and redeploy; continue only with agreed manual features. For a manual calculation or clearing defect, pause the review until fixed.
- At the pilot end, agree whether the owner will keep maintaining the app. Remove shared links if closing it, revoke unused provider keys, and remove unused Render resources. Confirm billing cessation in Render; do not assume an unused tab or idle app stops paid compute charges.

The application has no saved participant database to back up. Source and reviewed release commits are the recovery material. Existing records in a legacy Firebase project, if any, need a separate owner-managed retirement process.

## 4. Check the demo and prepare a release

Prepared September 12, 2026. Proposed sequence: local rehearsal → hosted staff review → optional limited adult pilot. These are owner instructions and blank records; unchecked items are not completed work.

### Current evidence

Use section 2 above and the dated September 12 report for the latest saved local checks. Render URL, hosted acceptance, live providers, physical radios and institutional demand remain unverified. The checklist below is a blank owner record, not completed work.

### Fill before sharing a hosted demo

- [ ] Project owner and working reply address: __________
- [ ] Intended institution and staff role: __________
- [ ] Actual HTTPS URL: __________
- [ ] Reviewed commit/deployment identifier: __________
- [ ] Test date and result (`npm run check`): __________
- [ ] Hosted smoke date and result: __________
- [ ] Selected Render plan and owner-approved budget: __________
- [ ] External services disabled; provider keys unset for this review.
- [ ] Privacy and Terms reachable; owner contact verified.
- [ ] Three manual tasks below pass in a private browser window.
- [ ] Clear/reload removes fictional inputs; offline static files work after initial online caching.
- [ ] No contact-form tracking, meeting recording or participant data collection added.
- [ ] Email/brief placeholders replaced in the reviewed copies; no unverified public URL or affiliation.
- [ ] Existing NEEEM outreach checked to avoid duplicate institutional requests.

Keep filled account, contact and correspondence records private. The public template can remain blank. No institution needs access to Render or Google credentials to review the manual tools.

### Owner checks before emailing the demo

Run these checks yourself using fictional inputs before sharing the link. They are a release checklist, not a meeting or presentation script. Institutional feedback can arrive by email.

**Budget check.** Open Rationer. Leave 1 adult and 0 children, set Money you can spend to `15`, and enter:

```text
Water jug, 2, 1.5
Soap, 1
```

Select Build plan. Expected: water lasts **less than a day**, and the plan lists Water $4.50 (3 gallons), Food $6.00 (3 meals) and Clothes $3.00 (socks), keeps **$1.50**, and says the budget does not stretch to more food. Ask whether the plan and the "how long this lasts" estimate are understandable without explanation. These are fictional supplies and do not describe an actual client.

**Official information check.** Open Benefits, select Food, and choose Find programs. Expected: a SNAP food-assistance link. Confirm that the app explains that the agency decides eligibility. Do not complete an application or enter personal circumstances. Opening the external site is subject to that site's own policies.

**Clearing check.** Select Clear this session, return to Rationer and check that the manual input is empty. Reload and confirm that inputs/results are not restored. The service worker may keep app code for offline use, but not the entered supply list.

**Email feedback.** Use the draft in [section 6, Email institutions and follow up](#6-email-institutions-and-follow-up). Ask whether the tool is useful and what most needs improving. Discuss organizational process by email if there is interest; do not recruit clients during this first review.

Optional separate demonstration: ten aluminum cans at a fictional rate of `$0.05` should give `$0.50` in Cash for Cans. Do not substitute that rate for a recycling center's actual quote. Leave photo, nearby-location and radio workflows outside this session.

### What counts as progress without participant tracking

Owner acceptance is that all three fictional tasks work on the hosted edition, uncertainty is understandable, and the review yields a concrete product decision. Record only non-personal product corrections or a decision to stop. Do not retain per-person timing, scores, identities, demographics, photos or answers to create outcome statistics.

A demonstration of working arithmetic is a software result. It does not prove reduced hardship, more benefits received, improved safety or time saved in practice. Any future impact evaluation would require a separate scope and data decision; it is not part of the current no-participant-data pilot.

### Optional next stage

Proceed only when an institutional lead agrees that a specific workflow is useful. A reasonable proposed boundary is one site, two weeks, adult use with staff support, manual features only, and a midpoint and end-of-period conversation with the lead. These are suggested limits, not agreed dates or participant commitments. Use the institution's normal review and accessibility process. Do not assume a staff member's interest authorizes client recruitment.

Agree who owns support, what issue requires a pause, and whether the app will be maintained after the end date. Use only product-level feedback. An AI/Maps/radio expansion is separate: complete the appropriate live checks in [VERIFICATION.md](records/VERIFICATION.md), update the shared scope, and confirm that the existing privacy/TOS still accurately describe it.

### Pause or stop

- Arithmetic, clearing or source-link behavior is misleading or broken: stop the demonstration and fix/retest.
- The institution declines or does not reply after one reminder: close the request.
- The workflow is already served better by existing materials: revise the purpose or stop instead of adding features by default.
- A useful pilot would require collecting client data: stop expansion and revisit the scope; do not silently add storage.
- The owner cannot handle maintenance, costs or corrections: do not invite new use; agree on closure with the institutional lead.

For closure, follow [section 3, Host frontend and backend on Render](#3-host-frontend-and-backend-on-render). No follow-up or recurring maintenance task is automatically scheduled by this checklist.

## 5. Choose homelessness-service organizations

Updated September 12, 2026. This replaces the broad 22-contact list with nine organizations with documented services for people experiencing homelessness in San Diego County. Some also serve other populations. General basic-needs work alone is insufficient for this list. Removed organizations are not being claimed to exclude homeless people.

Published addresses are sourced below; deliverability, interest and capacity are untested. Recheck before sending.

| Organization / area                                              | Public email and source                                                                                         | Documented homelessness services                                                                                                                                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Community Resource Center — Encinitas                            | `info@crcncc.org` — [Administration](https://crcncc.org/contact/)                                               | [Housing support](https://crcncc.org/get-help/) for people experiencing or at risk of homelessness                                                                                               |
| Interfaith Community Services — Escondido                        | `communications@interfaithservices.org` — [General inquiries](https://www.interfaithservices.org/contact)       | [Housing and shelter](https://www.interfaithservices.org/), including family homelessness work                                                                                                   |
| Brother Benno Foundation — Oceanside                             | `info@brotherbenno.org` — [General contact](https://brotherbenno.org/contact/)                                  | [Supportive services](https://brotherbenno.org/services/support-services-and-aid/) for homeless people, including housing navigation                                                             |
| Operation HOPE–North County — Vista                              | `info@operationhopeshelter.org` — [General contact](https://operationhopeshelter.org/contact-us/)               | [Shelter and housing navigation](https://operationhopeshelter.org/programs/) for families with children and single women experiencing homelessness                                               |
| Serving Seniors — San Diego                                      | `info@servingseniors.org` — [Footer contact](https://servingseniors.org/get-involved/volunteer.html)            | [Mission](https://servingseniors.org/who-we-are/mission.html) explicitly includes homeless seniors; meals, housing and social support                                                            |
| San Diego Rescue Mission — San Diego / National City / Oceanside | `sdrminfo@sdrescue.org` — [General involvement contact](https://www.sdrescue.org/contact-us/)                   | Same page documents homeless shelter, residential and transitional programs                                                                                                                      |
| Alpha Project — San Diego / county programs                      | `info@alphaproject.org` — [General contact](https://alphaproject.org/)                                          | [Official 2024 report](https://alphaproject.org/file_download/inline/93f260c4-a899-46ee-9c04-5fe6012b6449) documents shelters, street outreach and housing services; confirm current program fit |
| Townspeople — San Diego                                          | `admin@townspeople.org` — [Administration](https://townspeople.org/frequently-asked-questions/)                 | Same FAQ describes housing for people experiencing homelessness with disabilities; eligibility varies                                                                                            |
| Think Dignity — San Diego                                        | `info@thinkdignity.org` — [Published program inquiry route](https://thinkdignity.org/programs/impact-services/) | Same page describes storage, hygiene items and survival supplies for people experiencing homelessness; request forwarding from the listed ID Bank inquiry route                                  |

### Email-only batches

- Batch 1 (5): CRC, Brother Benno, Operation HOPE, San Diego Rescue Mission and Think Dignity.
- Batch 2 (4): Interfaith, Serving Seniors, Alpha Project and Townspeople.
- Send individual emails, one public recipient per organization, a few business days between batches. Do not wait for every earlier reply. Coordinate existing NEEEM conversations.
- Ask for an adult staff reviewer working with people experiencing homelessness. Use the [email draft](#6-email-institutions-and-follow-up), tailoring supplies planning for shelters/outreach, resource-link clarity for housing programs, and readability for senior services.
- Follow up once after 7–10 business days, then close unanswered requests. Respect declines and bounces.
- Expand only after verifying both an official homelessness-service description and an appropriate public email. Seek breadth across homelessness-service providers and populations.

The first review uses fictional supplies and prices, manual tools and external services disabled. No client records, participant accounts, photos, IDs or HMIS integration are needed. Resourcify is not a housing-placement or case-management system. No emails were sent and no partnership is established.

These are project-outreach contacts, not a shelter-availability directory. Serving Seniors' overview says it does not currently operate immediate/emergency housing, despite another page using an Emergency Shelter program title. Do not promise beds, admission or immediate assistance for any organization.

Use a demo link only after Render hosted acceptance; otherwise use the clearly labelled routing-only inquiry. Resourcify retains no participant inputs, but Render connection metadata and email correspondence involve processing. Recipient organizations have their own data practices. Keep private outreach notes limited to organization, public source, sent date, status and next action.

## 6. Email institutions and follow up

Use email only. Send the draft below and invite feedback by reply; no call, meeting or scripted presentation is needed.

Prepared September 12, 2026. Contact routes below were checked against official pages on that date. They establish public routing options, not interest, available staff time or agreement to pilot. Recheck before sending. San Diego/North County is a provisional region inherited from the NEEEM guides, not a verified personal affiliation.

### Whom to contact first

Use the [verified list of nine homelessness-service organizations](#5-choose-homelessness-service-organizations) in two batches of 5 and 4 individual emails. You can contact different institutions concurrently; use one recipient per institution. If there is already an active NEEEM request with the same institution, coordinate through that existing thread or defer this request. Do not send repeated unrelated pitches to several departments.

| Order | Institution and role to request                                                              | Verified public route                                                                                                           | Why it is a plausible fit and tailored opening                                                                                                                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Community Resource Center, administration; request routing to a food/resource-services lead  | `info@crcncc.org`, explicitly listed under Administration; [official contact page](https://crcncc.org/contact/)                 | CRC's page lists social services and a Food & Nutrition Center. “I saw that CRC provides food and resource services in North County, and wondered whether a short manual supplies-budget demonstration would be useful for a staff review.”                            |
| 2     | Brother Benno Foundation; request supportive-services staff                                  | `info@brotherbenno.org`; [official contact](https://brotherbenno.org/contact/)                                                  | [Supportive services](https://brotherbenno.org/services/support-services-and-aid/) explicitly serve people experiencing homelessness. “Could a staff member supporting people experiencing homelessness review this manual supplies-budget and official-link demo?”    |
| 3     | Interfaith Community Services, general inquiries; request routing to a relevant program lead | `communications@interfaithservices.org`, listed as General; [official contact page](https://www.interfaithservices.org/contact) | An alternative North County institutional routing point. “Could you route a small staff-only resource-planning review request to the appropriate program lead, if this is within Interfaith's scope?” This is a routing inference, not a verified program endorsement. |

CRC publishes separate intake and crisis channels; use Administration for this project request. Do not use domestic-violence hotlines, client intake, 211 assistance calls or emergency lines to pitch the app. No private staff email has been inferred. Use the public general route to ask for forwarding when the appropriate reviewer is uncertain.

CRC is the proposed first target because the manual supply-budget task gives a concrete, small request. The ordering is our judgment about fit, not a ranking of institutional need. If you already have a relevant introduction, start there and describe that relationship accurately.

### Initial email

Replace all brackets; use the appropriate tailored opening from the table. Send only after the actual link passes hosted checks. No message has been sent by preparing this draft.

**Subject:** Feedback request: Resourcify resource-planning demo

```text
Hello [organization team],

My name is [Your name], and I am working on Resourcify, a small resource-planning project intended to support people experiencing homelessness. I am seeking feedback from staff who serve this population.

[Insert the institution-specific opening from the contact table.]

Would someone on your team be willing to try the demo when convenient and reply by email with any feedback? You can use fictional supplies to plan a small budget, find an official assistance-program link, and clear the session. I would especially like to know whether this would be useful alongside your existing tools and what most needs improving.

Demo: [PUBLIC_URL]
Privacy: [PUBLIC_URL]/privacy.html
Short project brief: [BRIEF_URL, or remove this line and paste the reviewed brief below]

The first review uses manual tools with external provider features disabled. The app saves no participant inputs or history; Render can process ordinary connection metadata. I am not requesting client or student information, recordings, system access or an endorsement. AI photo analysis and radio messaging are outside this review, and I am not claiming measured real-world impact.

If another staff role is more appropriate, a referral is enough. If this is outside your scope or capacity, I understand.

Thank you,
[Your name]
[Actual role or affiliation, if applicable]
[Reply email]
```

For a preliminary routing-only inquiry before hosting, remove all demo-link lines and say: “The demo is not publicly hosted yet. Before I share a demo, is there an appropriate staff role for a short resource-planning usability request?” Do not imply it is ready for clients.

### If the institution replies

```text
Thank you for taking a look. Please feel free to reply here with any corrections or suggestions.

Please use fictional examples only, and avoid including client or student information. A brief description of what was confusing or what would make the tool useful is enough.

If your team is interested in a small pilot, we can discuss its scope and your normal review process by email.
```

Keep the conversation in the email thread. Do not require an app account or software installation. Record only non-personal product corrections in project notes; do not copy client stories or private replies into GitHub.

### One follow-up, then close

Wait **7–10 business days**. Reply in the same thread once:

```text
Hello [team],

I am following up once on the short Resourcify staff-review request below. The manual demo is at [PUBLIC_URL]. A referral to an appropriate staff role, or a brief indication that this is not useful for your workflow, would be enough.

If this is not a current priority, no reply is needed and I will close this request.

Thank you,
[Your name]
```

Then stop unless invited to continue. Respect a decline immediately; do not try another staff member to bypass it. Continue the next batch without waiting for all earlier replies; incorporate useful feedback and avoid duplicate requests within an institution. No future follow-up has been scheduled automatically.

### Keep a minimal private operational note

For your own coordination, keep only the institution, public contact-source URL, date sent, status, next-action date and project-level decision. Suggested statuses: `draft`, `sent`, `one follow-up sent`, `review arranged`, `closed`. Do not create participant IDs, case notes, screenshots, attendee lists or response analytics. Private replies remain in your normal email account, separate from this repository and the application.

An email or positive comment does not establish a partnership or measured benefit. Ask before quoting feedback or naming an institution as a collaborator. For a product correction, save a fictional reproduction and retest the changed behavior. If staff say their existing tool is simpler, assess that finding before expanding the app.

## 7. Copy the institution-facing brief

Draft for sharing after the owner fields and hosted checks are complete. Prepared September 12, 2026.

**Project contact:** [Your name and public reply email]  
**Verified demo:** [PUBLIC_URL]  
**Privacy:** [PUBLIC_URL]/privacy.html  
**Terms:** [PUBLIC_URL]/terms.html

### What we are asking

Would someone on your team try this resource-planning demo when convenient and **reply by email with feedback**? Please use fictional examples. We would like to learn whether it helps explain a supplies budget and find an official assistance-program link, and whether your existing process is already easier. No meeting or presentation is needed.

There is no request for client access, student records, system integration, funding or endorsement. Any later pilot would be a separate discussion with an institutional lead.

### What the initial demo includes

- Enter or photograph supplies; see roughly how many days the food and water last and how to split a small budget across what is missing.
- Select an assistance topic and open a link to the responsible program's official information. The tool does not decide eligibility or submit applications.
- Optionally calculate a recycling estimate from quantities and rates entered by the reviewer. Rates are fictional in the demo, not verified center quotes.

AI photo analysis, live nearby search/maps and radio messaging are outside this initial review. Their availability is not needed to test the manual workflows. This is not an emergency-response or professional-advice service.

### Privacy and hosting

The initial edition runs its frontend and backend together on Render, with external provider features disabled. Manual inputs remain in the browser tab and are cleared by **Clear this session** or reload. Resourcify does not save participant inputs in an application database, application request logs or browser persistence, and has no accounts or analytics. Offline caching stores app files only.

Render and external websites opened from official links may process connection metadata under their own policies. Ordinary email correspondence about the review is separate from the app. We request no personal case examples, photos, recordings or client information. Please use fictional examples only.

### What is known and what is not

The September 12 local verification recorded 179 automated tests and eight desktop/mobile browser tests passing. Those tests are software checks, not evidence of institutional adoption or improved outcomes. The owner must verify the actual hosted edition before sharing its URL. No institution is represented as a partner by this draft.

The review asks whether the calculations are understandable, whether official links are easy to find, and whether clearing is clear and reliable. A concrete correction, a suggestion to use an existing tool, or a decision that the workflow is not useful would all help guide the project.

Thank you for considering a small review. If another staff role is more appropriate, a referral through your normal contact channel is sufficient.

## 8. Optional integrations and privacy changes

These are outside the first institutional review. No provider keys are needed for the manual edition. Keep ENABLE_EXTERNAL_SERVICES=false until the intended feature passes its own live checks and the institution agrees to the expanded scope.

| Feature                 | Configuration and acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini photo analysis   | Server-only GEMINI_API_KEY and GEMINI_MODEL; use a billing-enabled Google project, verify an available image-capable model, and review current audience/region/data-use terms. The template model name is not evidence of availability. Set GEMINI_FALLBACK_MODEL too (the Blueprint uses `gemini-flash-latest`): after a busy retry fails on the primary model, the request is made once on the fallback, for photos and the guide alike; every safety check runs on the server after the call, so it applies to either model. Observed 20 September 2026: an unpaid key exhausted its `gemini-3.6-flash` quota partway through one 29-question eval run, so a free-tier key cannot carry even a small pilot                                                                                                                                                                                                                                                                                                                                                                                                      |
| Nearby places           | Enable Places API (New); server-only PLACES_API_KEY; test actual HTTPS searches and failure cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Interactive map         | Separate MAPS_BROWSER_API_KEY restricted to Maps JavaScript API and intended HTTP referrers. This key is intentionally browser-visible; test on the real host                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Walking route estimates | Server-only ROUTES_API_KEY with Routes API enabled; test real routes, cancelling the processing notice, clearing, and errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Ask for help guide      | Uses the same server-only GEMINI_API_KEY and GEMINI_MODEL as photo analysis, so enabling one enables both. Answers come only from the verified 211 San Diego pages in `server/guide/guide211.js`; re-open each URL and re-read each body against its page before every pilot. Questions mentioning suicide, overdose, violence or child safety get fixed hotline text from the server and are never sent to Google. Test a covered question, an uncovered one (expect "dial 211"), a crisis phrase, and a demand-spike retry. Before each pilot run `npm run verify:211` (read-only: confirms every topic page is live and on-topic and prints a content hash) and `npm run eval:guide` (sends the fixed question set in `tests/eval/guide-questions.json` to the live model; costs a little). The server removes SSN, phone, email, date and long-number patterns from questions before they leave, withholds any answer containing a number the corpus does not, and serves a fixed safety message when the model itself flags a possible crisis. The guide has its own cap of 30 requests a minute service-wide |
| Spanish interface       | No key needed. The home screen, navigation, footer, processing notices and the guide are in Spanish when the browser language is Spanish or the link carries `?lang=es`; use that link on printed cards. The guide answers in the language of the question, and Spanish crisis phrases get Spanish hotline text. Screens not yet translated show a Spanish note pointing to 211. The choice lives in the tab only; nothing is stored. Before a Spanish-speaking pilot, have a native speaker review `src/utils/lang.js` and the Spanish crisis answers in `server/guide/guide211.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Radio messaging         | Compatible browser plus real Meshtastic hardware/firmware; test USB/Bluetooth, channel selection, delivery and reconnect. No cloud mesh server is needed; simulated protocol tests do not establish delivery                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Keep server keys out of source, public/, dist/ and VITE_* variables. Add them through Render environment settings. Set quotas and review billing before enabling external processing. Missing keys leave their features unavailable. Optional weather is not automatically requested by the screens.

For a later synthetic Gemini diagnostic:

```powershell
node scripts/checks/provider-smoke.mjs --live
```

This explicitly sends a generated solid-color image to Google and can incur a charge. It reads credentials from the local environment/.env. It does not use participant photos. A successful diagnostic still needs representative non-personal image testing and review of count accuracy, latency and corrections.

### Data boundaries and changes

The app has no participant database, accounts, saved browser inputs or application access logs. The in-memory service-wide rate limiter briefly counts requests and resets on restart; heavy traffic can temporarily affect all users. Provider quotas matter if scaling to multiple instances. Offline caching stores static app files only. Opening official links, enabling Google features, hosting infrastructure and radio recipients involve their own processing practices.

Before changing any processing, update [Privacy](../public/privacy.html) and [Terms](../public/terms.html), test consent and clearing, and communicate the actual scope. Never promise that providers retain nothing or that no data ever leaves the device. Keep the first review fictional and staff-only. Do not add client records or HMIS integration as part of this pilot.

Legacy browser data is purged on startup where permissions permit. The old public-reporting feature is disabled. Nothing in this repository deploys to Firebase or deletes old records. If an older Firebase project still exists, its owner must set Firestore rules that deny all access (`allow read, write: if false;`) and review retirement separately.

For release updates, rollback, cost control and shutdown, follow the operation and shutdown subsection in section 3. No automated follow-ups or recurring maintenance have been scheduled.

Provider references for a future expansion: [Gemini image inputs](https://ai.google.dev/gemini-api/docs/image-understanding), [model availability](https://ai.google.dev/gemini-api/docs/models), [provider terms](https://ai.google.dev/gemini-api/terms), [Meshtastic client protocol](https://meshtastic.org/docs/development/device/client-api/). Recheck current requirements before enabling these features.
