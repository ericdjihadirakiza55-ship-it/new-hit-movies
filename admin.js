import { db, auth } from "./firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    doc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const $ = id => document.getElementById(id);

const loginBox = $("login-box");
const panel = $("panel");
const loginForm = $("login-form");
const loginMessage = $("login-message");
const movieForm = $("movie-form");
const formTitle = $("form-title");
const formMessage = $("form-message");
const saveButton = $("save");
const cancelButton = $("cancel");
const adminList = $("admin-list");
const typeSelect = $("f-type");
const seasonsBox = $("seasons-box");
const seasonsList = $("seasons-list");

const TEXT_FIELDS = [
    "title", "genre", "releaseDate", "director", "cast",
    "description", "posterUrl", "watchUrl", "downloadUrl", "trailerUrl",
    "interpreter"
];
const BOOL_FIELDS = ["interpreted", "subtitled", "featured"];
const NUMBER_FIELDS = ["year", "rating", "runtime"];
const URL_FIELDS = ["posterUrl", "watchUrl", "downloadUrl", "trailerUrl"];

let movies = [];
let editingId = null;

// The public site caches the movie list for a few minutes; clear it so
// changes made here show up straight away.
function clearSiteCache() {
    try {
        localStorage.removeItem("nhm-movies-v1");
        localStorage.removeItem("nhm-movies-v2");
    } catch {
        // Ignore: storage may be blocked.
    }
}

/* ---------- Helpers ---------- */

function message(node, text, type) {
    node.textContent = text;
    node.className = "message" + (type ? " " + type : "");
}

function isHttps(value) {
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}

function updateTypeUI() {
    const series = typeSelect.value === "series";
    seasonsBox.hidden = !series;
    $("runtime-label").textContent = series ? "Episode length (minutes)" : "Runtime (minutes)";
    $("director-label").textContent = series ? "Creator" : "Director";
    const word = series ? "series" : "movie";
    formTitle.textContent = (editingId ? "Edit " : "Add a ") + word;
    saveButton.textContent = editingId ? "Save changes" : "Save " + word;
}

function episodesToText(list) {
    return (list || [])
        .map(e => [e.number, e.title || "", e.watchUrl || "", e.downloadUrl || ""].join(" | "))
        .join("\n");
}

function addSeasonRow(season = {}) {
    const box = document.createElement("div");
    box.className = "season-box";
    box.innerHTML = `
        <h3>Season</h3>
        <div class="row">
            <label class="field"><span>Season number * (0 = specials)</span>
                <input class="s-number" type="number" min="0" step="1"></label>
            <label class="field"><span>Year</span>
                <input class="s-year" type="number" min="1900" max="2100"></label>
        </div>
        <label class="field"><span>Episodes, one per line: number | title | watch link | download link</span>
            <textarea class="s-episodes" placeholder="1 | Episode 1 | https://watch-link | https://download-link"></textarea></label>
        <button class="btn btn-danger s-remove" type="button">Remove season</button>`;

    const set = (cls, value) => {
        box.querySelector(cls).value = value ?? "";
    };
    set(".s-number", season.number ?? seasonsList.children.length + 1);
    set(".s-year", season.year);
    set(".s-episodes", episodesToText(season.episodeList));

    box.querySelector(".s-remove").addEventListener("click", () => box.remove());
    seasonsList.appendChild(box);
}

function readSeasons() {
    const seasons = [];
    const used = new Set();

    for (const box of seasonsList.children) {
        const get = cls => box.querySelector(cls).value.trim();
        const number = Number(get(".s-number"));

        if (get(".s-number") === "" || !Number.isInteger(number) || number < 0) {
            return { error: "Every season needs a season number." };
        }
        if (used.has(number)) return { error: "Season " + number + " is listed twice." };
        used.add(number);

        const season = { number };
        if (get(".s-year")) season.year = Number(get(".s-year"));

        const episodeList = [];
        const usedEpisodes = new Set();

        for (const line of get(".s-episodes").split("\n")) {
            if (!line.trim()) continue;

            const [num, title, watch, download] = line.split("|").map(part => part.trim());
            const n = Number(num);

            if (!num || !Number.isInteger(n) || n < 0) {
                return { error: "Season " + number + ": each line must start with an episode number." };
            }
            if (usedEpisodes.has(n)) {
                return { error: "Season " + number + ": episode " + n + " is listed twice." };
            }
            usedEpisodes.add(n);

            const episode = { number: n };
            if (title) episode.title = title;

            for (const [value, key] of [[watch, "watchUrl"], [download, "downloadUrl"]]) {
                if (!value) continue;
                if (!isHttps(value)) {
                    return { error: "Season " + number + ", episode " + n + ": links must start with https://" };
                }
                episode[key] = value;
            }
            episodeList.push(episode);
        }

        season.episodeList = episodeList;
        seasons.push(season);
    }

    if (!seasons.length) return { error: "Add at least one season." };
    return { seasons: seasons.sort((a, b) => a.number - b.number) };
}

typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "series" && !seasonsList.children.length) addSeasonRow();
    updateTypeUI();
});

$("add-season").addEventListener("click", () => addSeasonRow());

function readForm() {
    const data = {};

    for (const name of TEXT_FIELDS) {
        const value = $("f-" + name).value.trim();
        if (value) data[name] = value;
    }

    for (const name of NUMBER_FIELDS) {
        const raw = $("f-" + name).value;
        if (raw !== "") data[name] = Number(raw);
    }

    // Always saved, so unticking a box really turns it off.
    for (const name of BOOL_FIELDS) {
        data[name] = $("f-" + name).checked;
    }

    if (!data.interpreted) delete data.interpreter;

    return data;
}

