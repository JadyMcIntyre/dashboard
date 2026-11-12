import json
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from scripts.build import ROOT, build, git

DEVELOPER = "J Mc Intyre"
ATTRIBUTION = "Designed & built by J Mc Intyre"
SIGNATURE = "./resources/developer/j-mc-intyre-monogram.svg"


class PageAttribution(HTMLParser):
    def __init__(self):
        super().__init__()
        self.metadata = {}
        self.stylesheets = set()
        self.footer_images = []
        self.inside_footer = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "meta":
            self.metadata[attrs.get("name")] = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.stylesheets.add(attrs["href"].split("?")[0])
        if tag == "footer":
            self.inside_footer = True
        if self.inside_footer and tag == "img":
            self.footer_images.append(attrs)

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        if tag == "footer":
            self.inside_footer = False


class AttributionTests(unittest.TestCase):
    def check_pages(self, directory):
        pages = sorted(directory.glob("*.html"))
        self.assertTrue({"index.html", "vitamins.html"} <= {page.name for page in pages})
        for page in pages:
            with self.subTest(page=page.name):
                document = PageAttribution()
                document.feed(page.read_text(encoding="utf-8"))
                for field in ("author", "creator"):
                    self.assertEqual(document.metadata.get(field), DEVELOPER, f"Missing {field} metadata")
                self.assertIn("./developer-attribution.css", document.stylesheets)
                signatures = [
                    image for image in document.footer_images
                    if "developer-attribution" in image.get("class", "").split()
                ]
                self.assertEqual(len(signatures), 2 if page.name == "index.html" else 1,
                                 "Missing or duplicated footer attribution")
                for signature in signatures:
                    self.assertEqual(signature.get("src"), SIGNATURE)
                    self.assertEqual(signature.get("alt"), ATTRIBUTION)
                    self.assertTrue((directory / SIGNATURE).is_file(), "Signature SVG is missing")

    def test_source_pages_have_attribution(self):
        self.check_pages(ROOT)

    def test_build_preserves_attribution_and_records_provenance(self):
        with TemporaryDirectory() as temporary:
            output = Path(temporary)
            build(output)
            self.check_pages(output)
            provenance = json.loads((output / "build-provenance.json").read_text(encoding="utf-8"))
            self.assertEqual(set(provenance), {
                "originalDeveloper", "applicationName", "applicationVersion",
                "originalCreationYear", "gitCommit", "sourceDirty", "buildTimestamp",
            })
            self.assertEqual(provenance["originalDeveloper"], DEVELOPER)
            self.assertEqual(provenance["applicationName"], "Renue Wellness Dashboard")
            self.assertRegex(provenance["applicationVersion"], r"^\d+\.\d+\.\d+$")
            self.assertEqual(provenance["originalCreationYear"], 2026)
            self.assertEqual(provenance["gitCommit"], git("rev-parse", "HEAD"))
            self.assertIsInstance(provenance["sourceDirty"], bool)
            built_at = datetime.fromisoformat(provenance["buildTimestamp"])
            self.assertEqual(built_at.utcoffset(), timedelta(0))
            self.assertLess(abs(datetime.now(timezone.utc) - built_at), timedelta(minutes=1))
            self.assertFalse((output / "scripts").exists(), "Build tooling must stay outside the published site")
            self.assertFalse((output / ".git").exists(), "Git metadata must stay outside the published site")


if __name__ == "__main__":
    unittest.main()
