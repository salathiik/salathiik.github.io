// Генератор конфига: читает настройки со страницы, рисует превью прицела
// и собирает команды для консоли CS2.

// Короткая функция «найди элемент по id», чтобы не писать каждый раз длинное название
function $(id) {
    return document.getElementById(id);
}

// ===== Готовые прицелы =====
const crosshairPresets = {
    classic: { size: 2,   thickness: 1,   gap: -2,  dot: false, outline: true,  t: false, color: "#00ff00" },
    small:   { size: 1,   thickness: 0.5, gap: -3,  dot: false, outline: true,  t: false, color: "#00ffff" },
    dot:     { size: 0,   thickness: 1,   gap: -5,  dot: true,  outline: true,  t: false, color: "#ff00ff" },
    big:     { size: 4,   thickness: 1.5, gap: 0,   dot: true,  outline: true,  t: false, color: "#ffff00" },
};

// Положения рук: поле зрения (fov) и сдвиги по x, y, z
const viewmodels = {
    default: { fov: 60, x: 1,   y: 1, z: -1 },
    wide:    { fov: 68, x: 2.5, y: 0, z: -1.5 },
    close:   { fov: 54, x: 0,   y: 1, z: -1 },
};

// Картинка-фон для превью прицела — скриншот Dust 2 с плитки на главной
const background = new Image();
background.src = "images/dust2.jpg";
background.onload = update;     // когда картинка загрузится — перерисовать

