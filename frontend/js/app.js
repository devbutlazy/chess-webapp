const tg = window.Telegram.WebApp;
tg.expand();

const clickSound = new Audio("/assets/sounds/click.mp3");
clickSound.preload = "auto";

const playClickSound = () => {
    try {
        clickSound.currentTime = 0;
        clickSound.play();
    } catch {
        console.warn("Sound play blocked");
    }
};

const showOverlayAnimation = (callback) => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<h1>♟</h1>`;
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.classList.add("fade-out");
        setTimeout(() => {
            overlay.remove();
            callback?.();
        }, 500);
    }, 3000);
};

const renderMenu = (title, buttons) => {
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

    app.querySelectorAll("[data-action]").forEach(btn =>
        btn.addEventListener("click", () => {
            playClickSound();
            handleAction(btn.dataset.action);
        })
    );
};

const showMenu = {
    main: (user) => renderMenu(`♟ ${user.first_name || user.username || "Player"}`, [
        { text: "New Game", class: "btn-new", action: "new" },
        { text: "Load Game", class: "btn-load", action: "load-game" },
        { text: "Leaderboard", class: "btn-leaderboard", action: "leaderboard" },
        { text: "Settings", class: "btn-settings", action: "settings" }
    ]),
    mode: () => renderMenu("Choose Mode", [
        { text: "VS Bot", class: "btn-new", action: "vs-bot" },
        { text: "VS User (Coming Soon)", class: "btn-leaderboard", action: "vs-user", disabled: true },
        { text: "Back", class: "btn-exit", action: "back-main" }
    ]),
    difficulty: () => renderMenu("Choose Difficulty", [
        { text: "Easy", class: "btn-new", action: "difficulty-easy" },
        { text: "Medium", class: "btn-new", action: "difficulty-medium" },
        { text: "Hard", class: "btn-new", action: "difficulty-hard" },
        { text: "Impossible", class: "btn-new", action: "difficulty-impossible" },
        { text: "Back", class: "btn-exit", action: "back-mode" }
    ]),
    color: (difficulty) => renderMenu("Choose Color", [
        { text: "White ♙", class: "btn-new", action: `color-white-${difficulty}` },
        { text: "Black ♟", class: "btn-new", action: `color-black-${difficulty}` },
        { text: "Random 🎲", class: "btn-new", action: `color-random-${difficulty}` },
        { text: "Back", class: "btn-exit", action: "back-difficulty" }
    ])
};

const startGame = (difficulty, color) => {
    localStorage.setItem("difficulty", difficulty);
    localStorage.setItem("color", color);
    localStorage.removeItem("game_id");
    window.location.href = "/chess.html";
};

const formatLastPlayed = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const weekNum = (d) => {
        const temp = new Date(d.getTime());
        temp.setHours(0, 0, 0, 0);
        temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
        const yearStart = new Date(temp.getFullYear(), 0, 1);
        return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
    };

    const sameYear = date.getFullYear() === now.getFullYear();
    const sameWeek = sameYear && weekNum(date) === weekNum(now);

    if (sameWeek) return date.toLocaleString("en-US", { weekday: "long", hour: "2-digit", minute: "2-digit" });
    if (sameYear) return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const showLoadGameMenu = async () => {
    const resp = await fetch(`/get_active_games/?user_id=${currentUser.id}`);
    const data = await resp.json();

    const container = document.getElementById("app");
    container.innerHTML = `<div class="saved-games-container"></div>`;
    const savedContainer = container.querySelector(".saved-games-container");

    if (!data?.length) {
        savedContainer.innerHTML = `<div class="saved-game-card no-game"><span>No saved games found</span></div>`;
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
            savedContainer.appendChild(card);
        });
    }

    const backBtn = document.createElement("button");
    backBtn.className = "btn btn-exit";
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => {
        playClickSound();
        showMenu.main(currentUser);
    });
    container.appendChild(backBtn);
};

const handleAction = (action) => {
    const [type, param, difficulty] = action.split("-");
    if (action.startsWith("color-")) startGame(difficulty, param);
    else if (action.startsWith("load-")) {
        localStorage.setItem("game_id", param);
        window.location.href = "/chess.html";
    } else {
        switch (action) {
            case "new": localStorage.removeItem("game_id"); showMenu.mode(); break;
            case "vs-bot": showMenu.difficulty(); break;
            case "back-main": showMenu.main(currentUser); break;
            case "back-mode": showMenu.mode(); break;
            case "back-difficulty": showMenu.difficulty(); break;
            case "difficulty-easy": case "difficulty-medium": case "difficulty-hard": case "difficulty-impossible":
                showMenu.color(type.split("difficulty-")[1]); break;
            case "load-game": showLoadGameMenu(); break;
        }
    }
    tg.sendData(JSON.stringify({ action }));
};

let currentUser = null;

const init = async () => {
    const app = document.getElementById("app");
    const user = tg.initDataUnsafe.user;
    if (!user) return app.innerHTML = "<h1>❌ Could not get user info</h1>";

    currentUser = user;
    localStorage.setItem("user_id", user.id);

    try {
        const resp = await fetch("/check_user/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
        const result = await resp.json();
        if (!result.allowed) return app.innerHTML = `<h1>❌ ${result.message}</h1>`;

        showOverlayAnimation(() => showMenu.main(user));
    } catch {
        app.innerHTML = "<h1>❌ Server error while checking user</h1>";
    }
};

init();
