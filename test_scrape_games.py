import unittest

from scrape_games import apply_release_additions, merge_catalog, parse_catalog_tables, title_key


class CatalogParsingTests(unittest.TestCase):
    def test_parses_named_table_and_removes_footnote_markers(self):
        html = """
        <div hidden id="S:d"><table><tr>
          <td><p>Mario &amp; Wario***</p></td>
          <td><p>THE TOWER OF DRUAGA**</p></td>
        </tr></table></div>
        """

        self.assertEqual(
            parse_catalog_tables(html, {"S:d": "SNES"}),
            {"SNES": ["Mario & Wario", "THE TOWER OF DRUAGA"]},
        )

    def test_title_key_ignores_trademarks_and_apostrophe_styles(self):
        self.assertEqual(title_key("Kirby's Star Stacker"), title_key("Kirby’s Star Stacker™"))

    def test_release_announcements_extend_a_lagging_catalog(self):
        catalog = {"GameCube": ["Luigi's Mansion"]}

        apply_release_additions(catalog, {"GameCube": ["Super Mario Sunshine"]})

        self.assertEqual(catalog["GameCube"], ["Luigi's Mansion", "Super Mario Sunshine"])


class CatalogMergeTests(unittest.TestCase):
    def test_preserves_metadata_when_official_regional_title_changes(self):
        existing = [{
            "name": "Super Mario Strikers",
            "system": "GameCube",
            "image": "cover.jpg",
            "tags": ["Multiplayer"],
        }]

        merged = merge_catalog(existing, {"GameCube": ["Mario Smash Football"]})

        self.assertEqual(merged, [{
            "name": "Mario Smash Football",
            "system": "GameCube",
            "image": "cover.jpg",
            "tags": ["Multiplayer"],
        }])

    def test_adds_new_titles_with_safe_defaults_and_drops_stale_titles(self):
        existing = [{"name": "Old Game", "system": "NES", "image": "old.jpg"}]

        merged = merge_catalog(existing, {"NES": ["BATTLETOADS"]})

        self.assertEqual(merged, [{
            "name": "BATTLETOADS",
            "system": "NES",
            "image": "N/A",
            "year": "N/A",
            "screenshots": [],
            "publishers": [],
            "additional_platforms": [],
            "esrb_rating": None,
            "metacritic": None,
            "released": None,
            "tags": [],
        }])

    def test_rejects_duplicate_official_entries(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            merge_catalog([], {"N64": ["Turok 2", "Turok 2"]})

    def test_keeps_existing_order_and_appends_new_titles(self):
        existing = [
            {"name": "Zelda", "system": "NES"},
            {"name": "Mario", "system": "NES"},
        ]

        merged = merge_catalog(existing, {"NES": ["Mario", "Metroid", "Zelda"]})

        self.assertEqual([game["name"] for game in merged], ["Zelda", "Mario", "Metroid"])


if __name__ == "__main__":
    unittest.main()