// ===== Рисуем превью прицела =====
function drawCrosshair(settings) {
    const canvas = $("crosshair-preview");
    const ctx = canvas.getContext("2d");    // ctx — «кисточка» для рисования на холсте
    const cx = canvas.width / 2;            // центр холста
    const cy = canvas.height / 2;

    // Фон: картинка карты (если загрузилась) или просто серый
    if (background.complete && background.naturalWidth > 0) {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#555";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Переводим числа из настроек игры в пиксели (примерно как в игре на 1080p)
    const length = settings.size * 2.5;
    const thick = Math.max(1, settings.thickness * 2);
    const gap = Math.max(0, 4 + settings.gap);

    // Список прямоугольников, из которых состоит прицел: [x, y, ширина, высота]
    const parts = [
        [cx + gap, cy - thick / 2, length, thick],            // правая палочка
        [cx - gap - length, cy - thick / 2, length, thick],   // левая
        [cx - thick / 2, cy + gap, thick, length],            // нижняя
    ];
    if (!settings.t) {
        parts.push([cx - thick / 2, cy - gap - length, thick, length]);   // верхняя
    }
    if (settings.dot) {
        parts.push([cx - thick / 2, cy - thick / 2, thick, thick]);       // точка
    }

    // Сначала чёрная обводка (чуть больше каждой части), потом сам цвет
    if (settings.outline) {
        ctx.fillStyle = "black";
        for (const p of parts) {
            ctx.fillRect(p[0] - 1, p[1] - 1, p[2] + 2, p[3] + 2);
        }
    }
    ctx.fillStyle = settings.color;
    for (const p of parts) {
        ctx.fillRect(p[0], p[1], p[2], p[3]);
    }
}

// Цвет из формата "#00ff00" в три числа: красный, зелёный, синий (от 0 до 255)
function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

// ===== Собираем всё вместе =====
function update() {
    // Читаем прицел со страницы
    const ch = {
        size: Number($("ch-size").value),
        thickness: Number($("ch-thickness").value),
        gap: Number($("ch-gap").value),
        color: $("ch-color").value,
        dot: $("ch-dot").checked,
        outline: $("ch-outline").checked,
        t: $("ch-t").checked,
    };

    // Показываем числа рядом с ползунками
    $("ch-size-out").textContent = ch.size;
    $("ch-thickness-out").textContent = ch.thickness;
    $("ch-gap-out").textContent = ch.gap;

    drawCrosshair(ch);

    const rgb = hexToRgb(ch.color);
    const vm = viewmodels[$("vm-preset").value];

    // Каждая строчка — одна команда для консоли. В конце соединим их переносами строк
    const lines = [
        "// Конфиг с сайта salathiik.github.io",
        "",
        "// Прицел",
        "cl_crosshairstyle 4",
        "cl_crosshairsize " + ch.size,
        "cl_crosshairthickness " + ch.thickness,
        "cl_crosshairgap " + ch.gap,
        "cl_crosshairdot " + (ch.dot ? 1 : 0),
        "cl_crosshair_drawoutline " + (ch.outline ? 1 : 0),
        "cl_crosshair_outlinethickness 1",
        "cl_crosshair_t " + (ch.t ? 1 : 0),
        "cl_crosshaircolor 5",
        "cl_crosshaircolor_r " + rgb.r,
        "cl_crosshaircolor_g " + rgb.g,
        "cl_crosshaircolor_b " + rgb.b,
        "cl_crosshairalpha 255",
        "",
        "// Руки",
        "viewmodel_fov " + vm.fov,
        "viewmodel_offset_x " + vm.x,
        "viewmodel_offset_y " + vm.y,
        "viewmodel_offset_z " + vm.z,
        "",
        "// Мышь и общее",
        "sensitivity " + $("sens").value,
        "m_rawinput " + ($("opt-rawinput").checked ? 1 : 0),
        "cl_showfps " + ($("opt-fps").checked ? 1 : 0),
        "",
        "// Бинды гранат",
    ];
    // Гранаты в CS2 лежат в «слотах»: 6 — ХАЕ, 7 — флешка, 8 — смок, 10 — молотов
    const binds = [
        ["bind-smoke", "slot8"],
        ["bind-flash", "slot7"],
        ["bind-molotov", "slot10"],
        ["bind-he", "slot6"],
    ];
    for (const [inputId, slot] of binds) {
        const key = $(inputId).value.trim().toLowerCase();
        if (key !== "") {
            lines.push(`bind "${key}" "${slot}"`);
        }
    }
    lines.push("", "echo \"Конфиг загружен!\"");

    $("config-output").value = lines.join("\n");

    // Тренировочный сервер: собираем отмеченные команды
    const practice = ["sv_cheats 1"];
    for (const box of document.querySelectorAll(".practice")) {
        if (box.checked) {
            practice.push(box.dataset.cmd);
        }
    }
    practice.push("mp_warmup_end", "mp_restartgame 1");
    // В консоль удобнее вставлять одной строкой: команды через точку с запятой
    $("practice-output").value = practice.join("; ");
}

// ===== Кнопки =====

// Любое изменение на странице — пересобрать конфиг
document.addEventListener("input", update);

// Готовые прицелы
for (const button of document.querySelectorAll("[data-preset]")) {
    button.addEventListener("click", function () {
        const p = crosshairPresets[button.dataset.preset];
        $("ch-size").value = p.size;
        $("ch-thickness").value = p.thickness;
        $("ch-gap").value = p.gap;
        $("ch-color").value = p.color;
        $("ch-dot").checked = p.dot;
        $("ch-outline").checked = p.outline;
        $("ch-t").checked = p.t;
        update();
    });
}

// Копирование в буфер обмена. Кнопка ненадолго пишет «Скопировано!»
function copyText(text, button) {
    navigator.clipboard.writeText(text).then(function () {
        const old = button.textContent;
        button.textContent = "✅ Скопировано!";
        setTimeout(function () { button.textContent = old; }, 1500);   // через 1,5 секунды вернуть
    });
}

$("copy-config").addEventListener("click", function () {
    copyText($("config-output").value, this);
});
$("copy-practice").addEventListener("click", function () {
    copyText($("practice-output").value, this);
});

// Скачивание файла: делаем «файл в памяти» (Blob) и временную ссылку на него
$("download-config").addEventListener("click", function () {
    const file = new Blob([$("config-output").value], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "autoexec.cfg";     // имя скачанного файла
    link.click();
    URL.revokeObjectURL(link.href);     // ссылка больше не нужна — убираем
});

update();
