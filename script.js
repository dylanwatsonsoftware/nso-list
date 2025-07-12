class GameDisplay {
    constructor() {
        this.gameList = document.getElementById('movie-list');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.searchInput = document.getElementById('search');
        this.favouritesButton = document.getElementById('filter-favourites');

        this.allGames = [];
        this.favourites = new Set(JSON.parse(localStorage.getItem('favouriteGames') || '[]'));
        this.favouritesFilterEnabled = false;

        this.init();
    }

    async init() {
        try {
            await this.loadGames();
            this.h1Title = document.querySelector('h1');
            this.setupSearch();
            this.setupFavouritesButton();
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
        this.displayGames(this.allGames);
    }

    getCurrentFilters() {
        return {
            search: this.searchInput?.value || '',
            favourites: this.favouritesFilterEnabled ? '1' : ''
        };
    }

    setFiltersFromQuery() {
        const params = new URLSearchParams(window.location.search);
        this.searchInput.value = params.get('search') || '';
        this.favouritesFilterEnabled = params.get('favourites') === '1';
        this.favouritesButton.textContent = 'Favourites Only';
        if (this.favouritesFilterEnabled) {
            this.favouritesButton.classList.add("active");
        } else {
            this.favouritesButton.classList.remove("active");
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

    updateFilteredDisplay() {
        const query = this.searchInput?.value.trim().toLowerCase() || '';
        let filtered = this.allGames.filter(game => {
            const name = game.name || '';
            const system = game.system || '';
            const year = game.year || '';
            const isFavourite = this.favourites.has(name);

            const allValues = [name, system, year].join(' ').toLowerCase();
            const matchesSearch = allValues.includes(query);
            const matchesFavourites = !this.favouritesFilterEnabled || isFavourite;

            return matchesSearch && matchesFavourites;
        });

        this.displayGames(filtered);
    }

    displayGames(games) {
        this.hideLoading();

        if (!Array.isArray(games) || games.length === 0) {
            this.showError('No games found.');
            return;
        }

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
        const year = game.year || '';
        const image = game.image && game.image !== "N/A" ? game.image : '';

        const isFavourite = this.favourites.has(name);

        li.innerHTML = `
            ${this.createImageElement(image, name)}
            <div class="movie-header">
                <div class="movie-title">${this.escapeHtml(name)}</div>
                <div class="favourite-icon" title="Toggle favourite" data-title="${this.escapeHtml(name)}">${isFavourite ? '❤️' : '🤍'}</div>
            </div>
            <div class="movie-info">
                ${system ? `<div class="movie-genre">System: ${this.escapeHtml(system)}</div>` : ''}
                ${year && year !== "N/A" ? `<div class="movie-year">Year: ${this.escapeHtml(year)}</div>` : ''}
            </div>
        `;

        // Handle favourite toggle
        const heart = li.querySelector('.favourite-icon');
        heart.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavourite(name, heart);
        });

        return li;
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
