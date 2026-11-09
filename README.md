# Resourcify

A phone-first website for people in San Diego County who need food, shelter, health care or other help, and for the outreach workers sitting with them. One Express server serves the React build, so a single Render web service hosts everything, and nothing about the people who use it is stored.

## What is on the site

- **Ask for help**: plain-language answers about local services, grounded in 211 San Diego pages that are checked sentence by sentence, with every answer pointing back to the 211 phone line.
- **Rationer**: photograph or type the supplies you have, and say how many people you are feeding and how much money you have. It shows roughly how many days the food and water last, how to split the money across what is missing at typical store prices, and, with your location, today's weather and the nearest food pantries and stores.
- **Benefits**: pick the kinds of help you need, get the words to say when you call 211, then the programs to explore.
- **Cash for Cans**: count containers from a photo or by hand, adding only the materials you have, price them with rates you confirm, and see recycling centers on a map.
- **Community Map**: a map of San Diego County that opens with the screen, plus a search for food, shelter and other services near you, with walking time to each.
- **Mesh messages**: short texts over a Meshtastic radio when there is no cell service. It stays hidden until it can help: when the device is offline, when a radio used before is plugged in, or when turned on in Settings. It never appears on iPhones, which cannot talk to radios from a website.

The interface is in English and Spanish, chosen from the Settings menu, installs to the home screen, and the manual tools work offline. Photo, map and guide features are optional: without their API keys the site says so and the manual tools still work.

## Run it

```
npm ci
copy .env.example .env      # cp on macOS or Linux; add keys if you have them
npm run dev                 # http://localhost:5173
```

`npm run build` followed by `npm start` serves the production build at http://localhost:3000.

## Check it

| Command                  | What it does                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| `npm test`               | Unit and integration tests                                                  |
| `npm run format`         | Rewrites every file in the shared Prettier style                            |
| `npm run check`          | Format check, coverage gate and the browser end-to-end run                  |
| `npm run test:e2e`       | Browser tests only; set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome |
| `npm run smoke -- <url>` | Health and endpoint checks against a running deployment                     |
| `npm run verify:211`     | Confirms every guide sentence is still supported by 211 San Diego's pages   |
| `npm run eval:guide`     | Scores live guide answers against the evaluation set                        |

## Layout

```
Resourcify/
├── server/                 Express backend
│   ├── index.js            entry point: routes, rate limits, serves the built site
│   ├── providers.js        calls to Gemini, Google Places and Google Routes
│   ├── validation.js       input checks and response clean-up
│   ├── weather.js          today's temperature, low, high and rain chance
│   └── guide/              the "Ask for help" guide
│       ├── guide211.js     211 San Diego topics, crisis rules, allowed phone numbers
│       ├── answer.js       checks each answer: known topic, no invented numbers
│       └── redact.js       strips ID numbers, emails and similar identifiers from questions
├── src/                    React frontend
│   ├── main.jsx            browser entry point
│   ├── App.jsx             header, navigation and home screen
│   ├── app.css             all styles
│   ├── config.js           API endpoint table
│   ├── screens/            one file per screen (Guide, Rationer, Benefits, Cash for Cans, Map, Mesh)
│   ├── components/         pieces shared between screens (upload form, location search, notices)
│   └── utils/              logic with no UI
│       ├── mesh/           Meshtastic radio protocol and USB/Bluetooth transport
│       ├── offline/        service-worker registration and clearing old browser data
│       └── *.js            API client, translations, maps, programs, recycling, supply planning
├── public/                 files served as-is: privacy and terms pages, icons, offline worker
├── scripts/
│   ├── build/              production build and the offline precache step
│   ├── checks/             smoke test, provider smoke test, browser-test launcher
│   └── guide/              211 sentence verification and guide evaluation
├── tests/
│   ├── config/             Vitest and Playwright configs, shared test setup
│   ├── server/             backend and guide tests
│   ├── client/             screen and component tests
│   ├── offline/            radio, service-worker and offline tests
│   ├── deployment/         Render, build and readability contracts
│   ├── e2e/                browser tests on desktop and phone
│   └── eval/               question set for the guide evaluation
├── docs/
│   ├── instructions.md     owner's manual: setup, testing, Render hosting, outreach
│   ├── AVOID.md            design rules the site is checked against
│   ├── test-photos/        free-to-use photos for trying the photo features
│   └── records/            dated review, verification evidence, dependency audit, screenshots
├── index.html              Vite page shell (must stay at the root)
├── vite.config.mjs         Vite build config (must stay at the root)
├── render.yaml             Render service definition (must stay at the root)
└── package.json            dependencies and npm scripts
```

Test runs write coverage, traces and HTML reports to `reports/`, which git ignores.

Original project: Big Data Hackathon 2025, Team 114 — Psyche. Dhruv Bantval, Rishi Kumar, Chenhao Zhang and Saevin Hong.
