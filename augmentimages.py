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
RAWG_SCREENSHOTS_URL = 'https://api.rawg.io/api/games/{id}/screenshots'
INPUT_FILE = 'games.json'
OUTPUT_FILE = 'games_with_images.json'
CACHE_FILE = 'rawg_cache.json'

# Load or initialize cache
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

def get_game_data(game_name, system=None, cache=None):
    cache_key = game_name.strip().lower()
    if cache and cache_key in cache:
        return tuple(cache[cache_key])
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
            image = game.get('background_image')
            game_id = game.get('id')
            # Year
            year = None
            if game.get('released'):
                year = game['released'][:4]
            # Publishers
            publishers = []
            if 'publishers' in game and game['publishers']:
                publishers = [pub['name'] for pub in game['publishers'] if 'name' in pub]
            # Additional platforms
            platforms = []
            if 'platforms' in game and game['platforms']:
                platforms = [p['platform']['name'] for p in game['platforms'] if 'platform' in p and 'name' in p['platform']]
            # Screenshots
            screenshots = []
            if game_id:
                s_params = {'key': RAWG_API_KEY}
                s_url = RAWG_SCREENSHOTS_URL.format(id=game_id)
                s_resp = requests.get(s_url, params=s_params, timeout=10)
                if s_resp.ok:
                    s_data = s_resp.json()
                    screenshots = [shot['image'] for shot in s_data.get('results', []) if 'image' in shot]
            # ESRB Rating
            esrb_rating = None
            if 'esrb_rating' in game and game['esrb_rating'] and 'name' in game['esrb_rating']:
                esrb_rating = game['esrb_rating']['name']
            # Metacritic
            metacritic = game.get('metacritic')
            # Released (full date)
            released = game.get('released')
            result = (image, screenshots, year, publishers, platforms, esrb_rating, metacritic, released)
            if cache is not None:
                cache[cache_key] = list(result)
                save_cache(cache)
            return result
    except Exception as e:
        print(f"Error fetching data for {game_name}: {e}")
    return None, [], None, [], [], None, None, None

def main():
    cache = load_cache()
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        games = json.load(f)

    for game in games:
        needs_image = not game.get('image') or game['image'] == 'N/A'
        needs_screenshots = 'screenshots' not in game or not isinstance(game['screenshots'], list)
        needs_year = not game.get('year') or game['year'] == 'N/A'
        needs_publishers = 'publishers' not in game or not isinstance(game['publishers'], list)
        needs_platforms = 'additional_platforms' not in game or not isinstance(game['additional_platforms'], list)
        needs_esrb = 'esrb_rating' not in game
        needs_metacritic = 'metacritic' not in game
        needs_released = 'released' not in game
        if needs_image or needs_screenshots or needs_year or needs_publishers or needs_platforms or needs_esrb or needs_metacritic or needs_released:
            image_url, screenshots, year, publishers, platforms, esrb_rating, metacritic, released = get_game_data(game['name'], game.get('system'), cache)
            if needs_image and image_url:
                print(f"Found image for {game['name']}")
                game['image'] = image_url
            elif needs_image:
                print(f"No image found for {game['name']}")
            if needs_screenshots and screenshots:
                print(f"Found {len(screenshots)} screenshots for {game['name']}")
                game['screenshots'] = screenshots
            elif needs_screenshots:
                print(f"No screenshots found for {game['name']}")
            if needs_year and year:
                print(f"Found year {year} for {game['name']}")
                game['year'] = year
            elif needs_year:
                print(f"No year found for {game['name']}")
            if needs_publishers and publishers:
                print(f"Found publishers for {game['name']}: {publishers}")
                game['publishers'] = publishers
            elif needs_publishers:
                print(f"No publishers found for {game['name']}")
            if needs_platforms and platforms:
                print(f"Found additional platforms for {game['name']}: {platforms}")
                game['additional_platforms'] = platforms
            elif needs_platforms:
                print(f"No additional platforms found for {game['name']}")
            if needs_esrb and esrb_rating:
                print(f"Found ESRB rating for {game['name']}: {esrb_rating}")
                game['esrb_rating'] = esrb_rating
            elif needs_esrb:
                print(f"No ESRB rating found for {game['name']}")
            if needs_metacritic and metacritic is not None:
                print(f"Found Metacritic score for {game['name']}: {metacritic}")
                game['metacritic'] = metacritic
            elif needs_metacritic:
                print(f"No Metacritic score found for {game['name']}")
            if needs_released and released:
                print(f"Found released date for {game['name']}: {released}")
                game['released'] = released
            elif needs_released:
                print(f"No released date found for {game['name']}")
            time.sleep(1.1)  # Be nice to the API
        else:
            print(f"Already has all data for {game['name']}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(games, f, ensure_ascii=False, indent=2)
    print(f"Done. Output written to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
