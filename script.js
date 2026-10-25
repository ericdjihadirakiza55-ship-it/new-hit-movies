import { db } from "./firebase-config.js";
import {
    collection,
    getDocsFromServer
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ---------- Setup ---------- */

const $ = id => document.getElementById(id);

const els = {
    homeView: $("home-view"),
    detailsView: $("details-view"),
    featured: $("featured"),
    rows: $("rows"),
    search: $("search"),
    genre: $("genre"),
    type: $("type"),
    version: $("version"),
    sort: $("sort"),
    count: $("movie-count"),
    status: $("movie-status"),
    list: $("movie-list"),
    noResults: $("no-results"),
    loadMore: $("load-more")
};

// Text comes from i18n.js (English / Kinyarwanda). Falls back to English if it is missing.
const t = (key, vars) =>
    window.I18N
        ? window.I18N.t(key, vars)
        : String(key)
              .replace(/\|\w+$/, "")
              .replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
const untitled = () => t("Untitled movie");

const SITE_NAME = "New Hit Movies";
const DEFAULT_DESCRIPTION_EN =
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
    type: "all",
    version: "all",
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

function isSeries(movie) {
    return movie.type === "series";
}

function watchLabel(movie) {
    return t(isSeries(movie) ? "Watch Series" : "Watch Movie");
}

function downloadLabel(movie) {
    return t(isSeries(movie) ? "Download Series" : "Download Movie");
}

function getSeasons(movie) {
    return Array.isArray(movie.seasons)
        ? [...movie.seasons].sort((a, b) => (a.number || 0) - (b.number || 0))
        : [];
}

function seasonText(count) {
    return t(count === 1 ? "{n} season" : "{n} seasons", { n: count });
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
    if (isSeries(movie)) parts.push(seasonText(getSeasons(movie).length));
    return parts.join(" · ");
}

// Small labels shown on cards and slides.
function getBadges(movie) {
    const list = [];
    if (isSeries(movie)) list.push([t("Series"), "badge-series"]);
    if (movie.interpreted === true) list.push([t("Interpreted|one"), "badge-interpreted"]);
    if (movie.subtitled === true) list.push([t("Subtitles"), "badge-subtitled"]);
    return list.map(([text, cls]) => el("span", { class: "badge " + cls, text }));
}

const defaultDescription = () => t(DEFAULT_DESCRIPTION_EN);

function setPageInfo(title, description) {
    document.title = title ? title + " | " + SITE_NAME : SITE_NAME;

    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", description || defaultDescription());

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title || SITE_NAME);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description || defaultDescription());
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
        alt: t("{title} poster", { title: movie.title || t("Movie") }),
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

// "🎙 VJ Name" line, shown on cards and slides of interpreted titles.
function interpreterLine(movie) {
    if (movie.interpreted !== true || !movie.interpreter) return null;
    return el("p", { class: "interpreter", text: "🎙 " + movie.interpreter });
}

function createCard(movie) {
    const link = el(
        "a",
        {
            class: "movie-link",
            href: "#movie=" + encodeURIComponent(movie.id),
            "aria-label": t("{title}, view details", { title: movie.title || untitled() })
        },
        createPoster(movie),
        el("h3", { text: movie.title || untitled() }),
        el("p", { class: "meta", text: movieMeta(movie) }),
        interpreterLine(movie)
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
                text: watchLabel(movie)
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
                text: downloadLabel(movie)
            })
        );
    }

    // Always shown, even when a movie has no links.
    buttons.appendChild(
        el("a", {
            class: "btn btn-outline",
            href: "#movie=" + encodeURIComponent(movie.id),
            text: t("View Details")
        })
    );

    const badges = getBadges(movie);

    return el(
        "article",
        { class: "movie" },
        badges.length ? el("div", { class: "badges" }, ...badges) : null,
        link,
        buttons
    );
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
                (state.genre === "all" || genre === state.genre) &&
                (state.version === "all" ||
                    (state.version === "interpreted"
                        ? movie.interpreted === true
                        : movie.subtitled === true)) &&
                (state.type === "all" || (state.type === "series") === isSeries(movie))
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
    const n = filtered.length;
    const countKey =
        state.type === "series"
            ? "{n} series"
            : state.type === "movie"
              ? n === 1 ? "{n} movie" : "{n} movies"
              : n === 1 ? "{n} title" : "{n} titles";
    els.count.textContent = t(countKey, { n });
    updateRowsVisibility();
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
        el("option", { value: "all", text: t("All genres") }),
        ...genres.map(g => el("option", { value: g, text: t(genreLabel(g)) }))
    );
}


