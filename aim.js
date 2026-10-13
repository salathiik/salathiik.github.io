// Аим-тренер в стиле CS: фон-карта, прицел, мишени, эффекты, килфид.
// Всё рисуется на <canvas> в «игровом цикле» — 60 раз в секунду.

const canvas = document.getElementById("aim-canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ===== Состояние =====
// state — что сейчас на экране: "menu" (кнопка Старт), "countdown" (3-2-1),
// "playing" (игра), "results" (итоги)
let state = "menu";
let game = null;
let countdownStart = 0;
const mouse = { x: W / 2, y: H / 2, inside: false };
let effects = [];       // искры, хитмаркеры, следы от пуль, всплывающий текст
let killfeed = [];      // строчки в правом верхнем углу

// Кнопка «СТАРТ» в центре поля: прямоугольник x, y, ширина, высота
const startButton = { x: W / 2 - 120, y: H / 2 + 10, w: 240, h: 60 };

// ===== Фон: кадр с карты из папки posters =====
const backgrounds = {
    dust2: "posters/dust2-flash-long-a.jpg",
    mirage: "posters/mirage-smoke-conector.jpg",
    inferno: "posters/inferno-smoke-ct-spawn.jpg",
    ancient: "posters/ancient-smoke-t-spawn-b.jpg",
    overpass: "posters/overpass-smoke-t-spawn-monster.jpg",
};
let bgImage = null;

function loadBackground() {
    const choice = document.getElementById("aim-map").value;
    if (choice === "none") {
        bgImage = null;
        return;
    }
    bgImage = new Image();
    bgImage.src = backgrounds[choice];
}

function drawBackground() {
    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        // filter — как фильтр в фоторедакторе: размыть и затемнить, чтобы мишени было хорошо видно
        ctx.filter = "blur(2px) brightness(0.55) saturate(0.85)";
        ctx.drawImage(bgImage, -20, -20, W + 40, H + 40);
        ctx.filter = "none";
    } else {
        // Запасной фон: тёмный градиент
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1c2128");
        g.addColorStop(1, "#0d0f12");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    // Виньетка — затемнение по краям, как в игре
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
}

// ===== Звук попадания =====
// Делаем звук сами с помощью Web Audio: короткий «пик», который быстро затихает
let audio = null;
function hitSound(headshot) {
    if (!document.getElementById("aim-sound").checked) {
        return;
    }
    if (audio === null) {
        audio = new AudioContext();
    }
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = headshot ? 1400 : 900;       // хедшот — звук выше
    gain.gain.setValueAtTime(0.15, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.12);
}

// ===== Начало игры =====
function startCountdown() {
    state = "countdown";
    countdownStart = performance.now();
    document.getElementById("aim-result").hidden = true;
    effects = [];
    killfeed = [];
}

function startGame() {
    const mode = document.getElementById("aim-mode").value;
    game = {
        mode: mode,
        radius: Number(document.getElementById("aim-size").value),
        targets: [],
        hits: 0,
        headshots: 0,
        misses: 0,
        reactionTimes: [],
        startTime: performance.now(),
        duration: 30000,
    };
    const count = mode === "reaction" ? 1 : 3;
    for (let i = 0; i < count; i++) {
        game.targets.push(newTarget());
    }
    state = "playing";
}

// Новая мишень в случайном месте (не у самых краёв — там табло и килфид)
function newTarget() {
    const r = game.radius;
    const t = {
        x: r + 40 + Math.random() * (W - 2 * r - 80),
        y: r + 70 + Math.random() * (H - 2 * r - 120),
        r: r,
        born: performance.now(),
        dx: 0,
        dy: 0,
    };
    if (game.mode === "moving") {
        const angle = Math.random() * Math.PI * 2;
        t.dx = Math.cos(angle) * 2.5;
        t.dy = Math.sin(angle) * 2.5;
    }
    return t;
}

// ===== Рисование мишени: объёмный светящийся шар =====
function drawTarget(t, now) {
    // Появление: первые 120 мс мишень «вырастает» из точки
    const grow = Math.min(1, (now - t.born) / 120);
    const r = Math.max(0, t.r * grow);
    if (r <= 0) return;

    // Свечение вокруг
    ctx.shadowColor = "rgba(255, 80, 40, 0.8)";
    ctx.shadowBlur = 18;

    // Шар: радиальный градиент — светлое пятно сверху слева, тёмный край
    const g = ctx.createRadialGradient(t.x - r * 0.35, t.y - r * 0.35, r * 0.1, t.x, t.y, r);
    g.addColorStop(0, "#ffb199");
    g.addColorStop(0.45, "#ff4b2b");
    g.addColorStop(1, "#8b1208");
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Белое кольцо вокруг «зоны хедшота» в центре
    ctx.beginPath();
    ctx.arc(t.x, t.y, r * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// ===== Эффекты =====
function addHitEffects(x, y, headshot) {
    const now = performance.now();
    // Хитмаркер «✕»
    effects.push({ type: "hitmarker", x, y, born: now, life: 250, headshot });
    // Искры — разлетаются в случайные стороны
    for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        effects.push({ type: "spark", x, y, dx: Math.cos(a) * speed, dy: Math.sin(a) * speed, born: now, life: 400 });
    }
    // Всплывающий текст
    effects.push({ type: "text", x, y: y - 20, text: headshot ? "HEADSHOT" : "+1", born: now, life: 700, headshot });
}

function drawEffects(now) {
    // filter оставляет в списке только «живые» эффекты
    effects = effects.filter(function (e) { return now - e.born < e.life; });

    for (const e of effects) {
        const k = (now - e.born) / e.life;      // от 0 (только появился) до 1 (исчезает)
        ctx.globalAlpha = 1 - k;                // постепенно становится прозрачным

        if (e.type === "hole") {
            // След от пули: тёмная точка с серым ободком
            ctx.beginPath();
            ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#111";
            ctx.fill();
            ctx.strokeStyle = "rgba(200,200,200,0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (e.type === "spark") {
            ctx.fillStyle = "#ffd27a";
            ctx.fillRect(e.x + e.dx * k * 25, e.y + e.dy * k * 25, 3, 3);
        } else if (e.type === "hitmarker") {
            const s = 10;
            ctx.strokeStyle = e.headshot ? "#ff3b3b" : "white";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(e.x - s, e.y - s); ctx.lineTo(e.x - 4, e.y - 4);
            ctx.moveTo(e.x + s, e.y - s); ctx.lineTo(e.x + 4, e.y - 4);
            ctx.moveTo(e.x - s, e.y + s); ctx.lineTo(e.x - 4, e.y + 4);
            ctx.moveTo(e.x + s, e.y + s); ctx.lineTo(e.x + 4, e.y + 4);
            ctx.stroke();
        } else if (e.type === "text") {
            ctx.font = e.headshot ? "bold 20px Rubik, sans-serif" : "bold 16px Rubik, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = e.headshot ? "#ff3b3b" : "#9fe870";
            ctx.fillText(e.text, e.x, e.y - k * 30);    // текст уплывает вверх
        }
    }
    ctx.globalAlpha = 1;
}

// ===== Прицел (вместо курсора мышки) =====
function drawCrosshair() {
    if (!mouse.inside) return;
    const x = Math.round(mouse.x);
    const y = Math.round(mouse.y);
    const parts = [[x + 3, y - 1, 8, 2], [x - 11, y - 1, 8, 2], [x - 1, y + 3, 2, 8], [x - 1, y - 11, 2, 8]];
    ctx.fillStyle = "black";
    for (const p of parts) ctx.fillRect(p[0] - 1, p[1] - 1, p[2] + 2, p[3] + 2);
    ctx.fillStyle = "#00ff00";
    for (const p of parts) ctx.fillRect(p[0], p[1], p[2], p[3]);
}

// ===== Табло и килфид в стиле CS =====
function drawHud(now) {
    // Табло сверху по центру
    let timeText;
    if (game.mode === "reaction") {
        timeText = `${game.hits} / 10`;
    } else {
        const left = Math.max(0, game.duration - (now - game.startTime));
        const sec = Math.ceil(left / 1000);
        timeText = "0:" + String(sec).padStart(2, "0");     // 9 → "0:09"
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(W / 2 - 70, 10, 140, 40);
    ctx.font = "bold 24px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(timeText, W / 2, 39);

    // Счёт слева сверху
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(10, 10, 210, 40);
    ctx.font = "16px Rubik, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#9fe870";
    ctx.fillText(`🎯 ${game.hits}`, 22, 36);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText(`⊙ ${game.headshots}`, 90, 36);
    ctx.fillStyle = "#bbb";
    ctx.fillText(`✕ ${game.misses}`, 155, 36);

    // Килфид справа сверху: каждая строчка живёт 3 секунды
    killfeed = killfeed.filter(function (k) { return now - k.born < 3000; });
    ctx.font = "14px Rubik, sans-serif";
    ctx.textAlign = "right";
    killfeed.forEach(function (k, i) {
        const y = 14 + i * 30;
        const text = `SaLathiC   ➶   ${k.headshot ? "⊙ " : ""}мишень`;
        const w = ctx.measureText(text).width + 20;     // measureText — какой ширины получится текст
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(W - 10 - w, y, w, 24);
        ctx.strokeStyle = "#d33";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(W - 10 - w, y, w, 24);
        ctx.fillStyle = "white";
        ctx.fillText(text, W - 20, y + 17);
    });
}

// ===== Экраны: меню, отсчёт, итоги =====
function drawStartButton(label) {
    const b = startButton;
    const hover = mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h;
    ctx.fillStyle = hover ? "#ffc04d" : "#f5a623";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.font = "bold 24px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.fillText(label, W / 2, b.y + 39);
}

function drawMenu() {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Rubik, sans-serif";
    ctx.fillText("АИМ-ТРЕНЕР", W / 2, H / 2 - 50);
    ctx.font = "16px Rubik, sans-serif";
    ctx.fillStyle = "#bbb";
    const mode = document.getElementById("aim-mode");
    ctx.fillText(mode.options[mode.selectedIndex].text, W / 2, H / 2 - 18);
    drawStartButton("▶  СТАРТ");
}

function drawCountdown(now) {
    const passed = now - countdownStart;
    const n = 3 - Math.floor(passed / 700);     // каждая цифра — 0,7 секунды
    if (n <= 0) {
        startGame();
        return;
    }
    const k = (passed % 700) / 700;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.font = `bold ${120 - k * 40}px Rubik, sans-serif`;      // цифра уменьшается
    ctx.globalAlpha = 1 - k * 0.7;
    ctx.fillStyle = "#f5a623";
    ctx.fillText(n, W / 2, H / 2 + 40);
    ctx.globalAlpha = 1;
}

function drawResults() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.font = "bold 34px Rubik, sans-serif";
    ctx.fillText("РАУНД ОКОНЧЕН", W / 2, H / 2 - 70);
    ctx.font = "20px Rubik, sans-serif";
    ctx.fillStyle = "#f5a623";
    ctx.fillText(`${game.score} очков · точность ${game.accuracy}% · хедшотов ${game.headshots}`, W / 2, H / 2 - 30);
    drawStartButton("↻  ЕЩЁ РАЗ");
}

// ===== Игровой цикл =====
function update(now) {
    for (let i = 0; i < game.targets.length; i++) {
        const t = game.targets[i];
        if (game.mode === "moving") {
            t.x += t.dx;
            t.y += t.dy;
            if (t.x < t.r + 10 || t.x > W - t.r - 10) t.dx = -t.dx;
            if (t.y < t.r + 60 || t.y > H - t.r - 10) t.dy = -t.dy;
        }
        if (game.mode === "shrink") {
            t.r = game.radius * (1 - (now - t.born) / 2000);
            if (t.r <= 2) {
                game.misses++;
                game.targets[i] = newTarget();
            }
        }
    }
    if (game.mode === "reaction" && game.hits >= 10) {
        endGame();
    } else if (game.mode !== "reaction" && now - game.startTime >= game.duration) {
        endGame();
    }
}

function frame(now) {
    drawBackground();

    if (state === "playing") {
        update(now);
    }
    if (state === "playing" || state === "results") {
        drawEffects(now);
        for (const t of game.targets) drawTarget(t, now);
        drawHud(now);
    }
    if (state === "menu") drawMenu();
    if (state === "countdown") drawCountdown(now);
    if (state === "results") drawResults();

    drawCrosshair();
    requestAnimationFrame(frame);
}

// ===== Мышка =====
// Переводим координаты мышки в координаты холста (на экране холст может быть растянут)
function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (W / rect.width),
        y: (event.clientY - rect.top) * (H / rect.height),
    };
}

