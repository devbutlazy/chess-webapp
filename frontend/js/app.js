const tg = window.Telegram.WebApp;
tg.expand();

const clickSound = new Audio("/assets/sounds/click.mp3");
clickSound.preload = "auto";

let currentUser = null;
let selectedDifficulty = null;
let selectedColor = null;
let selectedTime = null;

const playClickSound = () => {
    try { clickSound.currentTime = 0; clickSound.play(); }
    catch (err) { console.warn("Sound play blocked:", err); }
};

const renderMenu = (title, buttons) => {
    const app = document.getElementById("app");
    app.innerHTML = `
        <div class="menu-container">
            <h1>${title}</h1>
            ${buttons.map(b => `<button class="btn ${b.class}" data-action="${b.action}" ${b.disabled ? "disabled" : ""}>${b.text}</button>`).join("")}
        </div>
    `;
    app.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => { playClickSound(); handleAction(btn.dataset.action); }));
};

const formatDifficulty = () => selectedDifficulty ? `Difficulty (${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)})` : "Difficulty";
const formatColor = () => selectedColor ? `Color (${{ white: "White", black: "Black", random: "Random" }[selectedColor]})` : "Color";
const formatTime = () => selectedTime ? `Time (${selectedTime} min)` : "Time";

const showMainMenu = (user) => {
    const name = user.first_name || user.username || "Player";
    const displayName = name.length > 12 ? name.slice(0, 9) + "..." : name;
    renderMenu(`♟ ${displayName}`, [
        { text: "New Game", class: "btn-new", action: "new" },
        { text: "Load Game", class: "btn-load", action: "load-game" },
        { text: "Leaderboard", class: "btn-leaderboard", action: "leaderboard" },
        { text: "Settings", class: "btn-settings", action: "settings" }
    ]);
};

const showModeMenu = () => {
    renderMenu("Choose Mode", [
        { text: "VS Bot", class: "btn-blue", action: "mode-vs-bot" },
        { text: "VS User (Coming Soon)", class: "btn-yellow", action: "mode-vs-user", disabled: true },
        { text: "Back", class: "btn-exit", action: "back-main" }
    ]);
};

const showVsBotMenu = () => {
    renderMenu("VS Bot", [
        { text: formatDifficulty(), class: selectedDifficulty ? "btn-green" : "btn-yellow", action: "choose-difficulty" },
        { text: formatColor(), class: selectedColor ? "btn-green" : "btn-yellow", action: "choose-color" },
        { text: formatTime(), class: selectedTime ? "btn-green" : "btn-yellow", action: "choose-time" },
        { text: "Back", class: "btn-exit", action: "back-mode" },
        { text: "Start Game", class: "btn-blue", action: "start-game", disabled: !(selectedDifficulty && selectedColor && selectedTime) }
    ]);
};

const showDifficultyMenu = () => renderMenu("Choose Difficulty", [
    { text: "Easy", class: selectedDifficulty === "easy" ? "btn-green" : "btn-blue", action: "select-difficulty-easy" },
    { text: "Medium", class: selectedDifficulty === "medium" ? "btn-green" : "btn-blue", action: "select-difficulty-medium" },
    { text: "Hard", class: selectedDifficulty === "hard" ? "btn-green" : "btn-blue", action: "select-difficulty-hard" },
    { text: "Impossible", class: selectedDifficulty === "impossible" ? "btn-green" : "btn-blue", action: "select-difficulty-impossible" },
    { text: "Back", class: "btn-exit", action: "back-vsbot" }
]);

const showColorMenu = () => renderMenu("Choose Color", [
    { text: "White", class: selectedColor === "white" ? "btn-green" : "btn-blue", action: "select-color-white" },
    { text: "Black", class: selectedColor === "black" ? "btn-green" : "btn-blue", action: "select-color-black" },
    { text: "Random", class: selectedColor === "random" ? "btn-green" : "btn-blue", action: "select-color-random" },
    { text: "Back", class: "btn-exit", action: "back-vsbot" }
]);

