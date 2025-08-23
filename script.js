class GameDisplay {
    constructor() {
        this.gameList = document.getElementById('movie-list');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.searchInput = document.getElementById('search');
        this.favouritesButton = document.getElementById('filter-favourites');
        this.platformDropdown = document.getElementById('platform-filter');
        this.twoPlayerButton = document.getElementById('filter-2player');

        this.allGames = [];
        this.favourites = new Set(JSON.parse(localStorage.getItem('favouriteGames') || '[]'));
        this.favouritesFilterEnabled = false;
        this.platformFilter = '';
        this.twoPlayerFilterEnabled = false;

        this.init();
    }

    async init() {
        try {
            await this.loadGames();
            this.h1Title = document.querySelector('h1');
            this.setupSearch();
            this.setupFavouritesButton();
            this.setupPlatformDropdown();
            this.setupTwoPlayerButton();
            this.setupPopState();
            this.setFiltersFromQuery();
            this.updateFilteredDisplay();
            this.updateTitle();
        } catch (error) {
            this.showError('Failed to load data: ' + error.message);
        }
    }

    updateTitle() {
        if (!this.h1Title) return;
        this.h1Title.textContent = 'NSO Games 🎮';
    }

    async loadGames() {
        const response = await fetch('games.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.allGames = await response.json();
        this.populatePlatformDropdown();
        this.displayGames(this.allGames);
    }

    populatePlatformDropdown() {
        if (!this.platformDropdown) return;
        const platforms = Array.from(new Set(this.allGames.map(g => g.system).filter(Boolean))).sort();
        this.platformDropdown.innerHTML = '<option value="">All Platforms</option>' +
            platforms.map(p => `<option value="${this.escapeHtml(p)}">${this.escapeHtml(p)}</option>`).join('');
    }

    getCurrentFilters() {
        return {
            search: this.searchInput?.value || '',
            favourites: this.favouritesFilterEnabled ? '1' : '',
            platform: this.platformDropdown?.value || '',
            twoPlayer: this.twoPlayerFilterEnabled ? '1' : ''
        };
    }

    setFiltersFromQuery() {
        const params = new URLSearchParams(window.location.search);
        this.searchInput.value = params.get('search') || '';
        this.favouritesFilterEnabled = params.get('favourites') === '1';
        this.platformFilter = params.get('platform') || '';
        this.twoPlayerFilterEnabled = params.get('twoPlayer') === '1';
        if (this.platformDropdown) this.platformDropdown.value = this.platformFilter;
        this.favouritesButton.textContent = 'Favourites Only';
        if (this.favouritesFilterEnabled) {
            this.favouritesButton.classList.add("active");
        } else {
            this.favouritesButton.classList.remove("active");
        }
        if (this.twoPlayerButton) {
            if (this.twoPlayerFilterEnabled) {
                this.twoPlayerButton.classList.add("active");
            } else {
                this.twoPlayerButton.classList.remove("active");
            }
        }
        this.updateTitle();
    }

    updateHistory() {
        const filters = this.getCurrentFilters();
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val) params.set(key, val);
        });
        const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.pushState(filters, '', url);
    }

    setupSearch() {
        if (!this.searchInput) return;
        this.searchInput.addEventListener('input', () => {
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupFavouritesButton() {
        if (!this.favouritesButton) return;
        this.favouritesButton.addEventListener('click', () => {
            this.favouritesFilterEnabled = !this.favouritesFilterEnabled;
            this.favouritesButton.textContent = 'Favourites Only';
            if (this.favouritesFilterEnabled) {
                this.favouritesButton.classList.add("active");
            } else {
                this.favouritesButton.classList.remove("active");
            }
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupPlatformDropdown() {
        if (!this.platformDropdown) return;
        this.platformDropdown.addEventListener('change', () => {
            this.platformFilter = this.platformDropdown.value;
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupTwoPlayerButton() {
        if (!this.twoPlayerButton) return;
        this.twoPlayerButton.addEventListener('click', () => {
            this.twoPlayerFilterEnabled = !this.twoPlayerFilterEnabled;
            if (this.twoPlayerFilterEnabled) {
                this.twoPlayerButton.classList.add("active");
            } else {
                this.twoPlayerButton.classList.remove("active");
            }
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    updateFilteredDisplay() {
        const query = this.searchInput?.value.trim().toLowerCase() || '';
        const platform = this.platformDropdown?.value || '';
        const twoPlayerEnabled = this.twoPlayerFilterEnabled;
        const twoPlayerTags = ["2 player", "co-op", "multiplayer", "two players", "cooperative"];
        let filtered = this.allGames.filter(game => {
            const name = game.name || '';
            const system = game.system || '';
            const year = game.year || '';
            const isFavourite = this.favourites.has(name);
            const tags = Array.isArray(game.tags) ? game.tags.map(t => t.toLowerCase()) : [];
            const allValues = [name, system, year].join(' ').toLowerCase();
            const matchesSearch = allValues.includes(query);
            const matchesFavourites = !this.favouritesFilterEnabled || isFavourite;
            const matchesPlatform = !platform || system === platform;
            const matchesTwoPlayer = !twoPlayerEnabled || tags.some(tag => twoPlayerTags.some(tp => tag.includes(tp)));
            return matchesSearch && matchesFavourites && matchesPlatform && matchesTwoPlayer;
        });

        this.displayGames(filtered);
    }

    displayGames(games) {
        this.hideLoading();

        if (!Array.isArray(games) || games.length === 0) {
            this.showError('No games found.');
            return;
        }

        // Sort by metacritic score descending, null/undefined at the end
        games = [...games].sort((a, b) => {
            const ma = a.metacritic;
            const mb = b.metacritic;
            if (ma == null && mb == null) return 0;
            if (ma == null) return 1;
            if (mb == null) return -1;
            return mb - ma;
        });

        this.error.classList.add('hidden');
        this.gameList.innerHTML = '';

        games.forEach(game => {
            const item = this.createGameItem(game);
            this.gameList.appendChild(item);
        });

        this.gameList.classList.remove('hidden');
    }

    createGameItem(game) {
        const li = document.createElement('li');
        li.className = 'movie-item';

        const name = game.name || 'Unknown Title';
        const system = game.system || '';
        const year = game.year || game.released || '';
        const image = game.image && game.image !== "N/A" ? game.image : '';
        const publishers = game.publishers ? game.publishers.join(', ') : '';
        const platforms = game.additional_platforms ? game.additional_platforms.join(', ') : '';
        const esrb = game.esrb_rating || '';
        const metacritic = game.metacritic != null ? game.metacritic : '';
        const released = game.released || '';
        const screenshots = Array.isArray(game.screenshots) ? game.screenshots : [];

        const isFavourite = this.favourites.has(name);

        li.innerHTML = `
            ${this.createImageElement(image, name)}
            <div class="movie-header">
                <div class="movie-title">${this.escapeHtml(name)}</div>
                <div class="favourite-icon" title="Toggle favourite" data-title="${this.escapeHtml(name)}">${isFavourite ? "❤️" : "🤍"}</div>
            </div>
            <div class="movie-info" style="display: flex; flex-direction: column; gap: 2px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${system && system !== "N/A" ? `<div class="movie-genre">${this.escapeHtml(system)}</div>` : ""}
                    ${metacritic !== '' && metacritic !== null && metacritic !== undefined ? `<div style="margin-left:15px;"><span style="color:#fff;background:#6c3;border-radius:6px;padding:2px 8px;font-weight:700;">${this.escapeHtml(metacritic.toString())}</span> <span style="color:#aaa;font-size:0.9em;"></span></div>` : ''}
                </div>
                ${year && year !== "N/A" ? `<div class="movie-year">${this.escapeHtml(year)}</div>` : ""}
            </div>
        `;

        // Handle favourite toggle
        const heart = li.querySelector('.favourite-icon');
        heart.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavourite(name, heart);
        });

        // Show details modal on click
        li.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favourite-icon')) {
                this.showGameModal({
                    name, system, year, image, publishers, platforms, esrb, metacritic, released, screenshots
                });
            }
        });

        return li;
    }

    showGameModal(game) {
        // Remove any existing modal
        let modal = document.getElementById('game-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'game-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.overflowY = 'auto';

        const content = document.createElement('div');
        content.style.background = '#23232b';
        content.style.borderRadius = '18px';
        content.style.padding = '32px 24px 24px 24px';
        content.style.maxWidth = '700px';
        content.style.width = '95vw';
        content.style.maxHeight = '90vh';
        content.style.overflowY = 'auto';
        content.style.boxShadow = '0 8px 32px #000a';
        content.style.position = 'relative';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '16px';
        closeBtn.style.right = '24px';
        closeBtn.style.fontSize = '2rem';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '2';
        closeBtn.addEventListener('click', () => modal.remove());
        content.appendChild(closeBtn);

        // Main image
        if (game.image) {
            const img = document.createElement('img');
            img.src = game.image;
            img.alt = game.name;
            img.style.width = '100%';
            img.style.maxHeight = '260px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '12px';
            img.style.marginBottom = '18px';
            content.appendChild(img);
        }

        // Details
        const details = document.createElement('div');
        details.innerHTML = `
            <h2 style="margin-bottom: 10px; color: #fff;">${this.escapeHtml(game.name)}</h2>
            <div style="color: #ccc; margin-bottom: 10px;">${game.system ? `<b>System:</b> ${this.escapeHtml(game.system)}` : ''}</div>
            ${game.year ? `<div style="color: #ccc;"><b>Year:</b> ${this.escapeHtml(game.year)}</div>` : ''}
            ${game.released ? `<div style="color: #ccc;"><b>Released:</b> ${this.escapeHtml(game.released)}</div>` : ''}
            ${game.publishers ? `<div style="color: #ccc;"><b>Publisher(s):</b> ${this.escapeHtml(game.publishers)}</div>` : ''}
            ${game.platforms ? `<div style="color: #ccc;"><b>Platforms:</b> ${this.escapeHtml(game.platforms)}</div>` : ''}
            ${game.esrb ? `<div style="color: #ccc;"><b>ESRB:</b> ${this.escapeHtml(game.esrb)}</div>` : ''}
            ${game.metacritic !== '' && game.metacritic !== null && game.metacritic !== undefined ? `<div style="color: #ccc;"><b>Metacritic:</b> ${this.escapeHtml(game.metacritic.toString())}</div>` : ''}
        `;
        content.appendChild(details);

        // Screenshots
        if (game.screenshots && game.screenshots.length > 0) {
            const shotsDiv = document.createElement('div');
            shotsDiv.style.display = 'flex';
            shotsDiv.style.flexWrap = 'wrap';
            shotsDiv.style.gap = '10px';
            shotsDiv.style.marginTop = '18px';
            shotsDiv.style.justifyContent = 'center';
            shotsDiv.innerHTML = '<b style="width:100%;color:#fff;">Screenshots</b>';
            game.screenshots.forEach(url => {
                const shot = document.createElement('img');
                shot.src = url;
                shot.alt = 'Screenshot';
                shot.style.width = '140px';
                shot.style.height = '90px';
                shot.style.objectFit = 'cover';
                shot.style.borderRadius = '8px';
                shot.style.background = '#18181b';
                shotsDiv.appendChild(shot);
            });
            content.appendChild(shotsDiv);
        }

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // --- Listen for popstate to support back/forward navigation ---
    setupPopState() {
        window.addEventListener('popstate', () => {
            this.setFiltersFromQuery();
            this.updateFilteredDisplay();
        });
    }

    toggleFavourite(name, element) {
        if (this.favourites.has(name)) {
            this.favourites.delete(name);
            element.textContent = '🤍';
        } else {
            this.favourites.add(name);
            element.textContent = '❤️';
        }
        localStorage.setItem('favouriteGames', JSON.stringify([...this.favourites]));
        if (this.favouritesFilterEnabled) this.updateFilteredDisplay();
    }

    createImageElement(imageSrc, title) {
        if (imageSrc) {
            return `<img src="${this.escapeHtml(imageSrc)}" alt="${this.escapeHtml(title)}" class="movie-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="movie-image placeholder" style="display: none;">No Image Available</div>`;
        } else {
            return `<div class="movie-image placeholder">No Image Available</div>`;
        }
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    showError(message) {
        this.hideLoading();
        this.error.textContent = message;
        this.error.classList.remove('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameDisplay();
});
