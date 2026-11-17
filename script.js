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
const PAGE_SIZE = 8;

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

// ---------- Image delivery ----------
// Direct media.newhitmovie.store URLs are used by default to avoid extra transform
// latency on mobile networks. Set IMAGE_RESIZE = true only if you want /cdn-cgi/image/.
const IMAGE_RESIZE = false;
const MEDIA_HOST = "https://media.newhitmovie.store/";

function sized(value, width, quality = 75) {
    const url = safeUrl(value);
    if (!url || !IMAGE_RESIZE || !url.startsWith(MEDIA_HOST)) return url;
    return location.origin + "/cdn-cgi/image/width=" + width + ",quality=" + quality + ",format=auto/" + url;
}

// Small images: if the resized version fails, load the original file once.
function fallbackToOriginal(img, original) {
    const onError = () => {
        img.removeEventListener("error", onError);
        if (original && img.src !== original) img.src = original;
    };
    img.addEventListener("error", onError);
}

// Adds ?dl=1 so Cloudflare forces a download.
function dlUrl(value) {
    const u = safeUrl(value);
    if (!u) return null;
    if (!u.startsWith(MEDIA_HOST)) return u; // only our R2 files use the ?dl=1 rule
    const url = new URL(u);
    url.searchParams.set("dl", "1");
    return url.href;
}

// ---------- Wistia, MEGA and Files.fm (other video hosts) ----------
const WISTIA_ID = /^[A-Za-z0-9]{6,20}$/;                          // keep in sync with admin.js
const MEGA_ID = /^[A-Za-z0-9_-]{6,12}#[A-Za-z0-9_-]{20,64}$/;     // keep in sync with admin.js

function wistiaId(value) {
    const id = String(value || "").trim();
    return WISTIA_ID.test(id) ? id : null;
}

function megaId(value) {
    const id = String(value || "").trim();
    return MEGA_ID.test(id) ? id : null;
}

function filesfmUrl(value) {
    const url = safeUrl(value);
    if (!url || url.length > 600) return null;
    const host = new URL(url).hostname;
    return host === "files.fm" || host.endsWith(".files.fm") ? url : null;
}

function embedSource(item) {
    const wistia = wistiaId(item.wistiaId);
    if (wistia) return "https://fast.wistia.net/embed/iframe/" + encodeURIComponent(wistia) + "?autoPlay=true";

    const mega = megaId(item.megaId);
    if (mega) return "https://mega.nz/embed/" + mega;

    const filesfm = filesfmUrl(item.filesfmUrl);
    if (filesfm) return filesfm;

    return null;
}

function downloadLink(item) {
    const own = dlUrl(item.downloadUrl);
    if (own) return own;

    const mega = megaId(item.megaId);
    return mega ? "https://mega.nz/file/" + mega : null;
}

function externalAttrs(href) {
    return href.startsWith(MEDIA_HOST) ? {} : { target: "_blank", rel: "noopener noreferrer" };
}

let playEmbed = () => {};

function embedButton(src, label) {
    const button = el("button", { class: "btn", type: "button", text: label });
    button.addEventListener("click", () => playEmbed(src, label));
    return button;
}

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

function getParts(movie) {
    return Array.isArray(movie.parts)
        ? [...movie.parts].sort((a, b) => (a.number || 0) - (b.number || 0))
        : [];
}

function createParts(movie) {
    const parts = getParts(movie);
    if (!parts.length) return null;

    const items = parts.map((part, i) => {
        const number = part.number || i + 1;
        const buttons = el("div", { class: "episode-buttons" });

        const partEmbed = embedSource(part);
        const watch = safeUrl(part.watchUrl);
        if (partEmbed) {
            buttons.appendChild(embedButton(partEmbed, t("Part {n}", { n: number })));
        } else if (watch) {
            buttons.appendChild(
                el("a", { class: "btn", href: watch, target: "_blank", rel: "noopener noreferrer", text: t("Watch") })
            );
        }

        const download = downloadLink(part);
        if (download) {
            buttons.appendChild(
                el("a", { class: "btn btn-secondary", href: download, ...externalAttrs(download), text: t("Download") })
            );
        }

        return el(
            "li",
            { class: "episode" },
            el(
                "div",
                { class: "episode-head" },
                el("span", { class: "episode-badge", text: "P" + number }),
                el("h3", { text: part.title || t("Part {n}", { n: number }) })
            ),
            buttons.children.length ? buttons : null
        );
    });

    return el(
        "section",
        { class: "seasons" },
        el("h2", { text: t("Parts") + " · " + parts.length }),
        el("ul", { class: "episode-list" }, ...items)
    );
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
    else if (getParts(movie).length) parts.push(t("{n} parts", { n: getParts(movie).length }));
    return parts.join(" · ");
}

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

