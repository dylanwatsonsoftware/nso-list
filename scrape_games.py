import requests
from bs4 import BeautifulSoup
import json

URL = "https://www.ign.com/wikis/nintendo-switch-2/Nintendo_Switch_Online_Service_and_List_of_Games"
OUTPUT_FILE = "games.json"

def scrape_games():
    response = requests.get(URL)
    soup = BeautifulSoup(response.content, "html.parser")

    game_sections = soup.find_all("h3")
    games = []

    current_platform = None
    for h3 in game_sections:
        title_text = h3.get_text(strip=True)
        if "Nintendo Switch Online" in title_text and "Game Catalog" not in title_text:
            current_platform = title_text.replace("Nintendo Switch Online - ", "").strip()
        
        table = h3.find_next_sibling("table")
        if table and current_platform:
            rows = table.find_all("tr")[1:]  # skip header
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 1:
                    name = cols[0].get_text(strip=True)
                    if name:
                        games.append({"name": name, "platform": current_platform})

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(games, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    scrape_games()
