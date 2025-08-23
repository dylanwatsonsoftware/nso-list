import json
import requests
import time
import os
from dotenv import load_dotenv

# --- Configuration (REPLACE WITH YOUR OWN CREDENTIALS) ---
load_dotenv()
RAWG_API_KEY = os.getenv('RAWG_API_KEY')  # Loaded from .env file
# ---------------------------------------------------------

RAWG_API_URL = 'https://api.rawg.io/api/games'
INPUT_FILE = 'games.json'
OUTPUT_FILE = 'games_with_tags.json'
CACHE_FILE = 'rawg_tags_cache.json'

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def get_game_tags(game_name, cache=None):
    cache_key = game_name.strip().lower()
    if cache and cache_key in cache:
        return cache[cache_key]
    params = {
        'key': RAWG_API_KEY,
        'search': game_name,
        'page_size': 1
    }
    try:
        resp = requests.get(RAWG_API_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data.get('results'):
            game = data['results'][0]
            tags = [tag['name'] for tag in game.get('tags', []) if 'name' in tag]
            if cache is not None:
                cache[cache_key] = tags
                save_cache(cache)
            return tags
    except Exception as e:
        print(f"Error fetching tags for {game_name}: {e}")
    return []

def main():
    cache = load_cache()
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        games = json.load(f)

    for game in games:
        needs_tags = 'tags' not in game or not isinstance(game['tags'], list)
        if needs_tags:
            tags = get_game_tags(game['name'], cache)
            if tags:
                print(f"Found tags for {game['name']}: {tags}")
                game['tags'] = tags
            else:
                print(f"No tags found for {game['name']}")
        else:
            print(f"Already has tags for {game['name']}")
        time.sleep(1.1)  # Be nice to the API

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(games, f, ensure_ascii=False, indent=2)
    print(f"Done. Output written to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
