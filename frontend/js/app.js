const tg = window.Telegram.WebApp;
tg.expand();

const clickSound = new Audio("/assets/sounds/click.mp3");
clickSound.preload = "auto";

function playClickSound() {
    try {
        clickSound.currentTime = 0;
        clickSound.play();
    } catch (err) {
        console.warn("Sound play blocked:", err);
    }
}

function showOverlayAnimation(callback) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<h1>♟</h1>`;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add("fade-out");
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 500);
    }, 3000);
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
        { text: "Load Game", class: "btn-load", action: "load-game" },
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

function formatLastPlayed(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    const optionsTime = { hour: "2-digit", minute: "2-digit" };
    const optionsSameYear = { month: "short", day: "numeric", ...optionsTime };
    const optionsDifferentYear = { year: "numeric", month: "short", day: "numeric" };

    function getWeekNumber(d) {
        const tempDate = new Date(d.getTime());
        tempDate.setHours(0, 0, 0, 0);
        tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
        const yearStart = new Date(tempDate.getFullYear(), 0, 1);
        return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
    }

    const isSameYear = date.getFullYear() === now.getFullYear();
    const isSameWeek = isSameYear && getWeekNumber(date) === getWeekNumber(now);

    if (isSameWeek) {
        return date.toLocaleString("en-US", { weekday: "long", ...optionsTime });
    } else if (isSameYear) {
        return date.toLocaleString("en-US", optionsSameYear);
    } else {
        return date.toLocaleString("en-US", optionsDifferentYear);
    }
}

async function showLoadGameMenu() {
    const resp = await fetch(`/get_active_games/?user_id=${currentUser.id}`);
    const data = await resp.json();

    const app = document.getElementById("app");
    app.innerHTML = `<div class="saved-games-container"></div>`;
    const container = app.querySelector(".saved-games-container");

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="saved-game-card no-game"><span>No saved games found</span></div>`;
    } else {
        data.forEach(game => {
            const card = document.createElement("div");
            card.className = "saved-game-card";
            card.dataset.action = `load-${game.game_id}`;
            card.innerHTML = `
                <div class="game-header">
                    <span class="game-id">Game #${game.game_id}</span>
                    <span class="game-color ${game.player_color.toLowerCase()}">${game.player_color}</span>
                </div>
                <ul class="game-details">
                    <li><span class="label">Difficulty:</span> ${game.difficulty}</li>
                    <li><span class="label">Last Played:</span> ${formatLastPlayed(game.last_played)} (UTC)</li>
                </ul>
            `;
            card.addEventListener("click", () => {
                playClickSound();
                localStorage.setItem("game_id", game.game_id);
                window.location.href = "/chess.html";
            });
            container.appendChild(card);
        });
    }

    const backBtn = document.createElement("button");
    backBtn.className = "btn btn-exit";
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => {
        playClickSound();
        showMainMenu(currentUser);
    });
    app.appendChild(backBtn);
}

function handleAction(action) {
    switch (action) {
        case "new": localStorage.removeItem("game_id"); showGameModeMenu(currentUser); break;
        case "vs-bot": showDifficultyMenu(currentUser); break;
        case "back-main": showMainMenu(currentUser); break;
        case "back-mode": showGameModeMenu(currentUser); break;
        case "back-difficulty": showDifficultyMenu(currentUser); break;
        case "difficulty-easy": showColorMenu(currentUser, "easy"); break;
        case "difficulty-medium": showColorMenu(currentUser, "medium"); break;
        case "difficulty-hard": showColorMenu(currentUser, "hard"); break;
        case "difficulty-impossible": showColorMenu(currentUser, "impossible"); break;
        case "load-game": showLoadGameMenu(); break;
        default:
            if (action.startsWith("color-")) {
                const [, color, difficulty] = action.split("-");
                startGame(currentUser, difficulty, color);
            } else if (action.startsWith("load-")) {
                localStorage.setItem("game_id", action.split("-")[1]);
                window.location.href = "/chess.html";
            }
            tg.sendData(JSON.stringify({ action }));
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

    try {
        const resp = await fetch("/check_user/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
        const result = await resp.json();

        if (!result.allowed) {
            console.error("User check failed:", result.message);
            app.innerHTML = `<h1>❌ ${result.message}</h1>`;
            return;
        }

        console.log(`User verified: ${result.user_id} (${result.message})`);
        showOverlayAnimation(() => showMainMenu(user));

    } catch (err) {
        console.error("Failed to check user:", err);
        app.innerHTML = "<h1>❌ Server error while checking user</h1>";
    }
}

init();
