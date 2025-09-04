const tg = window.Telegram.WebApp;
tg.expand();

async function showLoggedInUI(user) {
    const app = document.getElementById("app");
    const template = document.getElementById("logged-template");
    app.innerHTML = template.innerHTML;

    const statusText = app.querySelector("#status-text");
    statusText.innerHTML = `♟ ${user.first_name || user.username || "Player"}`;
    statusText.classList.add("status-green");

    app.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
            tg.sendData(JSON.stringify({ action: btn.dataset.action }));
        });
    });
}

async function registerUser(user) {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<h1>♟</h1>`;
    document.body.appendChild(overlay);

    const start = Date.now();
    try {
        await fetch("/register_user/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });

        const elapsed = Date.now() - start;
        const waitTime = Math.max(0, 3000 - elapsed);

        setTimeout(() => {
            overlay.classList.add("fade-out");
            setTimeout(() => {
                overlay.remove();
                showLoggedInUI(user);
            }, 500);
        }, waitTime);

    } catch (err) {
        overlay.innerHTML = `<h1>⚠️</h1>`;
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

    const resp = await fetch("/check_user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
    });

    const { allowed } = await resp.json();
    if (!allowed) {
        registerUser(user);
        return;
    }

    showLoggedInUI(user);
}

init();
