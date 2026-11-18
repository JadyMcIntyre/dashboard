"""Build the static dashboard and record the Git source and UTC build time."""

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BUILD_INFO = Path(__file__).with_name("build-info.json")
STATIC_EXTENSIONS = {".html", ".js", ".css"}
AUTH_CONFIG = "supabase-config.js"
ASSET_EXTENSIONS = {".svg", ".woff2", ".png"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def site_files():
    for path in ROOT.iterdir():
        if path.is_file() and not path.name.startswith(".") and path.suffix in STATIC_EXTENSIONS:
            yield path

    for directory in ("brand", "developer", "vitamins"):
        for path in (ROOT / "resources" / directory).rglob("*"):
            if path.is_file() and path.suffix in ASSET_EXTENSIONS:
                yield path

    for path in (".nojekyll", "LICENSE", "resources/new_info.txt"):
        yield ROOT / path


def staging_auth_config():
    mode = os.environ.get("RENUE_STAGING_SUPABASE_MODE") or "isolated"
    production = (ROOT / AUTH_CONFIG).read_text(encoding="utf-8")
    if mode == "shared":
        return production
    if mode != "isolated":
        raise ValueError("Set RENUE_STAGING_SUPABASE_MODE to shared or isolated.")

    url = os.environ.get("RENUE_STAGING_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY", "")
    if not re.fullmatch(r"https://[a-z0-9]+\.supabase\.co", url):
        raise ValueError("Set RENUE_STAGING_SUPABASE_URL to the hosted staging project URL.")
    if url in production:
        raise ValueError("The staging Supabase project must differ from production.")
    if not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", key):
        raise ValueError("Staging requires the project's publishable key.")
    if key in production:
        raise ValueError("Staging cannot use the production publishable key.")
    settings = json.dumps({"url": url, "publishableKey": key})
    return f"window.renueSupabaseConfig = Object.freeze({settings});\n"


def build(output, *, staging=False):
    staging_config = staging_auth_config() if staging else None
    provenance = json.loads(BUILD_INFO.read_text(encoding="utf-8"))
    provenance.update(
        gitCommit=git("rev-parse", "--verify", "HEAD"),
        sourceDirty=bool(git("status", "--porcelain", "--untracked-files=normal")),
        buildTimestamp=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    )

    for source in site_files():
        if staging and source.name == AUTH_CONFIG:
            continue
        destination = output / source.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    subprocess.run(
        ["node", "scripts/build-ui.mjs", str(output.resolve())],
        cwd=ROOT,
        check=True,
    )

    if staging_config:
        (output / AUTH_CONFIG).write_text(staging_config, encoding="utf-8")

    (output / "build-provenance.json").write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--staging", action="store_true", help="Use the configured staging Supabase mode.")
    parser.add_argument("--intake-demo", action="store_true", help="Include the synthetic Intake Hub in a local demo build.")
    args = parser.parse_args()
    if args.intake_demo and (args.staging or os.environ.get("CI") or os.environ.get("CF_PAGES")):
        parser.error("--intake-demo is available only for local builds.")
    dist = ROOT / "dist"
    if dist.exists():
        shutil.rmtree(dist)
    try:
        build(dist, staging=args.staging)
    except ValueError as error:
        parser.error(str(error))
    if args.intake_demo:
        demo = dist / "intake-hub"
        shutil.copytree(ROOT / "dev" / "intake-hub", demo)
        demo_index = demo / "index.html"
        html = demo_index.read_text(encoding="utf-8")
        demo_index.write_text(html.replace("../../dist/assets/", "../assets/").replace("../../resources/", "../resources/"), encoding="utf-8")
        dashboard = dist / "index.html"
        html = dashboard.read_text(encoding="utf-8")
        link = '<a class="ds-button" href="./intake-hub/" target="_blank" rel="noopener">Intake Hub demo</a>'
        marker = '<nav id="workspace-nav"'
        if marker not in html:
            raise RuntimeError("Workspace navigation is missing from the dashboard.")
        dashboard.write_text(html.replace(marker, link + marker, 1), encoding="utf-8")
    print("Built dist/ with build-provenance.json")
