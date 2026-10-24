/*
 * New Hit Movies: language support (English and Kinyarwanda).
 *
 * English is the text written in the pages. Kinyarwanda is looked up in the
 * RW list below: the English text on the left, the Kinyarwanda on the right.
 * To fix a translation, change the text on the right. To translate a new
 * sentence, add a new line.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "nhm-lang";

    var RW = {
 "Skip to content": "Simbukira ku bikubiyemo",
 "New Hit Movies, home": "New Hit Movies, ahabanza",
 "Language": "Ururimi",
 "Main": "Ibanze",
 "Home": "Ahabanza",
 "Movies": "Filime",
 "Interpreted": "Zasobanuwe",
 "About": "Ibyerekeye",
 "Request": "Saba",
 "Join our WhatsApp Channel": "Injira muri WhatsApp Channel yacu",
 "Be the first to see new movies the moment they are added.": "Ba uwa mbere mu kubona filime nshya zikimara kongerwaho.",
 "REQUEST A MOVIE": "SABA FILIME",
 "Can’t find your movie or series? Tell us and we will add it!": "Niba utabona filime cyangwa series ushaka, tubwire tuyongere!",
 "Request now →": "Saba nonaha →",
 "Follow us": "Dukurikire",
 "Search movies": "Shakisha filime",
 "Search movies and series": "Shakisha filime na series",
 "Filter by type": "Hitamo ubwoko",
 "Movies and series": "Filime na series",
 "Movies only": "Filime gusa",
 "Series only": "Series gusa",
 "Filter by version": "Hitamo verisiyo",
 "All versions": "Verisiyo zose",
 "With subtitles": "Zifite subtitles",
 "Filter by genre": "Hitamo icyiciro",
 "All genres": "Ibyiciro byose",
 "Sort movies": "Tondeka filime",
 "Newest first": "Izigezweho mbere",
 "Oldest first": "Izishaje mbere",
 "Top rated": "Izikunzwe cyane",
 "A to Z": "Kuva kuri A kugeza kuri Z",
 "No movies match your search. Try a different title or genre.": "Nta filime ihuye n'ibyo washatse. Gerageza irindi zina cyangwa ikindi cyiciro.",
 "Load more": "Reba izindi",
 "New Hit Movies helps you discover new films and series, watch trailers and find where to watch them.": "New Hit Movies igufasha kumenya filime na series nshya, kureba trailer no kubona aho wazirebera.",
 "Legal": "Amategeko",
 "Privacy Policy": "Politiki y'ubuzima bwite",
 "Terms": "Amabwiriza",
 "Request a Movie": "Saba Filime",
 "Contact": "Twandikire",
 "© 2026 New Hit Movies. All movie titles and images belong to their owners.": "© 2026 New Hit Movies. Amazina yose ya filime n'amashusho ni ay'ba nyirayo.",
 "Join our WhatsApp channel": "Injira muri WhatsApp channel yacu",
 "Browse new and popular movies, watch trailers and find where to watch.": "Reba filime nshya kandi zikunzwe, ukine trailer ubone aho wazirebera.",
 "<span>Request</span> a movie or report a problem": "<span>Saba</span> filime cyangwa utange raporo y'ikibazo",
 "Want a movie or series added, or found a broken link? Tell us here.": "Ushaka ko twongera filime cyangwa series, cyangwa wabonye link idakora? Tubwirire hano.",
 "What is this about?": "Ni iby'iki?",
 "Request a movie or series": "Saba filime cyangwa series",
 "Report a broken link or problem": "Menyesha link idakora cyangwa ikibazo",
 "Something else": "Ikindi kintu",
 "Movie or series title *": "Izina rya filime cyangwa series *",
 "Details (optional)": "Andi makuru (si ngombwa)",
 "For example: the year, or what is not working.": "Urugero: umwaka, cyangwa ikitagenda neza.",
 "Please do not include personal information.": "Nyamuneka ntushyiremo amakuru bwite.",
 "Send my request": "Ohereza ubusabe bwanjye",
 "Request a Movie or Report a Problem | New Hit Movies": "Saba Filime cyangwa Utange Raporo y'Ikibazo | New Hit Movies",
 "Ask us to add a movie or series, or report a broken link.": "Dusabe kongera filime cyangwa series, cyangwa utumenyeshe link idakora.",
 "Last updated: October 19, 2026": "Byavuguruwe: 19 Ukwakira 2026",
 "We would love to hear from you.": "Twakwishimira kukumva.",
 "Email": "Imeri",
 "What to contact us about": "Impamvu zo kutwandikira",
 "<strong>Suggestions or bugs:</strong> tell us what to fix, or use our <a href=\"request.html\">request page</a> to ask for a movie or report a broken link.": "<strong>Ibitekerezo cyangwa amakosa:</strong> utubwire icyo dukosora, cyangwa ukoreshe <a href=\"request.html\">urupapuro rw'ubusabe</a> usabe filime cyangwa umenyeshe link idakora.",
 "<strong>Copyright or removal requests:</strong> please follow the steps on our <a href=\"dmca.html\">DMCA page</a>.": "<strong>Ubusabe bwerekeye copyright cyangwa gukuraho ibikubiyemo:</strong> nyamuneka kurikiza intambwe ziri ku <a href=\"dmca.html\">rupapuro rwa DMCA</a>.",
 "<strong>Privacy questions:</strong> see our <a href=\"privacy.html\">Privacy Policy</a>, then write to us if you need more.": "<strong>Ibibazo ku buzima bwite:</strong> reba <a href=\"privacy.html\">Politiki y'ubuzima bwite</a>, hanyuma utwandikire niba ukeneye andi makuru.",
 "We try to reply within a few days.": "Tugerageza gusubiza mu minsi mike.",
 "Contact | New Hit Movies": "Twandikire | New Hit Movies",
 "Get in touch with New Hit Movies.": "Vugana na New Hit Movies.",
 "DMCA and Copyright": "DMCA na Copyright",
 "We respect the rights of copyright owners and respond to valid notices of infringement. New Hit Movies does not host movie files. The site shows information and links to other websites.": "Twubaha uburenganzira bw'abafite copyright kandi dusubiza ibirego byemewe by'ihonyorwa ryabwo. New Hit Movies ntibika dosiye za filime. Urubuga rwerekana amakuru kandi rugashyiraho link zerekeza ku zindi mbuga.",
 "Reporting infringement": "Gutanga ikirego cy'ihonyorwa",
 "If you believe material on this site infringes your copyright, send a written notice to <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a> that includes:": "Niba wemera ko ibikubiye kuri uru rubuga bihonyora copyright yawe, ohereza ikirego cyanditse kuri <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a> kirimo:",
 "Your name, address, phone number and email.": "Amazina yawe, aderesi, nomero ya telefoni na imeri.",
 "A description of the copyrighted work you claim is infringed.": "Ibisobanuro by'igihangano gifite copyright uvuga ko cyahonyowe.",
 "The exact web address (URL) of the page or link you want removed.": "Aderesi nyayo (URL) y'urupapuro cyangwa link ushaka ko ikurwaho.",
 "A statement that you have a good faith belief the use is not authorized by the copyright owner, its agent or the law.": "Itangazo rivuga ko wemera ku mutima mwiza ko ikoreshwa ritemewe na nyiri copyright, uhagarariye cyangwa itegeko.",
 "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act for the owner.": "Itangazo, wiyemeje ko ushobora guhanwa niba ari ibinyoma, rivuga ko amakuru ari mu kirego cyawe ari ukuri kandi ko uri nyiri copyright cyangwa wahawe ububasha bwo guhagararira nyirayo.",
 "Your physical or electronic signature.": "Umukono wawe, wandikishijwe intoki cyangwa wa elegitoronike.",
 "What happens next": "Icyakurikira",
 "When we receive a complete notice, we will review it and, where appropriate, remove or disable access to the material promptly. We may pass a copy of the notice to the person who added the material.": "Iyo twakiriye ikirego cyuzuye, turagisuzuma kandi aho bikwiye, dukuraho ibikubiyemo cyangwa tukabuza kubigeraho vuba. Dushobora guha kopi y'ikirego uwashyizeho ibyo bikubiyemo.",
 "Counter-notice": "Ikirego kigaruka (counter-notice)",
 "If you believe material was removed by mistake, you can send a counter-notice to the same email address with your contact details, a description of the removed material and where it appeared, a statement under penalty of perjury that you believe it was removed by mistake, and your signature.": "Niba wemera ko ibikubiyemo byakuweho kubera ikosa, ushobora kohereza counter-notice kuri iyo imeri, ugaragaza amakuru yawe, ibisobanuro by'ibyakuweho n'aho byari biri, itangazo wiyemeje ko ushobora guhanwa niba ari ibinyoma rivuga ko wemera ko byakuweho kubera ikosa, n'umukono wawe.",
 "Repeat infringers": "Abahonyora inshuro nyinshi",
 "We may remove content and links added by anyone who repeatedly infringes copyright.": "Dushobora gukuraho ibikubiyemo na link byashyizweho n'umuntu uhonyora copyright kenshi.",
 "Please do not send false or abusive notices. Misrepresenting infringement can carry legal consequences.": "Nyamuneka ntugatange ibirego by'ibinyoma cyangwa bibabaza. Kubeshya ko habayeho ihonyorwa bishobora gutera ingaruka ku rwego rw'amategeko.",
 "DMCA and Copyright | New Hit Movies": "DMCA na Copyright | New Hit Movies",
 "How to report copyright infringement on New Hit Movies.": "Uko watanga ikirego cy'ihonyorwa rya copyright kuri New Hit Movies.",
 "New Hit Movies (\"we\", \"us\") is a movie discovery website. This page explains what information is handled when you use it.": "New Hit Movies (\"twe\", \"natwe\") ni urubuga rufasha kuvumbura filime. Uru rupapuro rusobanura amakuru atunganywa iyo ukoresha uru rubuga.",
 "What we collect": "Ibyo dukusanya",
 "You do not need an account to use the site, and we do not ask you for your name, email or any other personal details when you browse. We do not run ads or analytics tracking at this time.": "Ntukeneye konti kugira ngo ukoreshe urubuga, kandi ntitukubaza amazina yawe, imeri cyangwa andi makuru bwite iyo urushakishamo. Muri iki gihe ntidukoresha amatangazo cyangwa ibikoresho bikurikirana imikoreshereze (analytics).",
 "Requests and reports": "Ubusabe na raporo",
 "If you use the <a href=\"request.html\">request page</a>, the title and message you type are saved in our database so we can read them. Please do not include personal information. We use these messages only to add titles and fix problems.": "Niba ukoresha <a href=\"request.html\">urupapuro rw'ubusabe</a>, izina n'ubutumwa wandika bibikwa muri database yacu kugira ngo tubisome. Nyamuneka ntushyiremo amakuru bwite. Ubwo butumwa tubukoresha gusa mu kongera filime no gukosora ibibazo.",
 "Services we use": "Serivisi dukoresha",
 "<strong>Google Firebase</strong> stores and delivers the movie information shown on the site. When your browser loads the movie list, Google may receive technical data such as your IP address and browser type. See <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Google's Privacy Policy</a>.": "<strong>Google Firebase</strong> ibika kandi igatanga amakuru ya filime agaragara ku rubuga. Iyo browser yawe ikuye urutonde rwa filime, Google ishobora kwakira amakuru ya tekiniki nka IP address yawe n'ubwoko bwa browser. Reba <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Politiki y'ubuzima bwite ya Google</a>.",
 "<strong>YouTube</strong> trailers are embedded using YouTube's privacy-enhanced mode (youtube-nocookie.com). YouTube may collect information if you play a trailer. See <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Google's Privacy Policy</a>.": "<strong>YouTube</strong> trailers zishyirwaho hakoreshejwe uburyo bwa YouTube burinda ubuzima bwite (youtube-nocookie.com). YouTube ishobora gukusanya amakuru iyo ukinnye trailer. Reba <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener noreferrer\">Politiki y'ubuzima bwite ya Google</a>.",
 "<strong>Our web host</strong> may keep standard server logs (such as IP address, date and page requested) for security and reliability.": "<strong>Aho urubuga rubikwa (web host)</strong> hashobora kubika inyandiko zisanzwe za seriveri (nka IP address, itariki n'urupapuro rwasabwe) mu rwego rw'umutekano no gukora neza.",
 "Data stored in your browser": "Amakuru abikwa muri browser yawe",
 "To make the site faster, your browser saves a temporary copy of the movie list (local storage) for a few minutes. The request page also saves the time of your last message in your browser so it can limit how often messages are sent. Neither contains personal information, and you can clear them at any time in your browser settings.": "Kugira ngo urubuga rwihute, browser yawe ibika kopi y'agateganyo y'urutonde rwa filime (local storage) iminota mike. Urupapuro rw'ubusabe kandi rubika mu browser yawe igihe wohereje ubutumwa bwa nyuma, kugira ngo rugabanye uko ubutumwa bwoherezwa. Nta na kimwe kirimo amakuru bwite, kandi ushobora kubisiba igihe icyo ari cyo cyose mu igenamiterere rya browser yawe.",
 "External links": "Link zerekeza ahandi",
 "Movie pages may link to other websites, such as where a movie can be watched. We do not control those sites and are not responsible for their content or privacy practices.": "Impapuro za filime zishobora kuba zifite link zerekeza ku zindi mbuga, nk'aho filime ishobora kurebwa. Ntitugenzura izo mbuga kandi ntitubazwa ibikubiyemo cyangwa uko zifata ubuzima bwite.",
 "Children": "Abana",
 "The site is not directed at children under 13, and we do not knowingly collect information from them.": "Urubuga ntirugenewe abana bari munsi y'imyaka 13, kandi ntidukusanya ku bushake amakuru yabo.",
 "Changes": "Impinduka",
 "If we add features such as ads or analytics, we will update this page first.": "Nitwongera ibintu nk'amatangazo cyangwa analytics, tuzabanza kuvugurura uru rupapuro.",
 "Questions about this policy? Email <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a> or visit the <a href=\"contact.html\">Contact page</a>.": "Ufite ibibazo kuri iyi politiki? Twandikire kuri <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a> cyangwa usure <a href=\"contact.html\">urupapuro rwa Twandikire</a>.",
 "Privacy Policy | New Hit Movies": "Politiki y'ubuzima bwite | New Hit Movies",
 "Learn what information New Hit Movies collects and how it is used.": "Menya amakuru New Hit Movies ikusanya n'uko akoreshwa.",
 "Terms of Use": "Amabwiriza yo Gukoresha",
 "By using New Hit Movies you agree to these terms. If you do not agree, please do not use the site.": "Ukoresheje New Hit Movies uba wemeye aya mabwiriza. Niba utayemera, nyamuneka ntugakoreshe urubuga.",
 "What the site does": "Icyo urubuga rukora",
 "New Hit Movies lists movie information, trailers and links to other websites where a movie may be available. It is provided for general information and entertainment.": "New Hit Movies yerekana amakuru ya filime, trailers na link zerekeza ku zindi mbuga aho filime ishobora kuboneka. Itangwa mu rwego rw'amakuru rusange n'imyidagaduro.",
 "Third-party links and content": "Link n'ibikubiyemo by'abandi",
 "Links to other websites are provided for convenience. We do not own or control those sites, and we do not guarantee that their content is accurate, available or legal in your country. You use them at your own risk and should follow their terms.": "Link zerekeza ku zindi mbuga zitangwa ngo bikorohereze. Ntidufite izo mbuga cyangwa ngo tuzigenzure, kandi ntidushobora kwemeza ko ibikubiyemo ari ukuri, bibonekamo cyangwa byemewe n'amategeko mu gihugu cyawe. Uzikoresha ku bushake bwawe kandi ugomba kubahiriza amabwiriza yazo.",
 "Ownership": "Nyirabyo",
 "All movie titles, posters, trailers and related images belong to their respective owners and are used for identification and information purposes. If you own content shown here and want it removed, see our <a href=\"dmca.html\">DMCA page</a>.": "Amazina yose ya filime, posters, trailers n'amashusho abifitanye isano ni ay'ba nyirayo, kandi akoreshwa mu kumenyekanisha no gutanga amakuru. Niba ufite ibikubiyemo bigaragara hano ukaba ushaka ko bikurwaho, reba <a href=\"dmca.html\">urupapuro rwa DMCA</a>.",
 "Acceptable use": "Imikoreshereze yemewe",
 "Do not try to break, overload or gain unauthorized access to the site or its systems.": "Ntugerageze kwangiza, kurenza ubushobozi cyangwa kwinjira mu buryo butemewe ku rubuga cyangwa muri sisitemu zarwo.",
 "Do not copy the site in bulk with automated tools without permission.": "Ntugakopire urubuga rwose ukoresheje ibikoresho byikora nta ruhushya.",
 "Do not use the site for anything unlawful.": "Ntugakoreshe urubuga mu bintu binyuranyije n'amategeko.",
 "No warranty": "Nta ngwate",
 "The site is provided \"as is\" without promises that it will always be available, accurate or error free. To the fullest extent allowed by law, we are not liable for any loss arising from your use of the site or of any linked website.": "Urubuga rutangwa \"uko ruri\" nta kwizeza ko ruzahora rubonekamo, ari ukuri cyangwa nta makosa rufite. Uko amategeko abyemera kose, ntitubazwa igihombo cyose cyaturuka ku ikoreshwa ry'urubuga cyangwa urundi rubuga rwerekejweho.",
 "We may update these terms from time to time. Continued use of the site means you accept the updated terms.": "Dushobora kuvugurura aya mabwiriza rimwe na rimwe. Gukomeza gukoresha urubuga bisobanura ko wemeye amabwiriza avuguruye.",
 "Questions? Email <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a>.": "Ufite ibibazo? Twandikire kuri <a href=\"mailto:newhitmovies56@gmail.com\">newhitmovies56@gmail.com</a>.",
 "Terms of Use | New Hit Movies": "Amabwiriza yo Gukoresha | New Hit Movies",
 "The terms for using the New Hit Movies website.": "Amabwiriza yo gukoresha urubuga rwa New Hit Movies.",
 "Page not found": "Urupapuro ntirubonetse",
 "The page you are looking for does not exist or has moved.": "Urupapuro ushaka ntirubaho cyangwa rwimuwe.",
 "Browse all movies": "Reba filime zose",
 "Page not found | New Hit Movies": "Urupapuro ntirubonetse | New Hit Movies",
 "Watch Movie": "Reba Filime",
 "Watch Series": "Reba Series",
 "Download Movie": "Kuramo Filime",
 "Download Series": "Kuramo Series",
 "Watch": "Reba",
 "Download": "Kuramo",
 "View Details": "Reba Amakuru",
 "View details": "Reba amakuru",
 "Movie": "Filime",
 "Untitled movie": "Filime itagira izina",
 "{title} poster": "Ishusho ya {title}",
 "{title}, view details": "{title}, reba amakuru",
 "{n} season": "Season {n}",
 "{n} seasons": "Season {n}",
 "Interpreted|one": "Yasobanuwe",
 "Newest": "Izigezweho",
 "Interpreted movies": "Filime zasobanuwe",
 "Movies with subtitles": "Filime zifite subtitles",
 "Now showing": "Ibigezweho ubu",
 "Featured titles": "Filime zigaragajwe",
 "Previous slide": "Ishusho ibanza",
 "Next slide": "Ishusho ikurikira",
 "Pause slideshow": "Hagarika",
 "Play slideshow": "Komeza",
 "Show slide {n}: {title}": "Erekana ishusho ya {n}: {title}",
 "{i} of {n}": "{i} kuri {n}",
 "More {genre} titles": "Izindi filime za {genre}",
 "Specials": "Ibidasanzwe",
 "Season {n}": "Season {n}",
 "Episode {n}": "Igice cya {n}",
 "No episodes added yet.": "Nta bice biraba byongerwaho.",
 "Seasons": "Season",
 "{n} episode": "Igice {n}",
 "{n} episodes": "Ibice {n}",
 "Episode length": "Igihe cy'igice",
 "Runtime": "Igihe kimara",
 "{n} min": "iminota {n}",
 "Creator": "Uwayihimbye",
 "Director": "Umuyobozi wa filime",
 "Cast": "Abakinnyi",
 "Released": "Yasohotse",
 "By {name}": "Na {name}",
 "Yes": "Yego",
 "Available": "Birahari",
 "Trailer": "Trailer",
 "{title} trailer": "Trailer ya {title}",
 "← All titles": "← Filime zose",
 "No description available.": "Nta bisobanuro bihari.",
 "Title not found": "Ntibonetse",
 "This title may have been removed or the link is wrong.": "Iyi filime ishobora kuba yarakuweho cyangwa link si yo.",
 "{n} series": "Series {n}",
 "{n} movie": "Filime {n}",
 "{n} movies": "Filime {n}",
 "{n} title": "Filime {n}",
 "{n} titles": "Filime {n}",
 "Loading movies...": "Filime ziraje...",
 "No movies available yet. Check back soon.": "Nta filime ziraboneka. Ongera ugaruke vuba.",
 "Movies could not be loaded. Check your connection and refresh the page.": "Filime ntizashoboye kuboneka. Reba interineti yawe maze uvugurure urupapuro.",
 "Thank you! Your message was sent.": "Murakoze! Ubutumwa bwawe bwoherejwe.",
 "Please wait a minute before sending another message.": "Tegereza umunota umwe mbere yo kohereza ubundi butumwa.",
 "Please enter a title.": "Nyamuneka andika izina.",
 "Sending...": "Biraboherezwa...",
 "Could not send right now{code}. Please try again later or email us.": "Ntibyashobotse kohereza ubu{code}. Ongera ugerageze nyuma cyangwa utwandikire kuri imeri."
};

    function saved() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            return v === "en" || v === "rw" ? v : null;
        } catch (e) {
            return null;
        }
    }

    function detect() {
        var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
        for (var i = 0; i < list.length; i++) {
            if (/^rw\b/i.test(list[i])) return "rw";
        }
        return "en";
    }

    var lang = saved() || detect();
    var records = [];
    var has = Object.prototype.hasOwnProperty;

    function norm(s) {
        return s.replace(/\s+/g, " ").trim();
    }

    function fill(text, vars) {
        if (!vars) return text;
        return text.replace(/\{(\w+)\}/g, function (m, k) {
            return vars[k] !== undefined ? vars[k] : m;
        });
    }

    // t("Some English text", { name: "x" }) gives the text in the chosen language.
    function t(key, vars) {
        var out = lang === "rw" && has.call(RW, key) ? RW[key] : key.replace(/\|\w+$/, "");
        return fill(out, vars);
    }

    /* ---------- Translate the page ---------- */

    var ATTRS = ["placeholder", "aria-label", "title", "alt"];
    var NO_CONTENT = /^(SCRIPT|STYLE|SVG|NOSCRIPT|TEXTAREA|IFRAME)$/i;

    function restore() {
        records.forEach(function (r) {
            if (!r.node.isConnected) return;
            if (r.kind === "html") r.node.innerHTML = r.orig;
            else if (r.kind === "text") r.node.nodeValue = r.orig;
            else r.node.setAttribute(r.name, r.orig);
        });
        records = [];
    }

    function visit(el) {
        if (el.nodeType !== 1 || el.hasAttribute("data-no-i18n")) return;

        for (var i = 0; i < ATTRS.length; i++) {
            var value = el.getAttribute(ATTRS[i]);
            if (value && has.call(RW, norm(value))) {
                records.push({ kind: "attr", node: el, name: ATTRS[i], orig: value });
                el.setAttribute(ATTRS[i], RW[norm(value)]);
            }
        }

        if (NO_CONTENT.test(el.tagName) || !el.firstChild) return;

        if (el.textContent.length < 2500) {
            var key = norm(el.innerHTML);
            if (has.call(RW, key)) {
                records.push({ kind: "html", node: el, orig: el.innerHTML });
                el.innerHTML = RW[key];
                return;
            }
        }

        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 1) {
                visit(n);
            } else if (n.nodeType === 3) {
                var text = norm(n.nodeValue);
                if (text && has.call(RW, text)) {
                    var lead = n.nodeValue.match(/^\s*/)[0];
                    var trail = n.nodeValue.match(/\s*$/)[0];
                    records.push({ kind: "text", node: n, orig: n.nodeValue });
                    n.nodeValue = lead + RW[text] + trail;
                }
            }
        }
    }

    function paintButtons() {
        var buttons = document.querySelectorAll("[data-lang]");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-lang") === lang));
        }
    }

    function applyAll() {
        restore();
        document.documentElement.lang = lang;

        if (lang === "rw") {
            visit(document.body);

            var titleEl = document.querySelector("title");
            if (titleEl) visit(titleEl);

            var meta = document.querySelector('meta[name="description"]');
            if (meta && has.call(RW, norm(meta.content))) {
                records.push({ kind: "attr", node: meta, name: "content", orig: meta.content });
                meta.setAttribute("content", RW[norm(meta.content)]);
            }
        }

        paintButtons();
    }

    function setLang(next) {
        if ((next !== "en" && next !== "rw") || next === lang) return;
        lang = next;
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {
            // Storage blocked: the choice lasts until the page is closed.
        }
        applyAll();
        window.dispatchEvent(new CustomEvent("nhm-lang", { detail: next }));
    }

    document.addEventListener("click", function (event) {
        var button = event.target.closest ? event.target.closest("[data-lang]") : null;
        if (button) setLang(button.getAttribute("data-lang"));
    });

    window.I18N = {
        t: t,
        set: setLang,
        get lang() {
            return lang;
        }
    };

    applyAll();
})();
