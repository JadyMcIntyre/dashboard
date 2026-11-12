"""Build the static dashboard and record the Git source and UTC build time."""

import json
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BUILD_INFO = Path(__file__).with_name("build-info.json")
STATIC_EXTENSIONS = {".html", ".js", ".css"}
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


def build(output):
    provenance = json.loads(BUILD_INFO.read_text(encoding="utf-8"))
    provenance.update(
        gitCommit=git("rev-parse", "--verify", "HEAD"),
        sourceDirty=bool(git("status", "--porcelain", "--untracked-files=normal")),
        buildTimestamp=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    )

    for source in site_files():
        destination = output / source.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    (output / "build-provenance.json").write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    dist = ROOT / "dist"
    if dist.exists():
        shutil.rmtree(dist)
    build(dist)
    print("Built dist/ with build-provenance.json")
