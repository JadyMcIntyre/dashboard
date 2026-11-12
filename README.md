# Renue Wellness dashboard.

Desktop staff-reference prototype for clinic information, treatment guidance, patient communication templates and resources.

## Attribution

**Designed & built by J Mc Intyre, 2026.** The dashboard credits the original developer in the footer and HTML metadata. [AUTHORS.md](AUTHORS.md) records the available history and explains how to sign, archive and verify a release.

## Run locally

No dependency installation or build step is needed. From this folder, run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [the local dashboard](http://127.0.0.1:4173/). Use an HTTP server rather than opening `index.html` directly, because the app fetches clinic hours and voicemail content.

## Publish on GitHub Pages

1. Commit and push these files to the repository's `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select **main** and **/ (root)**, then save.
5. Wait for deployment to finish and use the URL shown in Pages settings.

For this repository, the expected URL is [https://jadymcintyre.github.io/dashboard/](https://jadymcintyre.github.io/dashboard/). It will work after Pages is enabled and the deployment succeeds. GitHub may require an eligible plan to publish from a private repository.

The empty `.nojekyll` file disables Jekyll processing so the HTML, CSS, JavaScript, assets and template placeholders are served directly. All application paths are relative, including the old `vitamins.html` redirect, to support a repository subdirectory. No custom domain is needed for testing.

**Visibility:** ordinary GitHub Pages hosting is public, even if the repository is private. Supabase sign-in protects authenticated workflows and database records according to their access policies. Assets bundled into the static site are publicly downloadable. Do not add secrets or patient records to this repository. GitHub Enterprise Cloud has separate private-Pages capabilities.

## Build and verify provenance

Run these commands from the Git checkout with Python 3 and Git installed.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
```

The tests verify footer attribution and metadata in both source HTML and built output. The build recreates the generated `dist/` directory and adds `build-provenance.json`, which records the original developer, application name and version, creation year, full Git commit hash, and UTC build time. `sourceDirty` indicates changes in the working tree. Use a clean checkout of the signed release tag for distributable builds. Update the application version in `scripts/build-info.json` when cutting a release. Version `0.1.0` is the initial version for this build process.

To publish provenance on Cloudflare Pages, set the build command to `python3 -m unittest discover -s tests -v && python3 scripts/build.py` and the output directory to `dist`. Deploying the repository root directly, as in the GitHub Pages branch setup above, still serves the attribution but skips generated provenance. The GitHub Actions workflow verifies attribution on pushes and pull requests.

## Current features

- During-a-call views: insurance, treatment guide, travel and transport, hours and contacts, financing, vitamins and IV.
- Follow-up views: messages, voicemail scripts and resources.
- Workspace-wide search, clinic-specific content and local clinic clocks.
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
