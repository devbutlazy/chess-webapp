const tg = window.Telegram.WebApp;
tg.expand();

function playClickSound() {
    const audio = new Audio("/assets/sounds/click.mp3");
    audio.currentTime = 0;
    audio.play().catch(err => {
        console.warn("Sound play blocked:", err);
    });
}

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
        btn.addEventListener("click", () => {
            playClickSound();
            handleAction(btn.dataset.action);
        });
    });
}

function showMainMenu(user) {
    renderMenu(`♟ ${user.first_name || user.username || "Player"}`, [
        { text: "New Game", class: "btn-new", action: "new" },
        { text: "Load Game", class: "btn-new", action: "load-game" },
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

function showColorMenu(user, difficulty) {
    renderMenu("Choose Color", [
        { text: "White ♙", class: "btn-new", action: `color-white-${difficulty}` },
        { text: "Black ♟", class: "btn-new", action: `color-black-${difficulty}` },
        { text: "Random 🎲", class: "btn-new", action: `color-random-${difficulty}` },
        { text: "Back", class: "btn-exit", action: `back-difficulty` }
    ]);
}

async function startGame(user, difficulty, color) {
    localStorage.setItem("difficulty", difficulty);
    localStorage.setItem("color", color);

    localStorage.removeItem("game_id");
    window.location.href = `/chess.html`;
}

async function showLoadGameMenu() {
    const resp = await fetch(`/get_active_games/?user_id=${currentUser.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });
    const data = await resp.json();

    if (!data || data.length === 0) {
        renderMenu("Load Game", [
            { text: "No saved games found", class: "btn-disabled", action: "", disabled: true },
            { text: "Back", class: "btn-exit", action: "back-main" }
        ]);
        return;
    }

    renderMenu("Load Game", [
        ...data.map(game => ({
            text: `Game #${game.game_id}; difficulty: ${game.difficulty}; color: ${game.player_color}; last played: ${game.last_played}`,
            class: "btn-load",
            action: `load-${game.game_id}`
        })),
        { text: "Back", class: "btn-exit", action: "back-main" }
    ]);
}

function handleAction(action) {
    switch (action) {
        case "new":
            localStorage.removeItem("game_id");
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
        case "load-game":
            showLoadGameMenu();
            break;
        default:
            if (action.startsWith("color-")) {
                const [, color, difficulty] = action.split("-");
                
                startGame(currentUser, difficulty, color);
                break;
            } else if (action.startsWith("load-")) {
                const gameIdToLoad = action.split("-")[1];

                localStorage.setItem("game_id", gameIdToLoad);
                window.location.href = "/chess.html";
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

let currentUser = null;

async function init() {
    const app = document.getElementById("app");
    const user = tg.initDataUnsafe.user;

    if (!user) {
        app.innerHTML = "<h1>❌ Could not get user info</h1>";
        return;
    }

    currentUser = user;
    localStorage.setItem("user_id", user.id);

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
