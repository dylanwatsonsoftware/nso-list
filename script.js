class MovieDisplay {
    constructor() {
        this.movieList = document.getElementById('movie-list');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.searchInput = document.getElementById('search');
        this.kidsFilterButton = document.getElementById('filter-kids');
        this.favouritesButton = document.getElementById('filter-favourites');
        this.categoryDropdown = document.getElementById('category-filter');
        this.tvButton = document.getElementById('filter-tvshows');

        this.allMovies = [];
        this.kidsTitles = new Set();
        this.categoriesMap = {};
        this.allCategories = [];
        this.kidsFilterEnabled = false;
        this.favouritesFilterEnabled = false;
        this.favourites = new Set(JSON.parse(localStorage.getItem('favouriteMovies') || '[]'));
        this.tvMode = false;
        this.tvShows = [];
        this.groupedTvShows = {};
        this.currentShowName = '';
        this.currentSeason = '';

        this.init();
    }

    async init() {
        try {
            await Promise.all([
                this.loadMovies(),
                this.loadKidsTitles(),
                this.loadCategories(),
                this.loadTvShows()
            ]);
            this.h1Title = document.querySelector('h1');
            this.setupSearch();
            this.setupFilterButton();
            this.setupFavouritesButton();
            this.setupCategoryDropdown();
            this.setupTvButton();
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
        this.h1Title.textContent = this.tvMode ? 'Watson TV Shows 🍿' : 'Watson Movies 🍿';
    }

    async loadMovies() {
        const response = await fetch('games.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.allMovies = await response.json();
        this.displayMovies(this.allMovies);
    }

    async loadKidsTitles() {
        const response = await fetch('kids.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const kidsList = await response.json();
        this.kidsTitles = new Set(kidsList.map(title => title.toLowerCase()));
    }

    async loadCategories() {
        const response = await fetch('movie-categories.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.categoriesMap = await response.json();
        const categorySet = new Set();
        Object.values(this.categoriesMap).forEach(arr => arr.forEach(cat => categorySet.add(cat)));
        this.allCategories = Array.from(categorySet).sort();
    }

    async loadTvShows() {
        const response = await fetch('tvshows.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.tvShows = await response.json();
        // Group by showName
        this.groupedTvShows = {};
        this.tvShows.forEach(show => {
            const showName = show.showName || show.name || 'Unknown Show';
            if (!this.groupedTvShows[showName]) this.groupedTvShows[showName] = [];
            this.groupedTvShows[showName].push(show);
        });
    }

    // --- Query Param Helpers ---
    getCurrentFilters() {
        return {
            search: this.searchInput?.value || '',
            kids: this.kidsFilterEnabled ? '1' : '',
            favourites: this.favouritesFilterEnabled ? '1' : '',
            category: this.categoryDropdown?.value || '',
            tv: this.tvMode ? '1' : '',
            show: this.currentShowName || '',
            season: this.currentSeason || ''
        };
    }

    setFiltersFromQuery() {
        const params = new URLSearchParams(window.location.search);
        this.searchInput.value = params.get('search') || '';
        this.kidsFilterEnabled = params.get('kids') === '1';
        this.favouritesFilterEnabled = params.get('favourites') === '1';
        this.categoryDropdown.value = params.get('category') || '';
        this.tvMode = params.get('tv') === '1';
        this.currentShowName = params.get('show') || '';
        this.currentSeason = params.get('season') || '';
        // Update button text
        this.kidsFilterButton.textContent = 'Kids Only';
        if (this.kidsFilterEnabled) {
          this.kidsFilterButton.classList.add("active");
        } else {
          this.kidsFilterButton.classList.remove("active");
        }
        this.favouritesButton.textContent = 'Favourites Only';
        if (this.favouritesFilterEnabled) {
          this.favouritesButton.classList.add("active");
        } else {
          this.favouritesButton.classList.remove("active");
        }
        this.tvButton.textContent = 'TV Shows';
        if (this.tvMode) {
          this.tvButton.classList.add("active");
        } else {
          this.tvButton.classList.remove("active");
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

    // --- Override navigation to update history and filters ---
    setupSearch() {
        if (!this.searchInput) return;
        this.searchInput.addEventListener('input', () => {
            this.currentShowName = '';
            this.currentSeason = '';
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupFilterButton() {
        if (!this.kidsFilterButton) return;
        this.kidsFilterButton.addEventListener('click', () => {
            this.kidsFilterEnabled = !this.kidsFilterEnabled;
            this.kidsFilterButton.textContent = "Kids Only";
            this.currentShowName = '';
            this.currentSeason = '';
            if (this.kidsFilterEnabled) {
                this.kidsFilterButton.classList.add("active");
            } else {
                this.kidsFilterButton.classList.remove("active");
            }
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
            this.currentShowName = '';
            this.currentSeason = '';
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupCategoryDropdown() {
        if (!this.categoryDropdown) return;
        this.categoryDropdown.innerHTML = '<option value="">All Categories</option>' +
            this.allCategories.map(cat => `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`).join('');
        this.categoryDropdown.addEventListener('change', () => {
            this.currentShowName = '';
            this.currentSeason = '';
            this.updateFilteredDisplay();
            this.updateHistory();
        });
    }

    setupTvButton() {
        if (!this.tvButton) return;
        this.tvButton.addEventListener('click', () => {
            this.tvMode = !this.tvMode;
            this.tvButton.textContent = 'TV Shows';
            if(this.tvMode) {
                this.tvButton.classList.add("active");
            } else {
                this.tvButton.classList.remove("active");
            }
            this.currentShowName = '';
            this.currentSeason = '';
            this.updateFilteredDisplay();
            this.updateHistory();
            this.updateTitle();
        });
    }

    updateFilteredDisplay() {
        // Hide or show category and kids filter based on tvMode
        if (this.categoryDropdown) {
            this.categoryDropdown.style.display = this.tvMode ? 'none' : '';
        }
        if (this.kidsFilterButton) {
            this.kidsFilterButton.style.display = this.tvMode ? 'none' : '';
        }

        if (this.tvMode) {
            // TV mode: filter by search and favourites
            const query = this.searchInput?.value.trim().toLowerCase() || '';
            let filteredShows = this.groupedTvShows;
            if (query || this.favouritesFilterEnabled) {
                filteredShows = {};
                Object.keys(this.groupedTvShows).forEach(showName => {
                    const matchesSearch = !query || showName.toLowerCase().includes(query);
                    const matchesFavourites = !this.favouritesFilterEnabled || this.favourites.has(showName);
                    if (matchesSearch && matchesFavourites) {
                        filteredShows[showName] = this.groupedTvShows[showName];
                    }
                });
            }
            this.displayTvShows(filteredShows);
            return;
        }

        const query = this.searchInput?.value.trim().toLowerCase() || '';
        const selectedCategory = this.categoryDropdown?.value || '';

        let filtered = this.allMovies.filter(movie => {
            const title = movie.title || movie.name || '';
            const year = movie.year || movie.release_date || '';
            const genre = movie.genre || movie.genres || '';
            const rating = movie.rating || movie.imdb_rating || '';
            const image = movie.image || movie.poster || movie.poster_url || '';
            const path = movie.path || '';

            const isFavourite = this.favourites.has(title);

            const lcTitle = title.toLowerCase();

            const allValues = Object.values(movie)
                .map(val => (typeof val === 'string' || typeof val === 'number') ? val.toString().toLowerCase() : '')
                .join(' ');

            const matchesSearch = allValues.includes(query);
            const matchesKids = !this.kidsFilterEnabled || this.kidsTitles.has(lcTitle);
            const matchesCategory = !selectedCategory || (this.categoriesMap[title] || []).includes(selectedCategory);
            const matchesFavourites = !this.favouritesFilterEnabled || this.favourites.has(title);

            return matchesSearch && matchesKids && matchesCategory && matchesFavourites;
        });

        this.displayMovies(filtered);
    }

    displayMovies(movies) {
        this.hideLoading();

        if (!Array.isArray(movies) || movies.length === 0) {
            this.showError('No movies found.');
            return;
        }

        this.error.classList.add('hidden');
        this.movieList.innerHTML = '';

        movies.forEach(movie => {
            const item = this.createMovieItem(movie);
            this.movieList.appendChild(item);
        });

        this.movieList.classList.remove('hidden');
    }

    createMovieItem(movie) {
        const li = document.createElement('li');
        li.className = 'movie-item';

        const title = movie.title || movie.name || 'Unknown Title';
        const year = movie.year || movie.release_date || '';
        const genre = movie.genre || movie.genres || '';
        const rating = movie.rating || movie.imdb_rating || '';
        const image = movie.image || movie.poster || movie.poster_url || '';
        const path = movie.path || '';

        const isFavourite = this.favourites.has(title);

        li.innerHTML = `
            ${this.createImageElement(image, title)}
            <div class="movie-header">
                <div class="movie-title">${this.escapeHtml(title)}</div>
                <div class="favourite-icon" title="Toggle favourite" data-title="${this.escapeHtml(title)}">${isFavourite ? '❤️' : '🤍'}</div>
            </div>
            <div class="movie-info">
                ${year ? `<div class="movie-year">Year: ${this.escapeHtml(year)}</div>` : ''}
                ${genre ? `<div class="movie-genre">Genre: ${this.escapeHtml(genre)}</div>` : ''}
                ${rating ? `<div class="movie-rating">Rating: ${this.escapeHtml(rating)}</div>` : ''}
            </div>
        `;

        // Handle casting
        if (path) {
            li.style.cursor = 'pointer';
            li.title = 'Click to cast to Chromecast';
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favourite-icon')) {
                    navigator.clipboard.writeText(path.replace("/Volumes/", "smb://Seagate-3F9DDE/"));
                    window.open("vlc://");
                }
            });
        }

        // Handle favourite toggle
        const heart = li.querySelector('.favourite-icon');
        heart.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavourite(title, heart);
        });

        return li;
    }

    displayTvShows(groupedShows = this.groupedTvShows) {
        this.hideLoading();
        this.error.classList.add('hidden');
        this.movieList.innerHTML = '';
        this.movieList.classList.remove('hidden');
        // Remove any existing back button
        this.removeBackButton();
        Object.keys(groupedShows).sort().forEach(showName => {
            const isFavourite = this.favourites.has(showName);
            let image = '';
            const episodes = groupedShows[showName];
            if (episodes && episodes.length) {
                const withImage = episodes.find(ep => ep.image && ep.image.trim() !== '');
                if (withImage) image = withImage.image;
            }
            const li = document.createElement('li');
            li.className = 'movie-item tv-show-group';
            li.innerHTML = `
                ${this.createImageElement(image, showName)}
                <div class="movie-header">
                    <div class="movie-title">${this.escapeHtml(showName)}</div>
                    <div class="favourite-icon" title="Toggle favourite show" data-title="${this.escapeHtml(showName)}">${isFavourite ? '❤️' : '🤍'}</div>
                </div>
            `;
            const heart = li.querySelector('.favourite-icon');
            heart.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavourite(showName, heart);
                this.updateHistory();
            });
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('favourite-icon')) {
                    this.currentShowName = showName;
                    this.currentSeason = '';
                    this.displayTvSeasons(showName);
                    this.updateHistory();
                }
            });
            this.movieList.appendChild(li);
        });
    }

    displayTvSeasons(showName) {
        // Add back button
        this.movieList.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back to Shows';
        backBtn.addEventListener('click', () => {
            this.currentShowName = '';
            this.currentSeason = '';
            this.displayTvShows();
            this.updateHistory();
        });
        this.movieList.appendChild(backBtn);
        const episodes = this.groupedTvShows[showName] || [];
        const seasons = {};
        episodes.forEach(ep => {
            const season = ep.season || 'Unknown';
            if (!seasons[season]) seasons[season] = [];
            seasons[season].push(ep);
        });
        Object.keys(seasons).sort((a,b)=>a-b).forEach(season => {
            let image = '';
            const seasonEpisodes = seasons[season];
            if (seasonEpisodes && seasonEpisodes.length) {
                const withImage = seasonEpisodes.find(ep => ep.image && ep.image.trim() !== '');
                if (withImage) image = withImage.image;
            }
            const li = document.createElement('li');
            li.className = 'movie-item tv-season-group';
            li.innerHTML = `
                ${this.createImageElement(image, showName + ' Season ' + season)}
                <div class="movie-title">Season ${this.escapeHtml(season)}</div>
            `;
            li.addEventListener('click', () => {
                this.currentShowName = showName;
                this.currentSeason = season;
                this.displayTvEpisodes(showName, season);
                this.updateHistory();
            });
            this.movieList.appendChild(li);
        });
    }

    pad(num, size = 2) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    }

    displayTvEpisodes(showName, season) {
        // Add back button
        this.movieList.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.textContent = '← Back to Seasons';
        backBtn.addEventListener('click', () => {
            this.currentSeason = '';
            this.displayTvSeasons(showName);
            this.updateHistory();
        });
        this.movieList.appendChild(backBtn);
        const episodes = (this.groupedTvShows[showName] || []).filter(ep => String(ep.season) === String(season) || season == "Unknown");
        episodes.sort((a,b) => (a.episode||0)-(b.episode||0)).forEach(ep => {
            const li = document.createElement('li');
            li.className = 'movie-item tv-episode';
            const episodeIndicator = (ep.season ? `S${this.pad(ep.season)}` : "") +
            (ep.episode ? `E${this.pad(ep.episode)}` : "");


            let title = (ep.name || ep.fileName || "")
            if (!title.includes(episodeIndicator)) {
                title = `${episodeIndicator} - ${title}`;
            }
              
              
            const image = ep.image || '';
            li.innerHTML = `
                ${this.createImageElement(image, title)}
                <div class="movie-title" title="${ep.fileName}">${this.escapeHtml(title)}</div>
            `;
            if (ep.path) {
                li.style.cursor = 'pointer';
                li.title = 'Click to cast to Chromecast';
                li.addEventListener('click', () => {
                    navigator.clipboard.writeText(ep.path.replace("/Volumes/", "smb://Seagate-3F9DDE/"));
                    window.open("vlc://");
                });
            }
            this.movieList.appendChild(li);
        });
    }

    renderBackButton(onClick) {
        this.removeBackButton();
        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back';
        backBtn.className = 'back-button';
        backBtn.style.margin = '16px 0';
        backBtn.style.display = 'block';
        backBtn.style.fontSize = '1rem';
        backBtn.style.padding = '8px 18px';
        backBtn.style.background = '#23272f';
        backBtn.style.color = '#fff';
        backBtn.style.border = '1px solid #444';
        backBtn.style.borderRadius = '999px';
        backBtn.style.cursor = 'pointer';
        backBtn.style.marginLeft = 'auto';
        backBtn.style.marginRight = 'auto';
        backBtn.addEventListener('click', onClick);
        // Insert before movieList
        this.movieList.parentNode.insertBefore(backBtn, this.movieList);
    }

    removeBackButton() {
        const prev = this.movieList.previousSibling;
        if (prev && prev.className && prev.className.includes('back-button')) {
            prev.remove();
        }
    }

    // --- Listen for popstate to support back/forward navigation ---
    setupPopState() {
        window.addEventListener('popstate', () => {
            this.setFiltersFromQuery();
            this.updateFilteredDisplay();
        });
    }

    clearAllFilters() {
        this.searchInput.value = '';
        this.kidsFilterEnabled = false;
        this.favouritesFilterEnabled = false;
        this.categoryDropdown.value = '';
        this.currentShowName = '';
        this.currentSeason = '';

        // Update button text & classes
        this.kidsFilterButton.textContent = 'Kids Only';
        this.kidsFilterButton.classList.remove('active');

        this.favouritesButton.textContent = 'Favourites Only';
        this.favouritesButton.classList.remove('active');

        this.tvMode = false;
        this.tvButton.textContent = 'TV Shows';

        this.updateFilteredDisplay();
        this.updateHistory();
    }

    toggleFavourite(title, element) {
        if (this.favourites.has(title)) {
            this.favourites.delete(title);
            element.textContent = '🤍';
        } else {
            this.favourites.add(title);
            element.textContent = '❤️';
        }
        localStorage.setItem('favouriteMovies', JSON.stringify([...this.favourites]));
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
    new MovieDisplay();
});