function createPoster(movie, priority = false) {
    const width = priority ? 600 : 400;
    const poster = el("div", { class: "poster" });
    const posterUrl = safeUrl(movie.posterUrl);

    if (!posterUrl) {
        poster.textContent = "🎞️";
        return poster;
    }

    const resizedSrc = sized(posterUrl, width);
    const img = el("img", {
        src: resizedSrc,
        alt: t("{title} poster", { title: movie.title || t("Movie") }),
        width: 300,
        height: 450,
        loading: priority ? "eager" : "lazy",
        decoding: "async",
        fetchpriority: priority ? "high" : null
    });

    let retried = false;
    img.addEventListener("error", () => {
        if (!retried && resizedSrc !== posterUrl) {
            retried = true;
            img.src = posterUrl;
            return;
        }
        img.remove();
        poster.textContent = "🎞️";
    });

    poster.appendChild(img);
    return poster;
}

function interpreterLine(movie) {
    if (movie.interpreted !== true || !movie.interpreter) return null;
    const photo = safeUrl(movie.interpreterPhotoUrl);
    if (!photo) return el("p", { class: "interpreter", text: "🎙 " + movie.interpreter });

    return el(
        "p",
        { class: "interpreter interpreter-photo" },
        (() => {
            const avatar = el("img", { src: sized(photo, 60), alt: "", width: 20, height: 20, loading: "lazy", decoding: "async" });
            fallbackToOriginal(avatar, photo);
            return avatar;
        })(),
        movie.interpreter
    );
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

    const badges = getBadges(movie);

    return el(
        "article",
        { class: "movie" },
        badges.length ? el("div", { class: "badges" }, ...badges) : null,
        link
    );
}

function showSkeletons(count = 6) {
    const items = Array.from({ length: count }, () =>
        el("div", { class: "skeleton", "aria-hidden": "true" })
    );
    els.list.replaceChildren(...items);
}

/* ---------- Home: filter, sort, paginate ---------- */

function dateKey(movie) {
    return movie.releaseDate || (movie.year ? String(movie.year) : "");
}

function addedKey(movie) {
    return Number(movie.addedAt) || 0;
}

