"""Synchronise games.json with Nintendo Australia's official NSO catalogues."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup


MAIN_URL = "https://www.nintendo.com/au/hardware/nintendo-switch-online/classic-games/"
MATURE_N64_URL = "https://www.nintendo.com/au/games/nintendo-switch/nintendo-64-nintendo-classics-mature/"
VIRTUAL_BOY_URL = "https://www.nintendo.com/au/games/nintendo-switch/virtual-boy-nintendo-classics/"
OUTPUT_FILE = Path("games.json")

# Nintendo's consolidated AU catalogue can lag behind release announcements.
# Source: Nintendo US news, 2026-08-13, "The next sun-sational update..."
RELEASE_ADDITIONS = {
    "GameCube": ["Super Mario Sunshine"],
}

MAIN_TABLES = {
    "S:1": "NES",
    "S:3": "SNES",
    "S:7": "N64",
    "S:a": "Game Boy Advance",
    "S:d": "GameCube",
    "S:f": "Sega Genesis / Mega Drive",
}

ALIASES = {
    "super mario strikers": "mario smash football",
    "warioware": "warioware inc minigame mania",
    "joe and mac aka caveman ninja": "caveman ninja also known as joe and mac",
    "super earth defense force": "super e d f earth defense force",
    "uncharted water new horizons": "uncharted waters new horizons",
    "magical drop2": "magical drop ii",
    "crusaders of centy": "crusader of centy soleil",
    "street fighter ii champion edition": "street fighter ii special champion edition",
    "donkey kong land 3": "donkey kong land iii",
    "castlevania bloodlines": "castlevania bloodline",
    "m u s h a": "musha",
}

EMPTY_GAME = {
    "image": "N/A",
    "year": "N/A",
    "screenshots": [],
    "publishers": [],
    "additional_platforms": [],
    "esrb_rating": None,
    "metacritic": None,
    "released": None,
    "tags": [],
}


def clean_title(title: str) -> str:
    return re.sub(r"\*+$", "", title).strip()


def title_key(title: str) -> str:
    title = clean_title(title).replace("™", "").replace("®", "")
    title = title.replace("'", "").replace("’", "")
    title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    title = title.lower().replace("&", " and ")
    title = re.sub(r"\bthe\b", " ", title)
    title = re.sub(r"[^a-z0-9]+", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    return ALIASES.get(title, title)


def table_titles(element) -> list[str]:
    return [
        clean_title(cell.get_text(" ", strip=True))
        for cell in element.select("table td p")
        if cell.get_text(" ", strip=True)
    ]


def parse_catalog_tables(html: str, table_map: dict[str, str] = MAIN_TABLES) -> dict[str, list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    catalog = {}
    for element_id, system in table_map.items():
        element = soup.find(id=element_id)
        if element is None:
            raise ValueError(f"official catalogue table {element_id!r} was not found")
        catalog[system] = table_titles(element)

    game_boy_panel = soup.find(id="game-boy-content")
    if game_boy_panel is not None:
        catalog["Game Boy"] = table_titles(game_boy_panel)
    return catalog


def parse_included_games(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    tables = [table_titles(table) for table in soup.select("table")]
    tables = [titles for titles in tables if titles]
    if not tables:
        raise ValueError("official included-games table was not found")
    return max(tables, key=len)


def apply_release_additions(catalog: dict[str, list[str]], additions: dict[str, list[str]]) -> None:
    for system, titles in additions.items():
        current = catalog.setdefault(system, [])
        current_keys = {title_key(title) for title in current}
        for title in titles:
            if title_key(title) not in current_keys:
                current.append(title)
                current_keys.add(title_key(title))


def merge_catalog(existing: list[dict], catalog: dict[str, list[str]]) -> list[dict]:
    official = {}
    for system, titles in catalog.items():
        for title in titles:
            unique_key = (system, title_key(title))
            if unique_key in official:
                raise ValueError(f"duplicate official entry: {system} / {title}")
            official[unique_key] = title

    merged = []
    added = set()
    for old in existing:
        unique_key = (old.get("system"), title_key(old.get("name", "")))
        if unique_key not in official or unique_key in added:
            continue
        game = dict(old)
        game["name"] = official[unique_key]
        merged.append(game)
        added.add(unique_key)

    for unique_key, title in official.items():
        if unique_key not in added:
            system, _ = unique_key
            merged.append({"name": title, "system": system, **EMPTY_GAME})
    return merged


def download(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "nso-list catalog sync"})
    response.raise_for_status()
    return response.text


def build_catalog(main_html: str, mature_html: str, virtual_boy_html: str) -> dict[str, list[str]]:
    catalog = parse_catalog_tables(main_html)
    catalog["N64"].extend(parse_included_games(mature_html))
    catalog["Virtual Boy"] = parse_included_games(virtual_boy_html)
    apply_release_additions(catalog, RELEASE_ADDITIONS)
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--main-html", type=Path, help="use a downloaded main catalogue page")
    args = parser.parse_args()

    main_html = args.main_html.read_text(encoding="utf-8") if args.main_html else download(MAIN_URL)
    catalog = build_catalog(main_html, download(MATURE_N64_URL), download(VIRTUAL_BOY_URL))
    existing = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    games = merge_catalog(existing, catalog)
    OUTPUT_FILE.write_text(json.dumps(games, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUTPUT_FILE} with {len(games)} official Australian catalogue entries.")


if __name__ == "__main__":
    main()
