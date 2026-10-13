// Калькулятор экономики CS2 + меню закупки, как в игре.
// ⚠️ Цифры из гайдов (csdb.gg и др.) — Valve может менять их в обновлениях.

const WIN_REWARD = 3250;        // за победу (все убиты или кончилось время)
const BOMB_WIN_REWARD = 3500;   // T — бомба взорвалась, КТ — бомбу разминировали
const PLANT_BONUS = 800;        // T проиграли, но успели поставить бомбу
const MAX_MONEY = 16000;        // больше 16000 денег быть не может

// Бонус за проигрыш: первый проигрыш — 1400, каждый следующий +500, но не больше 3400
function lossBonus(lossesBefore) {
    return Math.min(1400 + lossesBefore * 500, 3400);
}

// ===== Магазин =====
// cat — раздел. От раздела зависят правила:
//   pistol — только один пистолет, primary — только одно основное оружие (SMG или винтовка),
//   armor — только одна броня, grenade — не больше 4 гранат, kit — кусачки
// limit — сколько штук можно взять (у флешек 2, у остальных гранат 1)
const shop = {
    t: [
        { name: "P250",          price: 300,  cat: "pistol" },
        { name: "Tec-9",         price: 500,  cat: "pistol" },
        { name: "Desert Eagle",  price: 700,  cat: "pistol" },
        { name: "MAC-10",        price: 1050, cat: "smg" },
        { name: "UMP-45",        price: 1200, cat: "smg" },
        { name: "MP7",           price: 1500, cat: "smg" },
        { name: "P90",           price: 2350, cat: "smg" },
        { name: "Galil AR",      price: 1800, cat: "rifle" },
        { name: "SSG 08",        price: 1700, cat: "rifle" },
        { name: "AK-47",         price: 2700, cat: "rifle" },
        { name: "SG 553",        price: 3000, cat: "rifle" },
        { name: "AWP",           price: 4750, cat: "rifle" },
        { name: "Броня",         price: 650,  cat: "armor" },
        { name: "Броня + шлем",  price: 1000, cat: "armor" },
        { name: "Смок",          price: 300,  cat: "grenade", limit: 1 },
        { name: "Флешка",        price: 200,  cat: "grenade", limit: 2 },
        { name: "ХАЕ",           price: 300,  cat: "grenade", limit: 1 },
        { name: "Молотов",       price: 400,  cat: "grenade", limit: 1 },
        { name: "Ложная",        price: 50,   cat: "grenade", limit: 1 },
    ],
    ct: [
        { name: "P250",          price: 300,  cat: "pistol" },
        { name: "Five-SeveN",    price: 500,  cat: "pistol" },
        { name: "Desert Eagle",  price: 700,  cat: "pistol" },
        { name: "MP9",           price: 1250, cat: "smg" },
        { name: "UMP-45",        price: 1200, cat: "smg" },
        { name: "MP7",           price: 1500, cat: "smg" },
        { name: "P90",           price: 2350, cat: "smg" },
        { name: "FAMAS",         price: 2050, cat: "rifle" },
        { name: "SSG 08",        price: 1700, cat: "rifle" },
        { name: "M4A1-S",        price: 2900, cat: "rifle" },
        { name: "M4A4",          price: 3100, cat: "rifle" },
        { name: "AUG",           price: 3300, cat: "rifle" },
        { name: "AWP",           price: 4750, cat: "rifle" },
        { name: "Броня",         price: 650,  cat: "armor" },
        { name: "Броня + шлем",  price: 1000, cat: "armor" },
        { name: "Набор сапёра",  price: 400,  cat: "kit",     limit: 1 },
        { name: "Смок",          price: 300,  cat: "grenade", limit: 1 },
        { name: "Флешка",        price: 200,  cat: "grenade", limit: 2 },
        { name: "ХАЕ",           price: 300,  cat: "grenade", limit: 1 },
        { name: "Зажигалка",     price: 500,  cat: "grenade", limit: 1 },
        { name: "Ложная",        price: 50,   cat: "grenade", limit: 1 },
    ],
};

// Разделы магазина: как называть и в каком порядке показывать
const shopSections = [
    { title: "🔫 Пистолеты",                cats: ["pistol"] },
    { title: "💨 Пистолеты-пулемёты",       cats: ["smg"] },
    { title: "🎯 Винтовки",                 cats: ["rifle"] },
    { title: "🛡️ Снаряжение",               cats: ["armor", "kit"] },
    { title: "💣 Гранаты (до 4 штук)",      cats: ["grenade"] },
];

// Корзина — список купленных предметов
let cart = [];

function $(id) {
    return document.getElementById(id);
}

// Форматирование денег: 4600 → "$4 600"
function money(n) {
    return "$" + n.toLocaleString("ru-RU");
}

function getCash() {
    return Math.min(MAX_MONEY, Math.max(0, Number($("eco-money").value) || 0));
}

// Сколько уже потрачено — сумма цен всего в корзине
function spent() {
    let sum = 0;
    for (const item of cart) {
        sum += item.price;
    }
    return sum;
}

// Основное оружие — это и пистолеты-пулемёты, и винтовки (в руках может быть только одно)
function slotOf(item) {
    if (item.cat === "smg" || item.cat === "rifle") {
        return "primary";
    }
    return item.cat;
}

// Что в корзине занимает тот же слот (для оружия и брони — заменяется при покупке)
function sameSlot(item) {
    for (const owned of cart) {
        if (slotOf(owned) === slotOf(item)) {
            return owned;
        }
    }
    return null;
}