/* ---------- Home rows (Newest, Top rated, Series) ---------- */

const ROW_SIZE = 10;

function createRow(title, movies, id) {
    return el(
        "section",
        { class: "home-row", "aria-labelledby": id },
        el("h2", { id, text: title }),
        el("div", { class: "related-row" }, ...movies.map(createCard))
    );
}

function renderRows() {
    const rows = [];

    const newest = [...state.movies].sort(SORTERS.newest).slice(0, ROW_SIZE);
    if (newest.length) rows.push(createRow(t("Newest"), newest, "row-newest"));

    const interpreted = state.movies
        .filter(m => m.interpreted === true)
        .sort(SORTERS.newest)
        .slice(0, ROW_SIZE);
    if (interpreted.length) rows.push(createRow(t("Interpreted movies"), interpreted, "row-interpreted"));

    const subtitled = state.movies
        .filter(m => m.subtitled === true)
        .sort(SORTERS.newest)
        .slice(0, ROW_SIZE);
    if (subtitled.length) rows.push(createRow(t("Movies with subtitles"), subtitled, "row-subtitled"));

    const top = state.movies
        .filter(m => Number(m.rating) > 0)
        .sort(SORTERS.rating)
        .slice(0, ROW_SIZE);
    if (top.length) rows.push(createRow(t("Top rated"), top, "row-top"));

    const series = state.movies
        .filter(isSeries)
        .sort(SORTERS.newest)
        .slice(0, ROW_SIZE);
    if (series.length) rows.push(createRow(t("Series"), series, "row-series"));

    els.rows.replaceChildren(...rows);
    updateRowsVisibility();
}

// Rows only show on the plain home page, not while searching or filtering.
function updateRowsVisibility() {
    const plain =
        !state.query &&
        state.genre === "all" &&
        state.type === "all" &&
        state.version === "all" &&
        state.sort === "newest";
    els.rows.hidden = !plain;
}

/* ---------- Featured slider (animated ad banner) ---------- */

const SLIDE_COUNT = 5;

// Titles ticked "Show in the top slider" come first, then the newest ones.
function pickFeatured() {
    const sorted = [...state.movies].sort(SORTERS.newest);
    const chosen = sorted.filter(m => m.featured === true).slice(0, SLIDE_COUNT);

    for (const movie of sorted) {
        if (chosen.length >= SLIDE_COUNT) break;
        if (!chosen.includes(movie) && safeUrl(movie.posterUrl)) chosen.push(movie);
    }
    return chosen;
}

function createSlide(movie, index, total) {
    const description = movie.description || "";
    const shortText =
        description.length > 200 ? description.slice(0, 197) + "..." : description;

    const actions = el("div", { class: "details-actions" });
    const watchUrl = safeUrl(movie.watchUrl);

    if (watchUrl) {
        actions.appendChild(
            el("a", {
                class: "btn",
                href: watchUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                text: watchLabel(movie)
            })
        );
    }

    actions.appendChild(
        el("a", {
            class: watchUrl ? "btn btn-outline" : "btn",
            href: "#movie=" + encodeURIComponent(movie.id),
            text: t("View details")
        })
    );

    const background = el("div", { class: "slide-bg", "aria-hidden": "true" });
    const posterUrl = safeUrl(movie.posterUrl);
    if (posterUrl) background.style.backgroundImage = 'url("' + posterUrl + '")';

    const poster = createPoster(movie);
    const posterImg = poster.querySelector("img");
    if (posterImg && index === 0) posterImg.loading = "eager";

    const badges = getBadges(movie);

    return el(
        "article",
        {
            class: "slide",
            role: "group",
            "aria-roledescription": "slide",
            "aria-label": t("{i} of {n}", { i: index + 1, n: total })
        },
        background,
        el(
            "div",
            { class: "featured-inner" },
            poster,
            el(
                "div",
                { class: "featured-text" },
                el("p", { class: "featured-label", text: t("Now showing") }),
                badges.length ? el("div", { class: "slide-tags" }, ...badges) : null,
                el("h2", { text: movie.title || untitled() }),
                el("p", { class: "meta", text: movieMeta(movie) }),
                interpreterLine(movie),
                shortText ? el("p", { class: "slide-desc", text: shortText }) : null,
                actions
            )
        )
    );
}

