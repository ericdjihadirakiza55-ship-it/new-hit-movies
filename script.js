import { db } from "./firebase-config.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ---------- Setup ---------- */

const $ = id => document.getElementById(id);

const els = {
    homeView: $("home-view"),
    detailsView: $("details-view"),
    featured: $("featured"),
    search: $("search"),
    genre: $("genre"),
    sort: $("sort"),
    count: $("movie-count"),
    status: $("movie-status"),
    list: $("movie-list"),
    noResults: $("no-results"),
    loadMore: $("load-more")
};

const SITE_NAME = "New Hit Movies";
const DEFAULT_DESCRIPTION =
    "Browse new and popular movies, watch trailers and find where to watch.";
const PAGE_SIZE = 12;

const GENRE_LABELS = {
    action: "Action",
    comedy: "Comedy",
    animation: "Animation",
    fantasy: "Fantasy",
    scifi: "Sci-Fi"
};

const state = {
    movies: [],
    loaded: false,
    shown: PAGE_SIZE,
    query: "",
    genre: "all",
    sort: "newest"
};

let savedScroll = 0;

/* ---------- Helpers ---------- */

// Small helper to build elements safely (text is never parsed as HTML).
function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;

        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : value);
    }

    node.append(...children.filter(Boolean));
    return node;
}

// Allow only HTTPS links.
function safeUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : null;
    } catch {
        return null;
    }
}

