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

1. In GitHub **Settings → Secrets and variables → Actions → Variables**, set
   `RENUE_STAGING_SUPABASE_MODE` to `shared`. The staging build will use the
   existing browser Supabase configuration. Leave the staging URL and key
   variables empty in this mode.
2. Use your existing testing account to sign in and test UI changes on Pages.
   Staging and production share authentication and records. Keep edits scoped to
   the testing account's own data. Publishing to Community or changing advisor
   hours can affect production users if your account has permission.
3. Keep service-role keys, secret keys and database passwords outside static
   hosting. The shared build uses only the existing public browser key.

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
group serializes staging workflows. An unset mode defaults to isolated and
requires separate project configuration. Shared mode is an explicit opt-in.

### Manual dispatch and first release

Select the **Deploy staging to GitHub Pages** workflow under Actions, choose
**Run workflow**, then select `develop`. Every job rejects other refs. GitHub
requires a workflow with `workflow_dispatch` to exist on the default branch
before it can be manually dispatched. Until an approved future change registers
this workflow on `main`, use pushes to `develop` for staging releases.
A workflow registered on `main` still cannot deploy Pages from `main`.

### Verify the published environment

After deployment, open the staging URL and verify the Git commit in
`build-provenance.json`. Sign in with your testing account and check the
workspace. In shared mode, requests use the existing Supabase host. The
automated browser suite runs against a synthetic fixture.

### Switch to an isolated project later

Provision a separate Supabase project with the reviewed schema, RLS, grants and
functions. Seed synthetic staff accounts, contacts, templates and schedules.
In that project, configure the Pages URL and exact Auth redirects. In GitHub,
set `RENUE_STAGING_SUPABASE_MODE=isolated` and supply
`RENUE_STAGING_SUPABASE_URL` and `RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY`.
Isolated mode rejects the production URL or key and accepts only a publishable
key.

A normal `python3 scripts/build.py` retains the existing production browser
configuration. For a local shared staging build, run
`RENUE_STAGING_SUPABASE_MODE=shared python3 scripts/build.py --staging`.

## Advisor invitations

Apply the advisor invitations migration to the Supabase project before
deploying the function. That project must have the existing Renue invitation
setup triggers and the advisor roster schema. Deploy the function with
`supabase functions deploy invite-advisor --project-ref <project-ref> --no-verify-jwt`.
The function validates the caller's bearer token through Supabase Auth and
checks their current staff role before sending an invitation. It uses the
server-provided service-role key. Keep that key out of the static site.

The function allows the existing staging and production origins and uses the
project's configured Auth Site URL, invite template and email delivery.
Verify with an authorised test recipient after deployment. Both sites share live
invitations and roster records when staging is configured in shared mode.

## Staff directory

Apply the staff accounts migration and deploy
`supabase functions deploy delete-staff-account --project-ref <project-ref> --no-verify-jwt`.
The directory is available to managers and owners. Role and deletion actions
require an existing owner, established separately by an authorised Supabase
administrator. Owners cannot manage their own account or other owners through
these actions. Verify with disposable staff accounts after deployment.