function renderFeatured() {
    const picks = pickFeatured();

    if (!picks.length) {
        els.featured.hidden = true;
        return;
    }

    const total = picks.length;
    const slides = picks.map((movie, i) => createSlide(movie, i, total));
    const track = el("div", { class: "slides" }, ...slides);
    const slider = el(
        "div",
        {
            class: "slider",
            role: "region",
            "aria-roledescription": "carousel",
            "aria-label": t("Featured titles")
        },
        track
    );

    let current = 0;
    const hold = { user: false, hover: false, focus: false };
    const dots = [];

    function paint() {
        slides.forEach((slide, i) => slide.classList.toggle("is-active", i === current));
        dots.forEach((dot, i) => {
            dot.classList.toggle("is-active", i === current);
            if (i === current) dot.setAttribute("aria-current", "true");
            else dot.removeAttribute("aria-current");
        });
    }

    function go(index) {
        current = (index + total) % total;
        paint();
    }

    // Only one title: no controls, no movement.
    if (total > 1) {
        const prev = el("button", { class: "slider-btn", type: "button", "aria-label": t("Previous slide"), text: "‹" });
        const next = el("button", { class: "slider-btn", type: "button", "aria-label": t("Next slide"), text: "›" });
        const pause = el("button", { class: "slider-btn slider-pause", type: "button", "aria-label": t("Pause slideshow"), text: "❚❚" });
        const dotBox = el("div", { class: "dots" });

        picks.forEach((movie, i) => {
            const dot = el(
                "button",
                {
                    class: "dot",
                    type: "button",
                    "aria-label": t("Show slide {n}: {title}", { n: i + 1, title: movie.title || untitled() })
                },
                el("i")
            );
            dot.addEventListener("click", () => go(i));
            dots.push(dot);
            dotBox.appendChild(dot);
        });

        const bar = el("div", { class: "slider-bar" }, prev, dotBox, pause, next);
        slider.appendChild(bar);

        const syncPause = () => {
            slider.classList.toggle("is-paused", hold.user || hold.hover || hold.focus);
        };

        prev.addEventListener("click", () => go(current - 1));
        next.addEventListener("click", () => go(current + 1));

        pause.addEventListener("click", () => {
            hold.user = !hold.user;
            pause.textContent = hold.user ? "▶" : "❚❚";
            pause.setAttribute("aria-label", t(hold.user ? "Play slideshow" : "Pause slideshow"));
            syncPause();
        });

        // The filling bar on the active dot is the timer: when it ends, go to the next slide.
        bar.addEventListener("animationend", event => {
            if (event.animationName === "dotfill") go(current + 1);
        });

        // Pause while a mouse is over the banner, or while keyboard focus is inside it.
        if (window.matchMedia("(hover: hover)").matches) {
            slider.addEventListener("mouseenter", () => { hold.hover = true; syncPause(); });
            slider.addEventListener("mouseleave", () => { hold.hover = false; syncPause(); });
        }
        slider.addEventListener("focusin", event => {
            if (event.target.matches(":focus-visible")) { hold.focus = true; syncPause(); }
        });
        slider.addEventListener("focusout", () => { hold.focus = false; syncPause(); });

        slider.addEventListener("keydown", event => {
            if (event.key === "ArrowLeft") go(current - 1);
            if (event.key === "ArrowRight") go(current + 1);
        });

        // Swipe on phones.
        let startX = null;
        let startY = 0;
        track.addEventListener("touchstart", event => {
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
        }, { passive: true });
        track.addEventListener("touchend", event => {
            if (startX === null) return;
            const dx = event.changedTouches[0].clientX - startX;
            const dy = event.changedTouches[0].clientY - startY;
            startX = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                go(current + (dx < 0 ? 1 : -1));
            }
        }, { passive: true });
    }

    paint();
    els.featured.replaceChildren(slider);
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
        el("h2", { id: "related-title", text: t("More {genre} titles", { genre: t(genreLabel(key)) }) }),
        el("div", { class: "related-row" }, ...related.map(createCard))
    );
}

function seasonLabel(season) {
    return season.number === 0 ? t("Specials") : t("Season {n}", { n: season.number });
}