// One place to turn any YouTube link into a video ID.
function getYouTubeId(value) {
    const href = safeUrl(value);
    if (!href) return null;

    const url = new URL(href);
    const host = url.hostname.replace(/^(www|m)\./, "");
    let id = null;

    if (host === "youtube.com") {
        if (url.pathname === "/watch") {
            id = url.searchParams.get("v");
        } else if (url.pathname.startsWith("/embed/")) {
            id = url.pathname.split("/")[2];
        }
    } else if (host === "youtu.be") {
        id = url.pathname.slice(1);
    }

    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

function genreLabel(value) {
    const key = (value || "").toLowerCase();
    if (GENRE_LABELS[key]) return GENRE_LABELS[key];
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

function movieMeta(movie) {
    const parts = [];
    if (movie.year) parts.push(String(movie.year));
    const g = genreLabel(movie.genre);
    if (g) parts.push(g);
    if (movie.rating) parts.push("★ " + movie.rating);
    return parts.join(" · ");
}

function setPageInfo(title, description) {
    document.title = title ? title + " | " + SITE_NAME : SITE_NAME;

    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", description || DEFAULT_DESCRIPTION);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title || SITE_NAME);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description || DEFAULT_DESCRIPTION);
}

/* ---------- Building blocks ---------- */

function createPoster(movie) {
    const poster = el("div", { class: "poster" });
    const posterUrl = safeUrl(movie.posterUrl);

    if (!posterUrl) {
        poster.textContent = "🎞️";
        return poster;
    }

    const img = el("img", {
        src: posterUrl,
        alt: (movie.title || "Movie") + " poster",
        width: 300,
        height: 450,
        loading: "lazy"
    });

    img.addEventListener("error", () => {
        img.remove();
        poster.textContent = "🎞️";
    });

    poster.appendChild(img);
    return poster;
}

function createCard(movie) {
    const link = el(
        "a",
        {
            class: "movie-link",
            href: "#movie=" + encodeURIComponent(movie.id),
            "aria-label": (movie.title || "Untitled movie") + ", view details"
        },
        createPoster(movie),
        el("h3", { text: movie.title || "Untitled movie" }),
        el("p", { class: "meta", text: movieMeta(movie) })
    );

    const buttons = el("div", { class: "movie-buttons" });

    const watchUrl = safeUrl(movie.watchUrl);
    if (watchUrl) {
        buttons.appendChild(
            el("a", {
                class: "btn",
                href: watchUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Watch Movie"
            })
        );
    }

    const downloadUrl = safeUrl(movie.downloadUrl);
    if (downloadUrl) {
        buttons.appendChild(
            el("a", {
                class: "btn btn-secondary",
                href: downloadUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Download Movie"
            })
        );
    }

    // Always shown, even when a movie has no links.
    buttons.appendChild(
        el("a", {
            class: "btn btn-outline",
            href: "#movie=" + encodeURIComponent(movie.id),
            text: "View Details"
        })
    );

    return el("article", { class: "movie" }, link, buttons);
}

function showSkeletons(count = 8) {
    const items = Array.from({ length: count }, () =>
        el("div", { class: "skeleton", "aria-hidden": "true" })
    );
    els.list.replaceChildren(...items);
}

/* ---------- Home: filter, sort, paginate ---------- */

// Use the full release date when there is one, otherwise fall back to the year.
function dateKey(movie) {
    return movie.releaseDate || (movie.year ? String(movie.year) : "");
}

const SORTERS = {
    newest: (a, b) => dateKey(b).localeCompare(dateKey(a)),
    oldest: (a, b) =>
        (dateKey(a) || "9999").localeCompare(dateKey(b) || "9999"),
    rating: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
    az: (a, b) => (a.title || "").localeCompare(b.title || "")
};

function getFilteredMovies() {
    const query = state.query.toLowerCase();

    return state.movies
        .filter(movie => {
            const title = (movie.title || "").toLowerCase();
            const genre = (movie.genre || "").toLowerCase();

            return (
                title.includes(query) &&
                (state.genre === "all" || genre === state.genre)
            );
        })
        .sort(SORTERS[state.sort]);
}

function renderList() {
    const filtered = getFilteredMovies();
    const page = filtered.slice(0, state.shown);

    els.list.replaceChildren(...page.map(createCard));
    els.noResults.hidden = filtered.length > 0;
    els.loadMore.hidden = filtered.length <= state.shown;
    els.count.textContent =
        filtered.length + (filtered.length === 1 ? " movie" : " movies");
}

function fillGenreOptions() {
    const genres = [
        ...new Set(
            state.movies
                .map(m => (m.genre || "").toLowerCase())
                .filter(Boolean)
        )
    ].sort();

    els.genre.replaceChildren(
        el("option", { value: "all", text: "All genres" }),
        ...genres.map(g => el("option", { value: g, text: genreLabel(g) }))
    );
}

function renderFeatured() {
    const sorted = [...state.movies].sort(SORTERS.newest);
    const movie = sorted.find(m => safeUrl(m.posterUrl)) || sorted[0];

    if (!movie) {
        els.featured.hidden = true;
        return;
    }

    const posterUrl = safeUrl(movie.posterUrl);
    if (posterUrl) {
        els.featured.style.setProperty("--backdrop", 'url("' + posterUrl + '")');
    }

    const description = movie.description || "";
    const shortText =
        description.length > 220 ? description.slice(0, 217) + "..." : description;

    const actions = el(
        "div",
        { class: "details-actions" },
        el("a", {
            class: "btn",
            href: "#movie=" + encodeURIComponent(movie.id),
            text: "View details"
        })
    );

    els.featured.replaceChildren(
        el(
            "div",
            { class: "featured-inner" },
            createPoster(movie),
            el(
                "div",
                { class: "featured-text" },
                el("p", { class: "featured-label", text: "Featured" }),
                el("h2", { text: movie.title || "Untitled movie" }),
                el("p", { class: "meta", text: movieMeta(movie) }),
                el("p", { text: shortText }),
                actions
            )
        )
    );

    els.featured.hidden = false;
}

/* ---------- Details page ---------- */

function createRelated(movie) {
    const key = (movie.genre || "").toLowerCase();
    if (!key) return null;

    const related = state.movies
        .filter(m => m.id !== movie.id && (m.genre || "").toLowerCase() === key)
        .sort(SORTERS.newest)
        .slice(0, 8);

    if (!related.length) return null;

    return el(
        "section",
        { class: "related", "aria-labelledby": "related-title" },
        el("h2", { id: "related-title", text: "More " + genreLabel(key) + " movies" }),
        el("div", { class: "related-row" }, ...related.map(createCard))
    );
}

function showMovieDetails(movie) {
    const title = movie.title || "Untitled movie";

    // Facts list (only shows fields that exist).
    const facts = [];
    if (movie.runtime) facts.push(["Runtime", movie.runtime + " min"]);
    if (movie.director) facts.push(["Director", movie.director]);

    const cast = Array.isArray(movie.cast) ? movie.cast.join(", ") : movie.cast;
    if (cast) facts.push(["Cast", cast]);
    if (movie.releaseDate) facts.push(["Released", movie.releaseDate]);

    const factsList = facts.length
        ? el(
              "dl",
              { class: "details-facts" },
              ...facts.flatMap(([label, value]) => [
                  el("dt", { text: label }),
                  el("dd", { text: value })
              ])
          )
        : null;

    // Action buttons.
    const actions = el("div", { class: "details-actions" });

    const watchUrl = safeUrl(movie.watchUrl);
    if (watchUrl) {
        actions.appendChild(
            el("a", {
                class: "btn",
                href: watchUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Watch Movie"
            })
        );
    }

    const downloadUrl = safeUrl(movie.downloadUrl);
    if (downloadUrl) {
        actions.appendChild(
            el("a", {
                class: "btn btn-secondary",
                href: downloadUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                text: "Download Movie"
            })
        );
    }

    // Trailer.
    const videoId = getYouTubeId(movie.trailerUrl);
    const trailer = videoId
        ? el(
              "section",
              { class: "details-trailer" },
              el("h2", { text: "Trailer" }),
              el("iframe", {
                  src: "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId),
                  title: title + " trailer",
                  loading: "lazy",
                  allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share",
                  allowfullscreen: true,
                  referrerpolicy: "strict-origin-when-cross-origin"
              })
          )
        : null;

    // replaceChildren turns null into the text "null", so drop empty sections.
    const sections = [
        el("a", { class: "back-link", href: "#", text: "← All movies" }),
        el(
            "div",
            { class: "details-content" },
            createPoster(movie),
            el(
                "div",
                { class: "details-info" },
                el("h1", { text: title }),
                el("p", { class: "details-meta", text: movieMeta(movie) }),
                el("p", {
                    class: "details-description",
                    text: movie.description || "No description available."
                }),
                factsList,
                actions
            )
        ),
        trailer,
        createRelated(movie)
    ].filter(Boolean);

    els.detailsView.replaceChildren(...sections);

    setPageInfo(title, movie.description);
    setView("details");
}

function showNotFound() {
    els.detailsView.replaceChildren(
        el(
            "div",
            { class: "not-found" },
            el("h1", { text: "Movie not found" }),
            el("p", {
                class: "status",
                text: "This movie may have been removed or the link is wrong."
            }),
            el("a", { class: "btn", href: "#", text: "Browse all movies" })
        )
    );

    setPageInfo("Movie not found");
    setView("details");
}

/* ---------- Router ---------- */

function setView(view) {
    const isDetails = view === "details";
    els.homeView.hidden = isDetails;
    els.detailsView.hidden = !isDetails;

    if (isDetails) {
        window.scrollTo(0, 0);
    } else {
        // Remove the details page so a playing trailer stops.
        els.detailsView.replaceChildren();
        window.scrollTo(0, savedScroll);
    }
}

function route() {
    const match = location.hash.match(/^#movie=(.+)$/);

    if (match) {
        if (!state.loaded) {
            els.detailsView.replaceChildren(
                el("p", { class: "status", text: "Loading movie..." })
            );
            setView("details");
            return;
        }

        const id = decodeURIComponent(match[1]);
        const movie = state.movies.find(m => m.id === id);

        if (movie) showMovieDetails(movie);
        else showNotFound();
        return;
    }

    setPageInfo("");
if (location.hash === "#about") {
    setView("home");
    requestAnimationFrame(() => {
        $("about").scrollIntoView({ behavior: "smooth" });
    });
    return;
}

setView("home");

if (location.hash === "#top" || location.hash === "") {
    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
  
}

window.addEventListener("hashchange", route);

// Remember where the person was on the list so Back returns there.
window.addEventListener(
    "scroll",
    () => {
        if (!els.homeView.hidden) savedScroll = window.scrollY;
    },
    { passive: true }
);

/* ---------- Events ---------- */

let searchTimer;
els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.query = els.search.value.trim();
        state.shown = PAGE_SIZE;
        renderList();
    }, 150);
});

