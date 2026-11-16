# Renue Wellness dashboard.

Desktop staff-reference prototype for clinic information, treatment guidance, patient communication templates and resources.

## Attribution

**Designed & built by J Mc Intyre, 2026.** The dashboard credits the original developer in the footer and HTML metadata. [AUTHORS.md](AUTHORS.md) records the available history and explains how to sign, archive and verify a release.

## Run locally

Use Node 24, Python 3 and Git from this checkout.

```sh
npm ci
python3 scripts/build.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open [the compiled dashboard](http://127.0.0.1:4173/). The app fetches clinic hours and voicemail content over HTTP.

## Build and publish

Publish `dist/` as the static site. On Cloudflare Pages, keep `dist` as the output directory and use this build command:

```sh
npm ci && python3 -m unittest discover -s tests -v && python3 scripts/build.py
```

GitHub Pages staging publishes a separately configured build from `develop`. See [Deployment and environment setup](docs/deployment.md) for branch policy, the manual settings, and the staging Supabase checklist.

GitHub Pages and Cloudflare Pages serve public static assets. Supabase sign-in protects authenticated workflows and database records according to their access policies. Keep secrets and patient records out of the repository and static output.

The Python build recreates `dist/` and writes `build-provenance.json` with the original developer, application name and version, creation year, Git commit, and UTC timestamp. `sourceDirty` indicates working-tree changes. Use a clean checkout of the signed release tag for distributable builds.

## Design system and browser checks

- `ui/tokens.css` defines light and dark semantic roles, type, spacing, radius, focus and motion. Legacy variables in `brand.css` and `theme.css` continue to serve screens outside the pilot.
- `ui/components.css` defines owned primitives. The local Tailwind compiler expands `@apply` utilities and excludes Preflight. `ui/workspace.css` and `ui/treatment.css` apply the system to the shell and Treatment Guide. `ui/intake.css` brings the same primitives to Insurance, Messages, and Voicemail scripts.
- The compiled stylesheet loads after the existing theme and workspace sheets. Shell and Treatment Guide rules override the legacy pill controls, sidebar breakpoints and guide fact grid within their existing selectors. Legacy forms, tables and dialogs retain their current CSS until their screens are migrated.
- `scripts/build-ui.mjs` creates the compiled stylesheet and a local SVG sprite containing only the selected Lucide icons. It also bundles Inter and both upstream licenses.
- To preview the components, build as above, then serve the **repository root locally** with `python3 -m http.server 4174 --bind 127.0.0.1` and open [the playground](http://127.0.0.1:4174/dev/playground.html). The playground uses synthetic examples and has no authentication or database access. It shows default, hover, focus-visible, selected, pressed and disabled controls in either theme.

```sh
python3 -m unittest discover -s tests -v
npx playwright install chromium
npm run test:browser
```

Playwright starts a fresh local build and stubs Supabase with synthetic data. The functional suite covers staff sign-in/out and account popover keyboard controls, treatment selection and clinic pricing, related routes and history, keyboard command palette navigation, preferences, clinic contact copying, insurance rules, voicemail readouts, message reordering and personalised clipboard copying. On macOS it compares the two themes at 1440 and 1024 px against checked-in screenshots. Linux CI runs the same functional and layout assertions and uploads screenshots for review. To refresh the macOS references intentionally, run `RENUE_BROWSER_CHANNEL=chrome npm run test:browser -- --update-snapshots` with Chrome installed, then inspect the diffs.

## Current features

- During-a-call views: insurance, treatment guide, travel and transport, hours and contacts, financing, vitamins and IV.
- Follow-up views: messages, voicemail scripts and resources.
- A workspace command palette (Cmd/Ctrl+K or /), clinic-specific content, local clinic clocks and contact copy controls.
- Personalised message copying and copyable patient-resource links.
- Light/dark mode and last selected clinic remembered in the browser.

Patient names and customer addresses are not saved by the application. Directions links send the entered starting point to Google Maps when opened; copy buttons write the selected text or link to the clipboard.

Supabase provides staff sign-in, the contact directory, template management and advisor schedules.

## Where to update content

| File | Responsibility |
| --- | --- |
| `app.js` | Clinic metadata, insurance rules, existing templates, financing and application behaviour |
| `care-content.js` | Quick texts, educational/testimonial resources, treatment guidance and IVK prices |
| `resources/new_info.txt` | Active clinic hours and voicemail readouts, fetched at startup |
| `vitamins-data.js` | Paramus vitamins and IV menu |
| `workspace.js` | Navigation, search and clinic context |
| `care-tools.js` | Treatment guide and message/resource filters |
| `theme.js` / `theme.css` | Theme preference and shared colours |
| `workspace.css`, `brand.css`, `styles.css`, `vitamins.css` | Layout and visual styling |
| `resources/brand/` | Renue logos and local fonts |
| `resources/vitamins/` | Original menu images linked from the vitamins view |

`app.js` also includes fallback hours and voicemail content. Keep the fallback schedules aligned when changing `resources/new_info.txt`. When changing a CSS or JS file, update its version query in `index.html` so existing test browsers fetch the latest copy.

## Before sharing an update

Check the browser console, workspace search, all four clinic selections, insurance treatment toggles, copy actions, and both themes. Test a small laptop viewport as well as a larger monitor. Confirm prices, schedules and contact details against the clinic's current instructions.

Application code uses the repository's existing licence. Company logos, fonts, brochure images and other third-party materials retain their respective ownership and licensing; see `resources/brand/README.md` for provenance.