function createEpisodeList(season) {
    const episodes = [...(season.episodeList || [])].sort(
        (a, b) => (b.number || 0) - (a.number || 0)
    );

    if (!episodes.length) {
        return el("p", { class: "status", text: t("No episodes added yet.") });
    }

    const items = episodes.map(ep => {
        const buttons = el("div", { class: "episode-buttons" });

        const watch = safeUrl(ep.watchUrl);
        if (watch) {
            buttons.appendChild(
                el("a", {
                    class: "btn",
                    href: watch,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    text: t("Watch")
                })
            );
        }

        const download = safeUrl(ep.downloadUrl);
        if (download) {
            buttons.appendChild(
                el("a", {
                    class: "btn btn-secondary",
                    href: download,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    text: t("Download")
                })
            );
        }

        return el(
            "li",
            { class: "episode" },
            el(
                "div",
                { class: "episode-head" },
                el("span", { class: "episode-badge", text: "S" + season.number + " E" + ep.number }),
                el("h3", { text: ep.title || t("Episode {n}", { n: ep.number }) })
            ),
            buttons.children.length ? buttons : null
        );
    });

    return el("ul", { class: "episode-list" }, ...items);
}

function createSeasons(movie) {
    const seasons = getSeasons(movie);
    if (!isSeries(movie) || !seasons.length) return null;

    const panel = el("div", { class: "episode-panel", "aria-live": "polite" });
    const tabs = el("div", { class: "season-tabs", role: "group", "aria-label": t("Seasons") });
    const buttons = [];

    const show = (season, button) => {
        buttons.forEach(b => b.setAttribute("aria-pressed", String(b === button)));
        const count = (season.episodeList || []).length;
        panel.replaceChildren(
            el("h3", {
                class: "episodes-title",
                text: seasonLabel(season) + " · " + t(count === 1 ? "{n} episode" : "{n} episodes", { n: count })
            }),
            createEpisodeList(season)
        );
    };

    seasons.forEach(season => {
        const button = el("button", {
            class: "btn btn-outline season-tab",
            type: "button",
            "aria-pressed": "false",
            text: seasonLabel(season)
        });
        button.addEventListener("click", () => show(season, button));
        buttons.push(button);
        tabs.appendChild(button);
    });

    // Open the first season by default so episodes are visible straight away.
    show(seasons[0], buttons[0]);

    return el("section", { class: "seasons" }, el("h2", { text: t("Seasons") }), tabs, panel);
}

function showMovieDetails(movie) {
    const title = movie.title || untitled();

    // Facts list (only shows fields that exist).
    const facts = [];
    if (movie.runtime) facts.push([t(isSeries(movie) ? "Episode length" : "Runtime"), t("{n} min", { n: movie.runtime })]);
    if (movie.director) facts.push([t(isSeries(movie) ? "Creator" : "Director"), movie.director]);

    const cast = Array.isArray(movie.cast) ? movie.cast.join(", ") : movie.cast;
    if (cast) facts.push([t("Cast"), cast]);
    if (movie.releaseDate) facts.push([t("Released"), movie.releaseDate]);
    if (movie.interpreted === true) {
        facts.push([t("Interpreted|one"), movie.interpreter ? t("By {name}", { name: movie.interpreter }) : t("Yes")]);
    }
    if (movie.subtitled === true) facts.push([t("Subtitles"), t("Available")]);

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
                text: watchLabel(movie)
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
                text: downloadLabel(movie)
            })
        );
    }

    // Trailer.
    const videoId = getYouTubeId(movie.trailerUrl);
    const trailer = videoId
        ? el(
              "section",
              { class: "details-trailer" },
              el("h2", { text: t("Trailer") }),
              el("iframe", {
                  src: "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId),
                  title: t("{title} trailer", { title }),
                  loading: "lazy",
                  allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share",
                  allowfullscreen: true,
                  referrerpolicy: "strict-origin-when-cross-origin"
              })
          )
        : null;

    // replaceChildren turns null into the text "null", so drop empty sections.
    const sections = [
        el("a", { class: "back-link", href: "#", text: t("← All titles") }),
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
                    text: movie.description || t("No description available.")
                }),
                factsList,
                actions
            )
        ),
        createSeasons(movie),
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
            el("h1", { text: t("Title not found") }),
            el("p", {
                class: "status",
                text: t("This title may have been removed or the link is wrong.")
            }),
            el("a", { class: "btn", href: "#", text: t("Browse all movies") })
        )
    );

    setPageInfo(t("Title not found"));
    setView("details");
}

