import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = id => document.getElementById(id);

const form = $("request-form");
const messageBox = $("request-message");
const sendButton = $("send");

const TYPES = ["request", "report", "other"];
const COOLDOWN_MS = 60 * 1000;
const COOLDOWN_KEY = "nhm-last-request";

function say(text, kind) {
    messageBox.textContent = text;
    messageBox.className = "message" + (kind ? " " + kind : "");
}

// Links like request.html?type=report&title=Movie+Name fill the form for you.
const params = new URLSearchParams(location.search);
if (TYPES.includes(params.get("type"))) $("r-type").value = params.get("type");
if (params.get("title")) $("r-title").value = params.get("title").slice(0, 120);

form.addEventListener("submit", async event => {
    event.preventDefault();

    // Spam trap: pretend it worked, send nothing.
    if ($("r-website").value) {
        form.reset();
        say("Thank you! Your message was sent.", "ok");
        return;
    }

    try {
        const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
        if (Date.now() - last < COOLDOWN_MS) {
            say("Please wait a minute before sending another message.", "error");
            return;
        }
    } catch {
        // Storage blocked: skip the wait check.
    }

    const title = $("r-title").value.trim();
    if (!title) {
        say("Please enter a title.", "error");
        return;
    }

    sendButton.disabled = true;
    say("Sending...", "");

    try {
        await addDoc(collection(db, "requests"), {
            type: TYPES.includes($("r-type").value) ? $("r-type").value : "other",
            title: title.slice(0, 120),
            message: $("r-message").value.trim().slice(0, 500),
            createdAt: serverTimestamp()
        });

        try {
            localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch {
            // Fine to ignore.
        }

        form.reset();
        say("Thank you! Your message was sent.", "ok");
    } catch (error) {
        console.error(error);
        say("Could not send right now. Please try again later or email us.", "error");
    } finally {
        sendButton.disabled = false;
    }
});
