// Этот файл — «робот», который рисует карточки раскидок.
// Он берёт список lineups из файла data.js и для каждой раскидки делает карточку.

// Русские названия для меток. Слева — как записано в data.js, справа — что показать на сайте
const typeNames = {
    smoke: "Смок",
    flash: "Флешка",
    molotov: "Молотов",
};

const sideNames = {
    t: "T",
    ct: "КТ",
};

// ===== Какая карта? =====

// Читаем ссылку. Если она map.html?map=dust2, то mapId будет "dust2"
const params = new URLSearchParams(window.location.search);
const mapId = params.get("map");

// Ищем эту карту в списке maps из data.js
let currentMap = null;      // null значит «пока ничего не нашли»
for (const map of maps) {
    if (map.id === mapId) {
        currentMap = map;
    }
}

// Пишем название карты в заголовок и на вкладку браузера
const mapTitle = document.querySelector(".map-title");
if (currentMap === null) {
    mapTitle.textContent = "Карта не найдена";
} else {
    mapTitle.textContent = currentMap.name;
    document.title = currentMap.name + " — Раскидки CS2";
}

// Находим на странице пустую коробку, куда будем класть карточки
const grid = document.querySelector(".lineup-grid");

// Что сейчас выбрано в фильтрах. "all" значит «всё подряд»
let chosenType = "all";
let chosenSide = "all";
let searchText = "";    // что написано в поиске

// Функция — это «рецепт» с названием. Пишем его один раз,
// а потом запускаем сколько угодно раз командой showLineups()
function showLineups() {
    // Сюда будем складывать HTML подходящих карточек
    let html = "";

    // Цикл: «для каждой раскидки из списка lineups сделай вот это...»
    for (const lineup of lineups) {
        // Раскидки других карт пропускаем.
        // continue значит «эту пропусти, переходи к следующей»
        if (lineup.map !== mapId) {
            continue;
        }

        // Подходит ли раскидка под фильтр?
        // || значит «или»: подходит, если выбрано «все» ИЛИ тип совпадает
        const typeOk = chosenType === "all" || lineup.type === chosenType;
        const sideOk = chosenSide === "all" || lineup.side === chosenSide;

        // Поиск: склеиваем название, «откуда» и «куда целиться» в одну строчку
        // и проверяем, есть ли в ней искомый текст. toLowerCase() делает все буквы маленькими,
        // чтобы «Окно» и «окно» считались одинаковыми
        const allText = (lineup.title + " " + lineup.from + " " + lineup.aim).toLowerCase();
        const searchOk = allText.includes(searchText);

        // && значит «и»: рисуем карточку, только если подходят И тип, И сторона, И поиск
        if (typeOk && sideOk && searchOk) {
            // Собираем HTML карточки. Вместо ${...} подставляются данные из списка
            html += `
                <article class="lineup-card">
                    <video src="${lineup.video}" autoplay loop muted playsinline></video>

                    <div class="lineup-info">
                        <h3>${lineup.title}</h3>

                        <span class="tag tag-${lineup.type}">${typeNames[lineup.type]}</span>
                        <span class="tag tag-${lineup.side}">${sideNames[lineup.side]}</span>

                        <p><b>Откуда:</b> ${lineup.from}</p>
                        <p><b>Куда целиться:</b> ${lineup.aim}</p>
                        <p><b>Как кинуть:</b> ${lineup.how}</p>
                    </div>
                </article>
            `;
        }
    }

    // Если ни одна раскидка не подошла — пишем об этом
    if (html === "") {
        html = `<p>Таких раскидок пока нет.</p>`;
    }

    // Кладём карточки в коробку на странице
    grid.innerHTML = html;
}

// ===== Кнопки фильтров =====

// Находим все кнопки с пометкой data-type (Все гранаты / Смоки / Флешки / Молотовы)
const typeButtons = document.querySelectorAll("[data-type]");

for (const button of typeButtons) {
    // «Когда по кнопке кликнут — сделай вот это»
    button.addEventListener("click", function () {
        // Запоминаем, что выбрали: берём пометку data-type с этой кнопки
        chosenType = button.dataset.type;

        // Снимаем подсветку со всех кнопок группы и подсвечиваем нажатую
        for (const otherButton of typeButtons) {
            otherButton.classList.remove("active");
        }
        button.classList.add("active");

        // Перерисовываем карточки с новым фильтром
        showLineups();
    });
}

// То же самое для кнопок стороны (Обе стороны / T / КТ)
const sideButtons = document.querySelectorAll("[data-side]");

for (const button of sideButtons) {
    button.addEventListener("click", function () {
        chosenSide = button.dataset.side;

        for (const otherButton of sideButtons) {
            otherButton.classList.remove("active");
        }
        button.classList.add("active");

        showLineups();
    });
}

// ===== Поиск =====

const searchInput = document.querySelector(".search");

// Событие "input" срабатывает при каждой новой букве — поиск работает прямо во время набора
searchInput.addEventListener("input", function () {
    // trim() убирает лишние пробелы по краям
    searchText = searchInput.value.trim().toLowerCase();
    showLineups();
});

// При открытии страницы рисуем все раскидки
showLineups();