/* ---------- Router ---------- */

function setView(view) {
    const isDetails = view === "details";
    els.homeView.hidden = isDetails;
    els.detailsView.hidden = !isDetails;

    if (isDetails) {
        window.scrollTo({ top: 0, behavior: "instant" });
    } else {
        // Remove the details page so a playing trailer stops.
        els.detailsView.replaceChildren();
        window.scrollTo({ top: savedScroll, behavior: "instant" });
    }
}

const HOME_ROUTES = {
    "#all": { type: "all", version: "all" },
    "#movies": { type: "movie", version: "all" },
    "#series": { type: "series", version: "all" },
    "#interpreted": { type: "all", version: "interpreted" },
    "#subtitles": { type: "all", version: "subtitled" }
};

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

    const target = HOME_ROUTES[location.hash];
    if (target) {
        state.type = target.type;
        state.version = target.version;
        els.type.value = target.type;
        els.version.value = target.version;
        state.shown = PAGE_SIZE;
        if (state.loaded) renderList();
        setView("home");
        if (location.hash === "#all") window.scrollTo(0, 0);
        else $("browse").scrollIntoView();
        return;
    }

    if (location.hash === "#about") {
        setView("home");
        $("about").scrollIntoView();
        return;
    }

    setView("home");
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

const menuButton = $("menu-toggle");
const mainNav = $("main-nav");

menuButton.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
});

mainNav.addEventListener("click", event => {
    if (event.target.closest("a")) {
        mainNav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
    }
});

els.type.addEventListener("change", () => {
    state.type = els.type.value;
    state.shown = PAGE_SIZE;
    renderList();
});

els.version.addEventListener("change", () => {
    state.version = els.version.value;
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
const CACHE_KEY = "nhm-movies-v3";
const CACHE_MINUTES = 5;

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const { time, movies } = JSON.parse(raw);
        const fresh = Date.now() - time < CACHE_MINUTES * 60 * 1000;
        // An empty list is never trusted, so a quiet moment never hides new movies.
        return fresh && Array.isArray(movies) && movies.length ? movies : null;
    } catch {
        return null;
    }
}

function writeCache(movies) {
    if (!movies.length) return;

    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ time: Date.now(), movies })
        );
    } catch {
        // Storage full or blocked: the site still works, just without caching.
    }
}

let loadingMovies = false;

async function loadMovies() {
    if (loadingMovies) return;
    loadingMovies = true;

    showSkeletons();
    els.status.hidden = false;
    els.status.textContent = t("Loading movies...");

    try {
        let movies = readCache();

        if (!movies) {
            // Ask the server directly. A plain getDocs() quietly returns an EMPTY list when the
            // phone is offline, which made the site say "No movies" after losing signal.
            const snapshot = await getDocsFromServer(collection(db, "movies"));

            // Keep the document ID so every movie has its own link.
            movies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            writeCache(movies);
        }

        state.movies = movies;
        state.loaded = true;

        if (!state.movies.length) {
            els.list.replaceChildren();
            els.status.textContent = t("No movies available yet. Check back soon.");
            route();
            return;
        }

        els.status.hidden = true;
        fillGenreOptions();
        renderFeatured();
        renderRows();
        renderList();
        route();
    } catch (error) {
        console.error("Error loading movies:", error);
        els.list.replaceChildren();
        els.status.textContent = navigator.onLine
            ? t("Movies could not be loaded. Check your connection and refresh the page.")
            : t("You are offline. The movies will load when you are back online.");
        els.status.hidden = false;
    } finally {
        loadingMovies = false;
    }
}

// Try again by itself when the connection comes back or the person returns to the page.
function retryIfNeeded() {
    if (!state.loaded && !loadingMovies) loadMovies();
}
window.addEventListener("online", retryIfNeeded);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) retryIfNeeded();
});

// When the visitor changes language, redraw the parts that script.js builds.
window.addEventListener("nhm-lang", () => {
    if (state.loaded && state.movies.length) {
        fillGenreOptions();
        els.genre.value = state.genre;
        renderFeatured();
        renderRows();
        renderList();
    }

    if (!els.detailsView.hidden) route();
    else setPageInfo("");
});

route();
loadMovies();
