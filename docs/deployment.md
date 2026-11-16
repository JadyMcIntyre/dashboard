# Dashboard environments

| Branch | Purpose | Hosting |
| --- | --- | --- |
| `main` | Production | Existing Cloudflare Pages production branch and domain |
| `develop` | Permanent staging | GitHub Pages at the existing project URL |
| `feature/*` | Feature work in linked worktrees | Verification only |
| `hotfix/*` | Urgent fixes from main | Verification until reviewed and released |

Open feature PRs into `develop`, then promote reviewed staging changes through a
PR from `develop` into `main`. Start urgent fixes from `main` and bring the
released fix back into `develop`. Keep Cloudflare Pages pointed at `main`.
This architecture adds no production deployment workflow or database changes.

## One-time staging setup after approval

1. Provision a separate Supabase project for staging. Apply the dashboard schema,
   functions, RLS and grants from reviewed migration sources. Where SQL currently
   exists only in migration history, capture and review schema-only SQL before
   applying it to staging. Verify the destination project before running any
   migration. Seed synthetic staff profiles and auth accounts, clinic contacts,
   templates, and advisor schedules. Use advisor and manager test accounts to
   check access policies. Keep production rows, auth users, storage, backups,
   and live email settings out of staging.
2. In staging Supabase **Authentication → URL Configuration**, set Site URL to
   the existing GitHub Pages project URL including its repository path
   (`https://jadymcintyre.github.io/dashboard/`). Allow the exact staging
   callback URL used by invitation and sign-in flows. Use test recipients or a
   sandbox mail service for invitations.
3. In GitHub **Settings → Secrets and variables → Actions → Variables**, add
   `RENUE_STAGING_SUPABASE_URL` and `RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY`
   from the staging project. These values are public browser configuration and
   are included in the staging artifact. Keep service-role, secret and
   management keys and database passwords out of the repository and frontend.
4. In GitHub **Settings → Environments → github-pages**, set **Deployment
   branches and tags** to **Selected branches and tags**, then add a branch
   rule matching exactly `develop`. Remove broader rules and leave tags
   unlisted. Review existing environment restrictions before changing them.
5. In GitHub **Settings → Pages → Build and deployment**, select **GitHub
   Actions** as the source. Keep the existing Pages URL. Confirm the GitHub
   account plan supports Pages for the repository's visibility.
6. After approval, create and push `develop` from the reviewed staging-ready
   commit. That first eligible push will run the workflow. Add branch protection
   and require the verification check before later merges to `develop` and
   `main`, using the repository's normal review process.

The workflow checks out `develop`, verifies the app with Node 24, `npm ci`,
the Python tests and Linux Playwright, then builds and uploads `dist/`. Only
the final job has Pages and OIDC deployment permissions. A shared concurrency
group serializes staging workflows. Missing configuration, a production project
URL or key, or a privileged key causes the build to fail before upload.

### Manual dispatch and first release

Select the **Deploy staging to GitHub Pages** workflow under Actions, choose
**Run workflow**, then select `develop`. Every job rejects other refs. GitHub
requires a workflow with `workflow_dispatch` to exist on the default branch
before it can be manually dispatched. Until an approved future change registers
this workflow on `main`, use pushes to `develop` for staging releases.
A workflow registered on `main` still cannot deploy Pages from `main`.

### Verify the published environment

After deployment, open the staging URL and verify the Git commit in
`build-provenance.json`. Check that sign-in contacts the staging Supabase host.
Test an invitation, advisor sign-in, manager permissions, synthetic data edits
and sign-out. The automated browser suite uses a local Supabase fixture, so these
checks verify the hosted environment and its policies.

A normal `python3 scripts/build.py` build retains the existing production
browser configuration. A local staging build uses `python3 scripts/build.py
--staging` with both environment variables set. Keep production credentials,
patient details, secrets and private exports outside static assets.
