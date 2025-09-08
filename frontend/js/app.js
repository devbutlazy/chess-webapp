const tg = window.Telegram.WebApp;
tg.expand();

function showOverlayAnimation(callback) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<h1>♟</h1>`;
    document.body.appendChild(overlay);

    const start = Date.now();
    const finish = () => {
        overlay.classList.add("fade-out");
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 500);
    };

    const elapsed = Date.now() - start;
    const waitTime = Math.max(0, 3000 - elapsed);
    setTimeout(finish, waitTime);
}

function renderMenu(title, buttons) {
    const app = document.getElementById("app");
    app.innerHTML = `
        <div class="menu-container">
            <h1>${title}</h1>
            ${buttons.map(btn => `
                <button class="btn ${btn.class}" data-action="${btn.action}" ${btn.disabled ? "disabled" : ""}>
                    ${btn.text}
                </button>
            `).join("")}
        </div>
    `;

    app.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });
}

function showMainMenu(user) {
    renderMenu(`♟ ${user.first_name || user.username || "Player"}`, [
        { text: "New Game", class: "btn-new", action: "new" },
        { text: "Leaderboard", class: "btn-leaderboard", action: "leaderboard" },
        { text: "Settings", class: "btn-settings", action: "settings" },
    ]);
}

function showGameModeMenu(user) {
    renderMenu("Choose Mode", [
        { text: "VS Bot", class: "btn-new", action: "vs-bot" },
        { text: "VS User (Coming Soon)", class: "btn-leaderboard", action: "vs-user", disabled: true },
        { text: "Back", class: "btn-exit", action: "back-main" }
    ]);
}

function showDifficultyMenu(user) {
    renderMenu("Choose Difficulty", [
        { text: "Easy", class: "btn-new", action: "difficulty-easy" },
        { text: "Medium", class: "btn-new", action: "difficulty-medium" },
        { text: "Hard", class: "btn-new", action: "difficulty-hard" },
        { text: "Impossible", class: "btn-new", action: "difficulty-impossible" },
        { text: "Back", class: "btn-exit", action: "back-mode" }
    ]);
}

async function startGame(user, difficulty, color) {
    localStorage.setItem("difficulty", difficulty);
    localStorage.setItem("color", color);

    window.location.href = `/chess.html`;
}

let currentUser = null;

function showColorMenu(user, difficulty) {
    renderMenu("Choose Color", [
        { text: "White ♙", class: "btn-new", action: `color-white-${difficulty}` },
        { text: "Black ♟", class: "btn-new", action: `color-black-${difficulty}` },
        { text: "Random 🎲", class: "btn-new", action: `color-random-${difficulty}` },
        { text: "Back", class: "btn-exit", action: `back-difficulty` }
    ]);
}

function handleAction(action) {
    switch (action) {
        case "new":
            showGameModeMenu(currentUser);
            break;
        case "vs-bot":
            showDifficultyMenu(currentUser);
            break;
        case "back-main":
            showMainMenu(currentUser);
            break;
        case "back-mode":
            showGameModeMenu(currentUser);
            break;
        case "back-difficulty":
            showDifficultyMenu(currentUser);
            break;
        case "difficulty-easy":
            showColorMenu(currentUser, "easy");
            break;
        case "difficulty-medium":
            showColorMenu(currentUser, "medium");
            break;
        case "difficulty-hard":
            showColorMenu(currentUser, "hard");
            break;
        case "difficulty-impossible":
            showColorMenu(currentUser, "impossible");
            break;

        // Colors
        default:
            if (action.startsWith("color-")) {
                const [, color, difficulty] = action.split("-");
                startGame(currentUser, difficulty, color);
                break;
            }
            tg.sendData(JSON.stringify({ action }));
    }
}

async function registerUser(user) {
    try {
        await fetch("/register_user/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
    } catch (err) {
        console.error("Registration failed:", err);
    }
}

async function init() {
    const app = document.getElementById("app");
    const user = tg.initDataUnsafe.user;

    if (!user) {
        app.innerHTML = "<h1>❌ Could not get user info</h1>";
        return;
    }

    currentUser = user;

    const resp = await fetch("/check_user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
    });

    const { allowed } = await resp.json();
    if (!allowed) await registerUser(user);

    showOverlayAnimation(() => showMainMenu(user));
}

init();