function fillForm(movie) {
    typeSelect.value = movie.type === "series" ? "series" : "movie";
    seasonsList.replaceChildren();
    (movie.seasons || []).forEach(season => addSeasonRow(season));
    updateTypeUI();

    // Keep older genres that are not in the dropdown, so saving does not wipe them.
    const genreSelect = $("f-genre");
    if (movie.genre && ![...genreSelect.options].some(o => o.value === movie.genre)) {
        genreSelect.append(new Option(movie.genre, movie.genre));
    }

    for (const name of [...TEXT_FIELDS, ...NUMBER_FIELDS]) {
        const value = movie[name];
        $("f-" + name).value = Array.isArray(value)
            ? value.join(", ")
            : value ?? "";
    }

    for (const name of BOOL_FIELDS) {
        $("f-" + name).checked = movie[name] === true;
    }
}

function resetForm() {
    movieForm.reset();
    seasonsList.replaceChildren();
    editingId = null;
    updateTypeUI();
    cancelButton.hidden = true;
}

/* ---------- Login ---------- */

onAuthStateChanged(auth, user => {
    loginBox.hidden = !!user;
    panel.hidden = !user;

    if (user) loadMovies();
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    message(loginMessage, "Logging in...", "");

    try {
        await signInWithEmailAndPassword(
            auth,
            $("email").value.trim(),
            $("password").value
        );
        loginForm.reset();
        message(loginMessage, "", "");
    } catch (error) {
        console.error(error);
        message(
            loginMessage,
            "Could not log in. Check your email and password.",
            "error"
        );
    }
});

$("logout").addEventListener("click", () => signOut(auth));

/* ---------- List ---------- */

async function loadMovies() {
    adminList.replaceChildren(
        Object.assign(document.createElement("p"), {
            className: "status",
            textContent: "Loading..."
        })
    );

    try {
        const snapshot = await getDocs(collection(db, "movies"));
        movies = snapshot.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        clearSiteCache();
        renderList();
    } catch (error) {
        console.error(error);
        adminList.textContent = "Could not load movies. Refresh and try again.";
    }
}

function renderList() {
    if (!movies.length) {
        adminList.textContent = "No movies yet. Add your first one above.";
        return;
    }

    const rows = movies.map(movie => {
        const row = document.createElement("div");
        row.className = "admin-item";

        const info = document.createElement("div");
        const title = document.createElement("p");
        title.textContent = movie.title || "Untitled movie";
        const sub = document.createElement("p");
        sub.className = "sub";
        const count = (movie.seasons || []).length;
        sub.textContent = [
            movie.type === "series" ? "Series, " + count + (count === 1 ? " season" : " seasons") : "",
            movie.year,
            movie.genre,
            movie.interpreted ? "Interpreted" : "",
            movie.subtitled ? "Subtitles" : "",
            movie.featured ? "In slider" : ""
        ].filter(Boolean).join(", ");
        info.append(title, sub);

        const actions = document.createElement("div");
        actions.className = "form-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "btn btn-secondary";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => startEditing(movie));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-danger";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deleteMovie(movie));

        actions.append(edit, remove);
        row.append(info, actions);
        return row;
    });

    adminList.replaceChildren(...rows);
}

/* ---------- Add, edit, delete ---------- */

function startEditing(movie) {
    editingId = movie.id;
    fillForm(movie);
    cancelButton.hidden = false;
    message(formMessage, "", "");
    movieForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

cancelButton.addEventListener("click", () => {
    resetForm();
    message(formMessage, "", "");
});

movieForm.addEventListener("submit", async event => {
    event.preventDefault();

    const data = readForm();

    if (typeSelect.value === "series") {
        const result = readSeasons();
        if (result.error) {
            message(formMessage, result.error, "error");
            return;
        }
        data.type = "series";
        data.seasons = result.seasons;
    } else {
        data.type = "movie";
    }

    for (const name of URL_FIELDS) {
        if (data[name] && !isHttps(data[name])) {
            message(formMessage, "The " + name + " must start with https://", "error");
            return;
        }
    }

    saveButton.disabled = true;
    message(formMessage, "Saving...", "");

    try {
        if (editingId) {
            await setDoc(doc(db, "movies", editingId), data);
            message(formMessage, "Changes saved.", "ok");
        } else {
            await addDoc(collection(db, "movies"), data);
            message(formMessage, "Movie added.", "ok");
        }

        resetForm();
        await loadMovies();
    } catch (error) {
        console.error(error);
        message(
            formMessage,
            error.code === "permission-denied"
                ? "This account is not allowed to change movies."
                : "Could not save. Check your connection and try again.",
            "error"
        );
    } finally {
        saveButton.disabled = false;
    }
});

async function deleteMovie(movie) {
    const ok = confirm(
        'Delete "' + (movie.title || "this movie") + '"? This cannot be undone.'
    );
    if (!ok) return;

    try {
        await deleteDoc(doc(db, "movies", movie.id));
        if (editingId === movie.id) resetForm();
        message(formMessage, "Movie deleted.", "ok");
        await loadMovies();
    } catch (error) {
        console.error(error);
        message(
            formMessage,
            error.code === "permission-denied"
                ? "This account is not allowed to change movies."
                : "Could not delete. Try again.",
            "error"
        );
    }
}
