// Function to scrape Nintendo Switch Online games from Eurogamer.net
function scrapeEurogamerNSOGames() {
    const games = [];
    const nsoPlatforms = [
        "SNES", "NES", "Game Boy Advance", "Game Boy", "N64", "GameCube", "Sega Genesis / Mega Drive"
    ];

    // Get the main article content area
    const articleContent = document.querySelector('.article_body_content'); // Adjust selector if needed

    if (!articleContent) {
        console.error("Could not find the main article content. Please check the selector.");
        return JSON.stringify([]);
    }

    // Get all h2 headings within the article content
    const headings = articleContent.querySelectorAll('h2');

    headings.forEach(heading => {
        const headingText = heading.textContent.trim();
        let currentSystem = null;

        // Determine the system based on the heading text
        for (const platform of nsoPlatforms) {
            if (headingText.includes(platform)) {
                currentSystem = platform;
                break;
            }
        }

        if (currentSystem) {
            // Find the next sibling element that contains the game list.
            // This can be tricky as it might be a <p> tag, <ul>, or just text nodes.
            // We'll look for the next few sibling nodes.
            let nextElement = heading.nextElementSibling;
            let gameListText = '';

            // Collect text until the next heading or end of section
            while (nextElement && nextElement.tagName !== 'H2') {
                // Check for image credit which often precedes the list
                if (nextElement.querySelector && nextElement.querySelector('.image-credit')) {
                    nextElement = nextElement.nextElementSibling;
                    continue; // Skip image credits
                }
                // Check for cookie consent block
                if (nextElement.classList && nextElement.classList.contains('js-cookie-consent-block')) {
                    nextElement = nextElement.nextElementSibling;
                    continue; // Skip cookie consent
                }

                if (nextElement.textContent.trim().length > 0) {
                    gameListText += nextElement.textContent.trim() + ' ';
                }
                nextElement = nextElement.nextElementSibling;
            }

            // Clean and split the game list text
            // Replace common separators with a consistent one (e.g., comma)
            // Then split by comma and trim each game name
            const rawGames = gameListText
                .replace(/(\r\n|\n|\r)/gm, ", ") // Replace newlines with commas
                .replace(/\s\s+/g, ' ') // Replace multiple spaces with single space
                .split(',')
                .map(game => game.replace(/^- /, '').trim()) // Remove leading dash from list items
                .filter(game => game.length > 0 && !game.toLowerCase().includes('image credit') && !game.toLowerCase().includes('here is a list of')); // Basic filtering for non-game text

            rawGames.forEach(gameName => {
                // Further clean up specific phrases that are not part of the game name
                const cleanedGameName = gameName
                    .replace(/ - The UFO Cover-Up/g, '')
                    .replace(/ - The Great Demon Lord Awaits/g, '')
                    .replace(/ - Stage 5 And Maxed Out!/g, '')
                    .replace(/ - The Second Loop/g, '')
                    .replace(/ - The Three Sacred Treasures/g, '')
                    .replace(/ SP - Meta Knight's revenge!/g, '')
                    .replace(/ - Now with Extra Game!/g, '')
                    .replace(/ SP - Dancy along with Kirby!/g, '')
                    .replace(/ SP - Set difficulty to Easy Breezy!/g, '')
                    .replace(/ - Samus Aran's Ultimate Arsenal/g, '')
                    .replace(/ - The Decisive Battle Against Ridley!/g, '')
                    .replace(/ - High Game Deviation Value!/g, '')
                    .replace(/ - The Thrilling Climax!/g, '')
                    .replace(/ - Certain Victory on Stage 8/g, '')
                    .replace(/ - Mario, the Quick-Change Artist!/g, '')
                    .replace(/ SP - Fully Souped Up!/g, '')
                    .replace(/ SP - Give the world a whole new look!/g, '')
                    .replace(/ SP - Champion Edition/g, '')
                    .replace(/ - Living The Life of Luxury!/g, '')
                    .replace(/ - A Second Helping of Donburi Island!/g, '')
                    .replace(/ - Link, Warrior without Equal/g, '')
                    .replace(/ \(Western exclusive\)/g, '') // Remove regional tags
                    .replace(/ \(Japan-only\)/g, '')
                    .replace(/ \(Western version and Japanese version\)/g, '')
                    .replace(/ \(Color\)/g, '') // Remove color tag from Game Boy
                    .replace(/ - Famicom as it's known in Japan/g, '') // Remove descriptive text
                    .replace(/ - or Genesis as it's known in the States/g, '') // Remove descriptive text
                    .replace(/ - The iconic video game character Super Mario, who is not wearing his trademark cap and Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - The Legend of Zelda: The Wind Waker running on Switch Online\. The GameCube library The Legend of Zelda: The Wind Waker \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Mark Kart 64 start screen, showing a bunch of racers and the logo Mario Kart 64 \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Game Boy Advance adventure The Legend of Zelda: The Minish Cap running via Nintendo Switch The Legend of Zelda: The Minish Cap \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Kirby Tilt n Tumble Kirby Tilt 'n' Tumble \| Image credit: Nintendo\/Eurogamer/g, '') // remove image credit
                    .replace(/ - Psycho Dream Psycho Dream \| Image credit: Nintendo\/Eurogamer/g, '') // remove image credit
                    .replace(/ - Mach Rider Mach Rider \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Animal Crossing Happy Home Paradise artwork Animal Crossing: New Horizons: Happy Home Paradise \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - The exclusive Nintendo Switch Online multiplayer puzzle game Tetris 99 in action\. Tetris \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Promotional image for the Nintendo Music streaming app, showing a smartphone playing a song from Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Streets of Rage II Streets of Rage II \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - Dr. Mario Dr. Mario - The UFO Cover-Up \| Image credit: Nintendo\/Eurogamer/g, '') // remove image credit
                    .replace(/ - The GameCube library The Legend of Zelda: The Wind Waker \| Image credit: Nintendo/g, '') // remove image credit
                    .replace(/ - The iconic video game character Super Mario, who is not wearing his trademark cap and Image credit: Nintendo/g, '') // remove image credit
                    .trim();


                if (cleanedGameName.length > 0) {
                    games.push({
                        name: cleanedGameName,
                        system: currentSystem,
                        image: "N/A", // Not available on the page
                        year: "N/A"   // Not available on the page
                    });
                }
            });
        }
    });

    // Removed the filtering for DLCs, SP games, and 99 games.
    return JSON.stringify(games, null, 4);
}

// To run this in your browser's console:
// 1. Go to https://www.eurogamer.net/all-nintendo-switch-online-games-available-to-play-right-now
// 2. Open the developer console (F12 or Ctrl+Shift+I / Cmd+Option+I)
// 3. Paste the entire function above into the console and press Enter.
// 4. Then call the function: scrapeEurogamerNSOGames()
// 5. The JSON string will be printed in the console. You can copy it from there.

// Example of how to call it and copy to clipboard (optional):
// const jsonOutput = scrapeEurogamerNSOGames();
// console.log(jsonOutput);
// // To copy to clipboard (might require user interaction/permission in some browsers)
// try {
//     const el = document.createElement('textarea');
//     el.value = jsonOutput;
//     document.body.appendChild(el);
//     el.select();
//     document.execCommand('copy');
//     document.body.removeChild(el);
//     console.log('JSON output copied to clipboard!');
// } catch (err) {
//     console.warn('Could not copy to clipboard automatically. Please copy from the console output.');
// }