// Сколько таких предметов уже куплено
function countOf(item) {
    let n = 0;
    for (const owned of cart) {
        if (owned.name === item.name) {
            n++;
        }
    }
    return n;
}

function grenadeCount() {
    let n = 0;
    for (const owned of cart) {
        if (owned.cat === "grenade") {
            n++;
        }
    }
    return n;
}

// Можно ли купить? Возвращает "" если можно, или причину, почему нельзя
function whyCantBuy(item) {
    const left = getCash() - spent();

    if (item.cat === "grenade" || item.cat === "kit") {
        if (countOf(item) >= item.limit) return "Больше нельзя";
        if (item.cat === "grenade" && grenadeCount() >= 4) return "Уже 4 гранаты";
        if (item.price > left) return "Не хватает денег";
        return "";
    }

    // Оружие и броня: если в этом слоте уже что-то есть, оно заменится, и деньги за него вернутся
    const old = sameSlot(item);
    if (old !== null && old.name === item.name) return "Уже куплено";
    const refund = old === null ? 0 : old.price;
    if (item.price > left + refund) return "Не хватает денег";
    return "";
}

function buy(item) {
    if (whyCantBuy(item) !== "") {
        return;
    }
    if (item.cat !== "grenade" && item.cat !== "kit") {
        const old = sameSlot(item);
        if (old !== null) {
            cart.splice(cart.indexOf(old), 1);      // splice — вырезать из списка (старое оружие продаём)
        }
    }
    cart.push(item);
    update();
}

// ===== Рисуем всё =====
function update() {
    const side = $("eco-side").value;
    const cash = getCash();
    const losses = Number($("eco-losses").value);
    $("eco-losses-out").textContent = losses;

    // Если денег стало меньше, чем уже потрачено, — закупка не получится, сбрасываем
    if (spent() > cash) {
        cart = [];
    }
    const left = cash - spent();
    $("eco-left").textContent = money(left);

    // ----- Магазин: кнопки по разделам -----
    let shopHtml = "";
    for (const section of shopSections) {
        let buttons = "";
        shop[side].forEach(function (item, index) {
            if (!section.cats.includes(item.cat)) {
                return;
            }
            const reason = whyCantBuy(item);
            const count = countOf(item);
            const badge = count > 0 ? `<i class="owned">✓${count > 1 ? " ×" + count : ""}</i>` : "";
            // disabled — кнопку нельзя нажать; title — подсказка при наведении мышки
            buttons += `
                <button class="shop-item" data-index="${index}" ${reason ? "disabled" : ""} title="${reason}">
                    ${badge}<span>${item.name}</span><b>${money(item.price)}</b>
                </button>`;
        });
        if (buttons !== "") {
            shopHtml += `<h3 class="shop-section">${section.title}</h3><div class="shop-row">${buttons}</div>`;
        }
    }
    $("eco-shop").innerHTML = shopHtml;

    // ----- Корзина -----
    let cartHtml = "";
    cart.forEach(function (item, index) {
        cartHtml += `<button class="cart-item" data-index="${index}">${item.name} <b>${money(item.price)}</b> ✕</button>`;
    });
    if (cartHtml === "") {
        cartHtml = `<p class="hint">Пока ничего не куплено. Стартовый пистолет у тебя и так есть бесплатно.</p>`;
    } else {
        cartHtml += `<p class="cart-total">Потрачено: <b>${money(spent())}</b> из ${money(cash)}</p>`;
    }
    $("eco-cart").innerHTML = cartHtml;

    // ----- Деньги в следующем раунде (от остатка) -----
    const ifWin = Math.min(MAX_MONEY, left + WIN_REWARD);
    const ifBombWin = Math.min(MAX_MONEY, left + BOMB_WIN_REWARD);
    const ifLose = Math.min(MAX_MONEY, left + lossBonus(losses));
    let cards = `
        <div class="stat"><span class="stat-number">${money(ifWin)}</span><span class="stat-label">если победим</span></div>
        <div class="stat"><span class="stat-number">${money(ifBombWin)}</span><span class="stat-label">${side === "t" ? "победа взрывом бомбы" : "победа разминированием"}</span></div>
        <div class="stat"><span class="stat-number">${money(ifLose)}</span><span class="stat-label">если проиграем<br>(бонус ${money(lossBonus(losses))})</span></div>
    `;
    if (side === "t") {
        const ifLosePlant = Math.min(MAX_MONEY, ifLose + PLANT_BONUS);
        cards += `<div class="stat"><span class="stat-number">${money(ifLosePlant)}</span><span class="stat-label">проиграем, но поставим бомбу</span></div>`;
    }
    $("eco-next").innerHTML = cards;
}

// ===== Клики =====

// Клик по предмету в магазине — купить
$("eco-shop").addEventListener("click", function (event) {
    const button = event.target.closest(".shop-item");
    if (button && !button.disabled) {
        buy(shop[$("eco-side").value][button.dataset.index]);
    }
});

// Клик по предмету в корзине — продать
$("eco-cart").addEventListener("click", function (event) {
    const button = event.target.closest(".cart-item");
    if (button) {
        cart.splice(Number(button.dataset.index), 1);
        update();
    }
});

$("eco-reset").addEventListener("click", function () {
    cart = [];
    update();
});

// Сменили сторону — у T и КТ разные магазины, поэтому корзину очищаем
$("eco-side").addEventListener("change", function () {
    cart = [];
    update();
});

document.addEventListener("input", update);
update();