els.genre.addEventListener("change", () => {
    state.genre = els.genre.value;
    state.shown = PAGE_SIZE;
    renderList();
});

els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    state.shown = PAGE_SIZE;
    renderList();
});

els.loadMore.addEventListener("click", () => {
    state.shown += PAGE_SIZE;
    renderList();
});

/* ---------- Load data ---------- */

// Cache the movie list in the browser so repeat visits don't re-read Firestore.
const CACHE_KEY = "nhm-movies-v1";
const CACHE_MINUTES = 5;

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const { time, movies } = JSON.parse(raw);
        const fresh = Date.now() - time < CACHE_MINUTES * 60 * 1000;
        return fresh && Array.isArray(movies) ? movies : null;
    } catch {
        return null;
    }
}

function writeCache(movies) {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ time: Date.now(), movies })
        );
    } catch {
        // Storage full or blocked: the site still works, just without caching.
    }
}

async function loadMovies() {
    showSkeletons();
    els.status.textContent = "Loading movies...";

    try {
        let movies = readCache();

        if (!movies) {
            const snapshot = await getDocs(collection(db, "movies"));

            // Keep the document ID so every movie has its own link.
            movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            writeCache(movies);
        }

        state.movies = movies;
        state.loaded = true;

        if (!state.movies.length) {
            els.list.replaceChildren();
            els.status.textContent = "No movies available yet. Check back soon.";
            route();
            return;
        }

        els.status.hidden = true;
        fillGenreOptions();
        renderFeatured();
        renderList();
        route();
    } catch (error) {
        console.error("Error loading movies:", error);
        els.list.replaceChildren();
        els.status.textContent =
            "Movies could not be loaded. Check your connection and refresh the page.";
        els.status.hidden = false;
    }
}

route();
loadMovies();
