import requests
import json
import time

# --- Configuration (REPLACE WITH YOUR OWN CREDENTIALS) ---
TWITCH_CLIENT_ID = "YOUR_TWITCH_CLIENT_ID" # Replace with your Twitch Client ID
TWITCH_CLIENT_SECRET = "YOUR_TWITCH_CLIENT_SECRET" # Replace with your Twitch Client Secret
# ---------------------------------------------------------

# IGDB API Endpoints
TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
IGDB_API_URL = "https://api.igdb.com/v4/games"

def get_twitch_access_token(client_id, client_secret):
    """
    Obtains a Twitch access token required for IGDB API authentication.
    """
    print("Attempting to get Twitch access token...")
    params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }
    try:
        response = requests.post(TWITCH_TOKEN_URL, params=params)
        response.raise_for_status() # Raise an exception for HTTP errors
        token_data = response.json()
        access_token = token_data.get("access_token")
        if access_token:
            print("Successfully obtained Twitch access token.")
            return access_token
        else:
            print("Failed to get access token: 'access_token' not found in response.")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error getting Twitch access token: {e}")
        return None

def get_game_cover_url(game_name, access_token, client_id):
    """
    Searches IGDB for a game and returns its cover art URL.
    """
    headers = {
        "Client-ID": client_id,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    # IGDB queries are sent as a string in the request body
    # We request the 'cover' field and then the 'url' from the cover.
    # We also specify 'fields' for the game itself to get the cover ID.
    query = f'fields name, cover.url; search "{game_name}"; limit 1;'

    try:
        response = requests.post(IGDB_API_URL, headers=headers, data=query)
        response.raise_for_status() # Raise an exception for HTTP errors
        game_data = response.json()

        if game_data and len(game_data) > 0:
            game = game_data[0]
            if "cover" in game and "url" in game["cover"]:
                # IGDB cover URLs are often thumbnails, replace 'thumb' with '1080p' for higher resolution
                # or '720p', 'screenshot_big', etc. Check IGDB API documentation for image sizes.
                image_url = game["cover"]["url"].replace("thumb", "cover_big")
                return image_url
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error searching IGDB for '{game_name}': {e}")
        return None
    except json.JSONDecodeError:
        print(f"Error decoding JSON response for '{game_name}'. Response: {response.text}")
        return None

def augment_json_with_images(input_filename, output_filename, client_id, client_secret):
    """
    Loads game data, fetches images from IGDB, and saves the augmented data.
    """
    try:
        with open(input_filename, 'r', encoding='utf-8') as f:
            games = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file '{input_filename}' not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{input_filename}'. Check file format.")
        return

    access_token = get_twitch_access_token(client_id, client_secret)
    if not access_token:
        print("Cannot proceed without a valid Twitch access token.")
        return

    augmented_games = []
    total_games = len(games)
    print(f"\nAugmenting {total_games} games with images from IGDB...")

    for i, game in enumerate(games):
        game_name = game.get("name")
        if game_name and game.get("image") == "N/A": # Only try to fetch if image is not already set
            print(f"[{i+1}/{total_games}] Searching for image for: {game_name}")
            image_url = get_game_cover_url(game_name, access_token, client_id)
            if image_url:
                game["image"] = image_url
                print(f"  Found image for {game_name}: {image_url}")
            else:
                print(f"  No image found or error for {game_name}. Keeping as 'N/A'.")
            time.sleep(0.1) # Be polite to the API, 100ms delay between requests
        augmented_games.append(game)

    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(augmented_games, f, indent=4, ensure_ascii=False)
        print(f"\nSuccessfully augmented {total_games} games and saved to '{output_filename}'.")
    except IOError as e:
        print(f"Error writing augmented JSON to file: {e}")

if __name__ == "__main__":
    input_json_file = "nintendo_switch_online_games.json"
    output_json_file = "nintendo_switch_online_games_with_images.json"

    if TWITCH_CLIENT_ID == "YOUR_TWITCH_CLIENT_ID" or TWITCH_CLIENT_SECRET == "YOUR_TWITCH_CLIENT_SECRET":
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("WARNING: Please replace 'YOUR_TWITCH_CLIENT_ID' and 'YOUR_TWITCH_CLIENT_SECRET'")
        print("         with your actual Twitch developer credentials before running.")
        print("         See instructions above on how to obtain them.")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    else:
        augment_json_with_images(input_json_file, output_json_file, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET)
