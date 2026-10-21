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

const TEXT_FIELDS = [
    "title", "genre", "releaseDate", "director", "cast",
    "description", "posterUrl", "watchUrl", "downloadUrl", "trailerUrl"
];
const NUMBER_FIELDS = ["year", "rating", "runtime"];
const URL_FIELDS = ["posterUrl", "watchUrl", "downloadUrl", "trailerUrl"];

let movies = [];
let editingId = null;

// The public site caches the movie list for a few minutes; clear it so
// changes made here show up straight away.
function clearSiteCache() {
    try {
        localStorage.removeItem("nhm-movies-v1");
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

    return data;
}

function fillForm(movie) {
    for (const name of [...TEXT_FIELDS, ...NUMBER_FIELDS]) {
        const value = movie[name];
        $("f-" + name).value = Array.isArray(value)
            ? value.join(", ")
            : value ?? "";
    }
}

function resetForm() {
    movieForm.reset();
    editingId = null;
    formTitle.textContent = "Add a movie";
    saveButton.textContent = "Save movie";
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
            .map(d => ({ id: d.id, ...d.data() }))
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
        sub.textContent = [movie.year, movie.genre].filter(Boolean).join(", ");
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
    formTitle.textContent = "Edit movie";
    saveButton.textContent = "Save changes";
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
