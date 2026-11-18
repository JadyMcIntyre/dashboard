# Intake Hub demo

From the feature worktree, run `npm ci`, then
`python3 scripts/build.py --intake-demo` and `python3 -m http.server 8000 --directory dist`.
Open [Intake Hub](http://localhost:8000/intake-hub/). The local dashboard build
also includes an Intake Hub link for signed-in users. The demo itself is
independent of sign-in. The standard build excludes these files.

Start in Advisor mode on My Day. Add a fictional patient with **New Intake**
and open the record from the search results. Schedule a follow-up for today,
then return to My Day. Switch to Manager and clear any active search. Select a
milestone to drill into the booked cohort, then open Operational Opportunities
to inspect records behind an observation. Explore Insights previews a prompt
that includes only explicitly selected aggregate categories. It copies to the
clipboard on request.

Demo changes last until reload. The workflow uses fictional advisors, clinics
and patient journeys. Booking counts rely on recorded events. Reporting dates
filter intake cohorts. Counts include still-active and concluded histories,
while coordination queues exclude paused and concluded journeys.

A future production rollout needs an approved workflow and data model,
privacy and access review, server-side audit records, and validation using a
strictly controlled import process. Spreadsheet import and handovers are
deferred.