const showTimeMenu = () => renderMenu("Choose Time", [
    { text: "1 min", class: selectedTime === 1 ? "btn-green" : "btn-blue", action: "select-time-1" },
    { text: "3 min", class: selectedTime === 3 ? "btn-green" : "btn-blue", action: "select-time-3" },
    { text: "5 min", class: selectedTime === 5 ? "btn-green" : "btn-blue", action: "select-time-5" },
    { text: "10 min", class: selectedTime === 10 ? "btn-green" : "btn-blue", action: "select-time-10" },
    { text: "Back", class: "btn-exit", action: "back-vsbot" }
]);

const startGame = () => {
    localStorage.setItem("difficulty", selectedDifficulty);
    localStorage.setItem("color", selectedColor);
    localStorage.setItem("time", selectedTime);
    localStorage.removeItem("game_id");
    window.location.href = "/chess";
};

const formatLastPlayed = ts => new Date(ts).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" });

const showLoadGameMenu = async () => {
    const resp = await fetch(`/get_active_games/?user_id=${currentUser.id}`);
    const data = await resp.json();
    const app = document.getElementById("app");
    app.innerHTML = `<div class="saved-games-container"></div>`;
    const container = app.querySelector(".saved-games-container");
    if (!data?.length) container.innerHTML = `<div class="saved-game-card no-game"><span>No saved games found</span></div>`;
    else data.forEach(g => {
        const card = document.createElement("div");
        card.className = "saved-game-card";
        card.innerHTML = `<div class="game-header"><span class="game-id">Game #${g.game_id}</span><span class="game-color ${g.player_color.toLowerCase()}">${g.player_color}</span></div><ul class="game-details"><li><span class="label">Difficulty:</span> ${g.difficulty}</li><li><span class="label">Last Played:</span> ${formatLastPlayed(g.last_played)} (UTC)</li></ul>`;
        card.addEventListener("click", () => { playClickSound(); localStorage.setItem("game_id", g.game_id); window.location.href = "/chess"; });
        container.appendChild(card);
    });
    const backBtn = document.createElement("button");
    backBtn.className = "btn btn-exit";
    backBtn.textContent = "Back";
    backBtn.addEventListener("click", () => { playClickSound(); showMainMenu(currentUser); });
    app.appendChild(backBtn);
};

const actions = {
    "new": () => { localStorage.removeItem("game_id"); showModeMenu(); },
    "mode-vs-bot": () => showVsBotMenu(),
    "mode-vs-user": () => { },
    "load-game": () => showLoadGameMenu(),
    "back-main": () => showMainMenu(currentUser),
    "back-mode": () => showModeMenu(),
    "back-vsbot": () => showVsBotMenu(),
    "choose-difficulty": () => showDifficultyMenu(),
    "choose-color": () => showColorMenu(),
    "choose-time": () => showTimeMenu(),
    "start-game": () => startGame()
};

const handleAction = a => {
    if (a.startsWith("select-difficulty-")) { selectedDifficulty = a.split("-")[2]; showDifficultyMenu(); return; }
    if (a.startsWith("select-color-")) { selectedColor = a.split("-")[2]; showColorMenu(); return; }
    if (a.startsWith("select-time-")) { selectedTime = parseInt(a.split("-")[2]); showTimeMenu(); return; }
    if (actions[a]) actions[a]();
};

const init = async () => {
    const app = document.getElementById("app");
    const user = tg.initDataUnsafe.user;
    if (!user) { app.innerHTML = "<h1>❌ Could not get user info</h1>"; return; }
    currentUser = user;
    localStorage.setItem("user_id", user.id);
    try {
        const resp = await fetch("/user/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
        const result = await resp.json();
        if (!result.allowed) { app.innerHTML = `<h1>❌ ${result.message}</h1>`; return; }
        showMainMenu(user);
    } catch (err) { app.innerHTML = "<h1>❌ Server error while checking user</h1>"; }
};

init();