const SORTERS = {
    newest: (a, b) =>
        addedKey(b) - addedKey(a) || dateKey(b).localeCompare(dateKey(a)),
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

function pickFeatured() {
    const sorted = [...state.movies].sort(SORTERS.newest);
    const chosen = sorted.filter(m => m.featured === true).slice(0, SLIDE_COUNT);

    for (const movie of sorted) {
        if (chosen.length >= SLIDE_COUNT) break;
        if (!chosen.includes(movie) && safeUrl(movie.posterUrl)) chosen.push(movie);
    }
    return chosen;
}

function renderFeatured() {
    const picks = pickFeatured();

    if (!picks.length) {
        els.featured.hidden = true;
        return;
    }

    const total = picks.length;
    let current = 0;

    try {
        const first = sized(picks[0].posterUrl, 520);
        if (first) localStorage.setItem("nhm-hero-poster", first);
    } catch {}

    const hold = { user: false, hover: false, focus: false };
    const bgs = [];
    const cards = [];
    const infos = [];
    const segs = [];

    function go(index) {
        current = (index + total) % total;
        paint();
    }

    picks.forEach((movie, i) => {
        const detailsUrl = "#movie=" + encodeURIComponent(movie.id);
        const posterUrl = safeUrl(movie.posterUrl);

        const bg = el("div", { class: "hero-bg" });
        bgs.push(bg);

        const noPoster = () => el("span", { class: "hero-noposter", text: "🎞️" });
        const heroSrc = sized(posterUrl, 520);
        let face;
        if (posterUrl) {
            face = el("img", {
                src: i === 0 ? heroSrc : null,
                alt: t("{title} poster", { title: movie.title || t("Movie") }),
                width: 300,
                height: 450,
                loading: i === 0 ? "eager" : "lazy",
                decoding: "async",
                fetchpriority: i === 0 ? "high" : null
            });
            if (i !== 0) face.dataset.src = heroSrc;
            face.addEventListener("error", () => {
                if (face.dataset.retry !== "1" && heroSrc !== posterUrl) {
                    face.dataset.retry = "1";
                    face.src = posterUrl;
                } else {
                    face.replaceWith(noPoster());
                }
            });
        } else {
            face = noPoster();
        }

        const card = el(
            "a",
            { class: "hero-card", href: detailsUrl, "aria-label": movie.title || untitled() },
            face
        );
        card.addEventListener("click", event => {
            if (i !== current) {
                event.preventDefault();
                go(i);
            }
        });
        cards.push(card);

        const tags = [];
        if (movie.featured === true) tags.push([t("Featured"), "hero-tag-red"]);
        const genre = genreLabel(movie.genre);
        if (genre) tags.push([genre, "hero-tag-grey"]);
        if (isSeries(movie)) tags.push([t("Series"), "hero-tag-gold"]);
        if (movie.interpreted === true) tags.push([t("Interpreted|one"), "hero-tag-gold"]);
        if (movie.subtitled === true) tags.push([t("Subtitles"), "hero-tag-gold"]);

        const description = movie.description || "";
        const shortText = description.length > 220 ? description.slice(0, 217) + "..." : description;

        const trailerId = getYouTubeId(movie.trailerUrl);
        const actions = el(
            "div",
            { class: "hero-actions" },
            el(
                "a",
                { class: "hero-btn hero-btn-main", href: detailsUrl },
                el("span", { class: "hero-play", "aria-hidden": "true", text: "▶" }),
                t("Watch Now")
            ),
            trailerId
                ? el("a", {
                      class: "hero-btn",
                      href: "https://www.youtube.com/watch?v=" + encodeURIComponent(trailerId),
                      target: "_blank",
                      rel: "noopener noreferrer",
                      text: t("Trailer")
                  })
                : null
        );

        const vj =
            movie.interpreted === true && movie.interpreter
                ? el(
                      "div",
                      { class: "hero-vj" },
                      safeUrl(movie.interpreterPhotoUrl)
                          ? (() => {
                                const avatar = el("img", {
                                    class: "hero-vj-avatar",
                                    src: sized(movie.interpreterPhotoUrl, 100),
                                    alt: "",
                                    width: 34,
                                    height: 34,
                                    loading: "lazy",
                                    decoding: "async"
                                });
                                fallbackToOriginal(avatar, safeUrl(movie.interpreterPhotoUrl));
                                return avatar;
                            })()
                          : el("span", {
                                class: "hero-vj-avatar",
                                "aria-hidden": "true",
                                text: String(movie.interpreter).trim().charAt(0).toUpperCase()
                            }),
                      el("span", { text: movie.interpreter })
                  )
                : null;

        infos.push(
            el(
                "div",
                {
                    class: "hero-info",
                    role: "group",
                    "aria-roledescription": "slide",
                    "aria-label": t("{i} of {n}", { i: i + 1, n: total })
                },
                tags.length
                    ? el(
                          "div",
                          { class: "hero-tags" },
                          ...tags.map(([text, cls]) => el("span", { class: "hero-tag " + cls, text }))
                      )
                    : null,
                el("h2", { text: movie.title || untitled() }),
                el("p", { class: "hero-meta", text: movieMeta(movie) }),
                vj,
                shortText ? el("p", { class: "hero-desc", text: shortText }) : null,
                actions
            )
        );

        if (total > 1) {
            const seg = el(
                "button",
                {
                    class: "hero-seg",
                    type: "button",
                    "aria-label": t("Show slide {n}: {title}", { n: i + 1, title: movie.title || untitled() })
                },
                el("i")
            );
            seg.addEventListener("click", () => go(i));
            segs.push(seg);
        }
    });

    const progress = total > 1 ? el("div", { class: "hero-progress" }, ...segs) : null;

    const stage = el("div", { class: "hero-stage" }, ...cards);
    const hero = el(
        "div",
        {
            class: "hero",
            role: "region",
            "aria-roledescription": "carousel",
            "aria-label": t("Featured titles")
        },
        el("div", { class: "hero-bgs", "aria-hidden": "true" }, ...bgs),
        stage,
        el("div", { class: "hero-infos" }, ...infos),
        progress
    );

    let sidesReady = false;
    function loadImages(i, pos) {
        const face = cards[i].firstElementChild;
        if (face && face.dataset && face.dataset.src && (pos === "0" || (sidesReady && (pos === "1" || pos === "-1")))) {
            face.src = face.dataset.src;
            delete face.dataset.src;
        }
        if (i === current && bgs[i].dataset.src) {
            bgs[i].style.backgroundImage = 'url("' + bgs[i].dataset.src + '")';
            delete bgs[i].dataset.src;
        }
    }

    function paint() {
        picks.forEach((_, i) => {
            let d = i - current;
            if (d > total / 2) d -= total;
            if (d < -total / 2) d += total;
            const pos = d === 0 ? "0" : d === 1 ? "1" : d === -1 ? "-1" : "x";

            cards[i].dataset.pos = pos;
            cards[i].tabIndex = pos === "x" ? -1 : 0;
            loadImages(i, pos);
            bgs[i].classList.toggle("is-active", i === current);
            infos[i].classList.toggle("is-active", i === current);
            infos[i].setAttribute("aria-hidden", i === current ? "false" : "true");

            if (segs[i]) {
                segs[i].classList.toggle("is-active", i === current);
                segs[i].classList.toggle("is-done", i < current);
            }
        });
    }

    if (total > 1) {
        const syncPause = () => {
            hero.classList.toggle("is-paused", hold.user || hold.hover || hold.focus);
        };

        progress.addEventListener("animationend", event => {
            if (event.animationName === "herofill") go(current + 1);
        });

        if (window.matchMedia("(hover: hover)").matches) {
            hero.addEventListener("mouseenter", () => { hold.hover = true; syncPause(); });
            hero.addEventListener("mouseleave", () => { hold.hover = false; syncPause(); });
        }
        hero.addEventListener("focusin", event => {
            if (event.target.matches(":focus-visible")) { hold.focus = true; syncPause(); }
        });
        hero.addEventListener("focusout", () => { hold.focus = false; syncPause(); });

        hero.addEventListener("keydown", event => {
            if (event.key === "ArrowLeft") go(current - 1);
            if (event.key === "ArrowRight") go(current + 1);
        });

        let startX = null;
        let startY = 0;
        stage.addEventListener("touchstart", event => {
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            hold.user = true;
            syncPause();
        }, { passive: true });
        stage.addEventListener("touchend", event => {
            hold.user = false;
            syncPause();
            if (startX === null) return;
            const dx = event.changedTouches[0].clientX - startX;
            const dy = event.changedTouches[0].clientY - startY;
            startX = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                go(current + (dx < 0 ? 1 : -1));
            }
        }, { passive: true });
    }

    paint();
    els.featured.replaceChildren(hero);
    els.featured.hidden = false;

    setTimeout(() => { sidesReady = true; paint(); }, 1000);
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

        const epEmbed = embedSource(ep);
        const watch = safeUrl(ep.watchUrl);
        if (epEmbed) {
            buttons.appendChild(
                embedButton(epEmbed, t("Season {s} · Episode {n}", { s: season.number, n: ep.number }))
            );
        } else if (watch) {
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

        const download = downloadLink(ep);
        if (download) {
            buttons.appendChild(
                el("a", {
                    class: "btn btn-secondary",
                    href: download,
                    ...externalAttrs(download),
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

    const PAGE = 30;
    const list = el("ul", { class: "episode-list" }, ...items.slice(0, PAGE));
    if (items.length <= PAGE) return list;

    let shown = PAGE;
    const more = el("button", { class: "btn btn-secondary episodes-more", type: "button" });
    const label = () => t("Show more episodes") + " (" + (items.length - shown) + ")";
    more.textContent = label();
    more.addEventListener("click", () => {
        const next = items.slice(shown, shown + PAGE);
        list.append(...next);
        shown += next.length;
        if (shown >= items.length) more.remove();
        else more.textContent = label();
    });
    return el("div", {}, list, more);
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

    show(seasons[0], buttons[0]);

    return el("section", { class: "seasons" }, el("h2", { text: t("Seasons") }), tabs, panel);
}

function showMovieDetails(movie) {
    const title = movie.title || untitled();

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

    const stage = el("section", { class: "wistia-stage", hidden: true });
    playEmbed = (src, label) => {
        stage.replaceChildren(
            el("h2", { text: label === watchLabel(movie) ? title : title + " · " + label }),
            el(
                "div",
                { class: "wistia-frame" },
                el("iframe", {
                    src,
                    title: title + " · " + label,
                    allow: "autoplay; fullscreen; picture-in-picture",
                    allowfullscreen: true,
                    referrerpolicy: "strict-origin-when-cross-origin"
                })
            )
        );
        stage.hidden = false;
        stage.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const actions = el("div", { class: "details-actions" });

    const movieEmbed = embedSource(movie);
    const watchUrl = safeUrl(movie.watchUrl);
    if (movieEmbed) {
        actions.appendChild(embedButton(movieEmbed, watchLabel(movie)));
    } else if (watchUrl) {
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

    const downloadUrl = downloadLink(movie);
    if (downloadUrl) {
        actions.appendChild(
            el("a", {
                class: "btn btn-secondary",
                href: downloadUrl,
                ...externalAttrs(downloadUrl),
                text: downloadLabel(movie)
            })
        );
    }

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

    const sections = [
        el("a", { class: "back-link", href: "#", text: t("← All titles") }),
        el(
            "div",
            { class: "details-content" },
            createPoster(movie, true),
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
        stage,
        createSeasons(movie),
        createParts(movie),
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

window.addEventListener(
    "scroll",
    () => {
        if (!els.homeView.hidden) savedScroll = window.scrollY;
    },
    { passive: true }
);

/* ---------- Events ---------- */

const siteHeader = document.querySelector(".site-header");
const searchToggle = $("search-toggle");
const searchPanel = $("search-panel");
const searchClear = $("search-clear");
const searchSuggest = $("search-suggest");
const SUGGEST_COUNT = 5;

function hideSuggest() {
    searchSuggest.hidden = true;
    searchSuggest.replaceChildren();
}

function openSearch() {
    searchPanel.hidden = false;
    siteHeader.classList.add("searching");
    searchToggle.setAttribute("aria-expanded", "true");
    searchToggle.setAttribute("aria-label", t("Close search"));
    els.search.focus();
}

function resetSearchResults() {
    els.search.value = "";
    state.query = "";
    state.shown = PAGE_SIZE;
    renderList();
}

function closeSearch() {
    searchPanel.hidden = true;
    siteHeader.classList.remove("searching");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", t("Search"));
    hideSuggest();
    if (els.search.value) resetSearchResults();
}

function showSearchResults() {
    hideSuggest();
    state.type = "all";
    state.version = "all";
    state.genre = "all";
    els.type.value = "all";
    els.version.value = "all";
    els.genre.value = "all";
    state.shown = PAGE_SIZE;
    renderList();

    const scroll = () => $("browse").scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.hash.startsWith("#movie=")) {
        location.hash = "#all";
        setTimeout(scroll, 150);
    } else {
        scroll();
    }
}

function showSuggestions() {
    const query = els.search.value.trim().toLowerCase();
    hideSuggest();
    if (!query || !state.loaded) return;

    const matches = state.movies
        .filter(movie => (movie.title || "").toLowerCase().includes(query))
        .sort(SORTERS.newest);

    const items = matches.slice(0, SUGGEST_COUNT).map(movie => {
        const poster = safeUrl(movie.posterUrl);
        const thumb = poster
            ? (() => {
                  const thumbImg = el("img", { src: sized(poster, 120), alt: "", width: 52, height: 78, loading: "lazy", decoding: "async" });
                  fallbackToOriginal(thumbImg, poster);
                  return thumbImg;
              })()
            : el("span", { class: "suggest-noposter", text: "🎞️" });
        const link = el(
            "a",
            { class: "suggest-item", href: "#movie=" + encodeURIComponent(movie.id) },
            thumb,
            el("span", { class: "suggest-title", text: movie.title || untitled() })
        );
        link.addEventListener("click", closeSearch);
        return link;
    });

    if (!items.length) {
        searchSuggest.append(el("p", { class: "suggest-empty", text: t("No movies match your search.") }));
    } else {
        searchSuggest.append(...items);
        const all = el("button", {
            class: "suggest-all",
            type: "button",
            text: t("View all results") + " →"
        });
        all.addEventListener("click", showSearchResults);
        searchSuggest.append(all);
    }
    searchSuggest.hidden = false;
}

searchToggle.addEventListener("click", () => {
    if (searchPanel.hidden) openSearch();
    else closeSearch();
});

searchClear.addEventListener("click", () => {
    resetSearchResults();
    hideSuggest();
    els.search.focus();
});

els.search.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSearch();
    if (event.key === "Enter") {
        event.preventDefault();
        if (els.search.value.trim()) showSearchResults();
    }
});

let searchTimer;
els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.query = els.search.value.trim();
        state.shown = PAGE_SIZE;
        renderList();
        showSuggestions();
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

const CACHE_KEY = "nhm-movies-v3";
const CACHE_MINUTES = 5;

function readCacheEntry() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.movies) || !parsed.movies.length) return null;

        const time = Number(parsed.time) || 0;
        const fresh = Date.now() - time < CACHE_MINUTES * 60 * 1000;
        return { movies: parsed.movies, fresh };
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

function applyMovies(movies) {
    state.movies = movies;
    state.loaded = true;

    if (!state.movies.length) {
        els.list.replaceChildren();
        els.status.textContent = t("No movies available yet. Check back soon.");
        els.status.hidden = false;
        route();
        return;
    }

    els.status.hidden = true;
    fillGenreOptions();
    renderFeatured();
    renderRows();
    renderList();
    route();
}

let loadingMovies = false;

async function loadMovies() {
    if (loadingMovies) return;
    loadingMovies = true;

    const cached = readCacheEntry();
    const hadCachedMovies = Boolean(cached && cached.movies.length);

    if (hadCachedMovies) {
        applyMovies(cached.movies);
        if (cached.fresh || !navigator.onLine) {
            loadingMovies = false;
            return;
        }
    } else {
        showSkeletons();
        els.status.hidden = false;
        els.status.textContent = t("Loading movies...");
    }

    try {
        const snapshot = await getDocsFromServer(collection(db, "movies"));
        const movies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        if (movies.length) {
            writeCache(movies);
            applyMovies(movies);
        } else if (!hadCachedMovies) {
            applyMovies([]);
        }
    } catch (error) {
        console.error("Error loading movies:", error);
        if (!hadCachedMovies) {
            els.list.replaceChildren();
            els.status.textContent = navigator.onLine
                ? t("Movies could not be loaded. Check your connection and refresh the page.")
                : t("You are offline. The movies will load when you are back online.");
            els.status.hidden = false;
        }
    } finally {
        loadingMovies = false;
    }
}

function retryIfNeeded() {
    if (!state.loaded && !loadingMovies) loadMovies();
}
window.addEventListener("online", retryIfNeeded);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) retryIfNeeded();
});

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
