import unittest

from packagist_sync import published_version_matches
from release_version import release_bump, select_tag


class ReleaseTest(unittest.TestCase):
    def test_conventional_commits_choose_increment(self):
        self.assertEqual(release_bump("Merge develop\n\nfix: cache\n"), "patch")
        self.assertEqual(release_bump("feat(board): add tables\nfix: layout\n"), "minor")
        self.assertEqual(release_bump("feat: add tables\nfix!: change API\n"), "major")
        self.assertEqual(release_bump("refactor: API\n\nBREAKING CHANGE: removed endpoint\n"), "major")

    def test_first_release_ignores_unrelated_and_prerelease_tags(self):
        self.assertEqual(select_tag(["v9.0.0-alpha", "example"], []), "v0.1.0")

    def test_numeric_order_and_patch_increment(self):
        self.assertEqual(select_tag(["v0.1.9", "v0.1.10"], []), "v0.1.11")

    def test_minor_and_major_reset_lower_components(self):
        self.assertEqual(select_tag(["v1.2.3"], [], "minor"), "v1.3.0")
        self.assertEqual(select_tag(["v1.2.3"], [], "major"), "v2.0.0")

    def test_retry_reuses_existing_head_tag(self):
        self.assertEqual(select_tag(["v0.1.0", "v0.1.1"], ["v0.1.0"], "major"), "v0.1.0")

    def test_unprefixed_tags_and_invalid_bump(self):
        self.assertEqual(select_tag(["1.2.3"], []), "v1.2.4")
        with self.assertRaises(ValueError):
            select_tag([], [], "anything")

    def test_publication_requires_version_commit_and_dependency(self):
        version = {"version": "v0.1.0", "source": {"reference": "abc"},
                   "require": {"getartisanflow/wireflow": "0.2.4-alpha"}}
        payload = {"packages": {"makermind/erd4dev": [version]}}
        def matches(tag="v0.1.0", commit="abc", dependency="0.2.4-alpha"):
            return published_version_matches(payload, "makermind/erd4dev", tag, commit, dependency)
        self.assertTrue(matches())
        self.assertFalse(matches(tag="v0.1.1"))
        self.assertFalse(matches(commit="old"))
        self.assertFalse(matches(dependency="0.1.2-alpha"))

    def test_minified_metadata(self):
        payload = {"packages": {"package": [
            {"version": "v0.1.1", "source": {"reference": "abc"},
             "require": {"getartisanflow/wireflow": "0.2.4-alpha"}},
            {"version": "v0.1.0"},
        ]}}
        self.assertTrue(published_version_matches(payload, "package", "v0.1.0", "abc", "0.2.4-alpha"))


if __name__ == "__main__":
    unittest.main()