canvas.addEventListener("mousemove", function (event) {
    const p = toCanvas(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
});
canvas.addEventListener("mouseleave", function () {
    mouse.inside = false;
});

canvas.addEventListener("mousedown", function (event) {
    const p = toCanvas(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;

    // Меню или итоги: клик по кнопке — начать
    if (state === "menu" || state === "results") {
        const b = startButton;
        if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) {
            startCountdown();
        }
        return;
    }
    if (state !== "playing") {
        return;
    }

    // Попали ли в мишень? Расстояние до центра меньше радиуса — попал
    for (let i = 0; i < game.targets.length; i++) {
        const t = game.targets[i];
        const distance = Math.hypot(p.x - t.x, p.y - t.y);
        if (distance <= t.r) {
            const headshot = distance <= t.r * 0.4;     // в белое кольцо — хедшот
            game.hits++;
            if (headshot) game.headshots++;
            game.reactionTimes.push(performance.now() - t.born);
            addHitEffects(t.x, t.y, headshot);
            killfeed.unshift({ born: performance.now(), headshot });   // unshift — добавить в начало
            killfeed = killfeed.slice(0, 5);                            // не больше 5 строчек
            hitSound(headshot);
            game.targets[i] = newTarget();
            return;
        }
    }
    // Промах — след от пули на стене
    game.misses++;
    effects.push({ type: "hole", x: p.x, y: p.y, born: performance.now(), life: 1500 });
});

// ===== Конец игры =====
function endGame() {
    state = "results";
    game.targets = [];

    const total = game.hits + game.misses;
    game.accuracy = total === 0 ? 0 : Math.round((game.hits / total) * 100);
    let avgReaction = 0;
    if (game.reactionTimes.length > 0) {
        let sum = 0;
        for (const t of game.reactionTimes) sum += t;
        avgReaction = Math.round(sum / game.reactionTimes.length);
    }
    // Очки: попадания с учётом точности, хедшот стоит как полтора попадания.
    // В «Реакции» — чем быстрее, тем лучше
    let score;
    if (game.mode === "reaction") {
        score = Math.max(0, 1000 - avgReaction) * (game.accuracy / 100);
    } else {
        score = (game.hits + game.headshots * 0.5) * game.accuracy;
    }
    game.score = Math.round(score);

    document.getElementById("result-stats").innerHTML = `
        <div class="stat"><span class="stat-number">${game.score}</span><span class="stat-label">очков</span></div>
        <div class="stat"><span class="stat-number">${game.hits}</span><span class="stat-label">попаданий</span></div>
        <div class="stat"><span class="stat-number">${game.headshots}</span><span class="stat-label">хедшотов</span></div>
        <div class="stat"><span class="stat-number">${game.accuracy}%</span><span class="stat-label">точность</span></div>
        <div class="stat"><span class="stat-number">${avgReaction}</span><span class="stat-label">мс на мишень</span></div>
    `;

    // Рекорд для каждого режима хранится в браузере
    const key = "aim-record-" + game.mode;
    let record = 0;
    try {
        record = Number(localStorage.getItem(key)) || 0;
        if (game.score > record) localStorage.setItem(key, game.score);
    } catch (e) {}
    document.getElementById("result-record").textContent = game.score > record
        ? `🏆 Новый рекорд! Было: ${record}`
        : `Твой рекорд в этом режиме: ${record}`;
    document.getElementById("aim-result").hidden = false;
}

// ===== Настройки =====
function showSize() {
    document.getElementById("aim-size-out").textContent = document.getElementById("aim-size").value;
}
document.getElementById("aim-size").addEventListener("input", showSize);
document.getElementById("aim-map").addEventListener("change", loadBackground);

showSize();
loadBackground();
requestAnimationFrame(frame);
