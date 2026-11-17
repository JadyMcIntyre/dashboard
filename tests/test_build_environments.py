import re
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts.build import AUTH_CONFIG, ROOT, build, staging_auth_config


STAGING_SETTINGS = {
    "RENUE_STAGING_SUPABASE_MODE": "isolated",
    "RENUE_STAGING_SUPABASE_URL": "https://renuestagingfixture.supabase.co",
    "RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_fixture_only",
}


class BuildEnvironmentTests(unittest.TestCase):
    def test_shared_staging_build_uses_the_existing_browser_configuration(self):
        with patch.dict("os.environ", {
            "RENUE_STAGING_SUPABASE_MODE": "shared",
            "RENUE_STAGING_SUPABASE_URL": "",
            "RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY": "",
        }), TemporaryDirectory() as temporary:
            output = Path(temporary)
            build(output, staging=True)
            self.assertEqual((output / AUTH_CONFIG).read_bytes(), (ROOT / AUTH_CONFIG).read_bytes())

    def test_rejects_unknown_staging_mode(self):
        with patch.dict("os.environ", {**STAGING_SETTINGS, "RENUE_STAGING_SUPABASE_MODE": "share"}):
            with self.assertRaisesRegex(ValueError, "shared or isolated"):
                staging_auth_config()

    def test_staging_artifact_uses_only_its_public_configuration(self):
        with patch.dict("os.environ", STAGING_SETTINGS), TemporaryDirectory() as temporary:
            output = Path(temporary)
            build(output, staging=True)
            config = (output / AUTH_CONFIG).read_text()
            for name, setting in STAGING_SETTINGS.items():
                if name == "RENUE_STAGING_SUPABASE_MODE":
                    continue
                self.assertIn(setting, config)
            production = (ROOT / AUTH_CONFIG).read_text()
            for value in re.findall(r"https://[^\"]+|sb_publishable_[A-Za-z0-9_-]+", production):
                for file in output.glob("*.js"):
                    self.assertNotIn(value, file.read_text(), file.name)

    def test_rejects_missing_configuration_and_privileged_keys(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(ValueError, "staging project URL"):
                staging_auth_config()
        for key in ("sb_secret_fixture", "eyJfixture.jwt.signature", ""):
            with self.subTest(key=key), patch.dict("os.environ", {
                **STAGING_SETTINGS,
                "RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY": key,
            }):
                with self.assertRaisesRegex(ValueError, "publishable key"):
                    staging_auth_config()

    def test_rejects_production_project_and_key(self):
        production = (ROOT / AUTH_CONFIG).read_text()
        checks = {
            "RENUE_STAGING_SUPABASE_URL": r"https://[^\"]+",
            "RENUE_STAGING_SUPABASE_PUBLISHABLE_KEY": r"sb_publishable_[A-Za-z0-9_-]+",
        }
        for name, pattern in checks.items():
            with self.subTest(name=name), patch.dict("os.environ", {
                **STAGING_SETTINGS, name: re.search(pattern, production)[0]
            }):
                with self.assertRaisesRegex(ValueError, "production"):
                    staging_auth_config()
