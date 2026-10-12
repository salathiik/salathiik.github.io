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

// Найти автора в списке authors (из data.js) по его id. Если не нашли — вернёт null
function findAuthor(id) {
    for (const author of authors) {
        if (author.id === id) {
            return author;      // return — «вот ответ, дальше не ищи»
        }
    }
    return null;
}

// HTML овальной плашки автора: маленькая аватарка + имя.
// data-author — id автора, по нему клик поймёт, чью карточку открыть
function authorBadge(author) {
    return `
        <button class="author-badge" data-author="${author.id}">
            <img src="${author.photo}" alt="">
            ${author.verb || "Взято у"} ${author.name}
        </button>
    `;
}

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
            // Картинка-превью лежит в папке posters и называется так же, как видео:
            // videos/dust2-smoke-xbox.mp4 → posters/dust2-smoke-xbox.jpg
            const poster = lineup.video.replace("videos/", "posters/").replace(".mp4", ".jpg");

            // Плашка автора — только если у раскидки указан source
            const author = findAuthor(lineup.source);
            let badge = "";
            if (author !== null) {
                badge = authorBadge(author);
            }

            // Собираем HTML карточки. Вместо ${...} подставляются данные из списка.
            // У видео пока НЕТ src — только data-src («адрес на потом»).
            // Настоящий src поставит наблюдатель, когда карточка появится на экране.
            // poster — картинка, которую видно, пока видео не загрузилось
            // data-index — номер раскидки в списке lineups. По нему мини-страничка
            // поймёт, какую раскидку показать
            html += `
                <article class="lineup-card" data-index="${lineups.indexOf(lineup)}">
                    <video data-src="${lineup.video}" poster="${poster}" preload="none" loop muted playsinline></video>

                    <div class="lineup-info">
                        <h3>${lineup.title}</h3>

                        <span class="tag tag-${lineup.type}">${typeNames[lineup.type]}</span>
                        <span class="tag tag-${lineup.side}">${sideNames[lineup.side]}</span>
                        ${badge}

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

    // Просим наблюдателя следить за каждым новым видео
    for (const video of grid.querySelectorAll("video")) {
        videoWatcher.observe(video);
    }
}

// ===== Наблюдатель за видео =====

// IntersectionObserver — «наблюдатель». Он сам сообщает, когда элемент
// появился на экране или ушёл с него. Мы используем его, чтобы видео
// качались и играли только тогда, когда их видно. Так страница открывается
// быстрее и тратит меньше интернета.
const videoWatcher = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
        const video = entry.target;

        if (entry.isIntersecting) {
            // Видео появилось на экране.
            // Если оно ещё не загружалось — даём ему настоящий адрес
            if (!video.src) {
                video.src = video.dataset.src;
            }
            // play() может не сработать (например, в режиме экономии батареи) —
            // тогда просто ничего не делаем, останется превью
            video.play().catch(function () {});
        } else {
            // Видео ушло с экрана — ставим на паузу, чтобы не грузить компьютер
            video.pause();
        }
    }
}, {
    rootMargin: "200px",    // начинаем грузить чуть заранее, за 200px до появления на экране
});

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

// ===== Мини-страничка раскидки =====

const modal = document.querySelector(".modal");
const modalVideo = document.querySelector(".modal-video");

// Функция «открой мини-страничку для этой раскидки»
function openModal(lineup) {
    // Заполняем мини-страничку данными раскидки
    document.querySelector(".modal-title").textContent = lineup.title;
    document.querySelector(".modal-tags").innerHTML = `
        <span class="tag tag-${lineup.type}">${typeNames[lineup.type]}</span>
        <span class="tag tag-${lineup.side}">${sideNames[lineup.side]}</span>
    `;
    // Если purpose пустой — пишем запасной текст. || значит «или»: возьми purpose, а если он пустой — вот это
    document.querySelector(".modal-purpose").textContent = lineup.purpose || "Описание скоро появится";
    document.querySelector(".modal-from").textContent = lineup.from;
    document.querySelector(".modal-aim").textContent = lineup.aim;
    document.querySelector(".modal-how").textContent = lineup.how;

    // Автор раскидки: если есть — показываем овальную плашку «Взято у ...»
    const sourceLine = document.querySelector(".modal-source");
    const author = findAuthor(lineup.source);
    if (author === null) {
        sourceLine.hidden = true;           // автора нет — строчку прячем
    } else {
        sourceLine.innerHTML = authorBadge(author);
        sourceLine.hidden = false;
    }

    // Ставим видео и запускаем
    modalVideo.src = lineup.video;
    modalVideo.play().catch(function () {});

    // Показываем мини-страничку и запрещаем прокрутку сайта под ней
    modal.hidden = false;
    document.body.style.overflow = "hidden";
}

// Функция «закрой мини-страничку»
function closeModal() {
    closeAuthor();                          // карточку автора тоже закрываем, если открыта
    modal.hidden = true;
    document.body.style.overflow = "";
    // Останавливаем и выгружаем видео, чтобы оно не качалось и не играло в фоне
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
}

// Клик по карточке открывает мини-страничку.
// Вешаем один «будильник» на всю сетку, а не на каждую карточку:
// closest() находит карточку, внутри которой кликнули
grid.addEventListener("click", function (event) {
    // Если кликнули по плашке автора — открываем только карточку автора, без мини-странички
    const badge = event.target.closest(".author-badge");
    if (badge) {
        openAuthor(findAuthor(badge.dataset.author));
        return;
    }

    const card = event.target.closest(".lineup-card");
    if (card) {
        openModal(lineups[card.dataset.index]);
    }
});

// Закрываем крестиком
document.querySelector(".modal-close").addEventListener("click", closeModal);

// Закрываем кликом по тёмному фону вокруг окна (но не по самому окну)
modal.addEventListener("click", function (event) {
    if (event.target === modal) {
        closeModal();
    }
});

// Закрываем клавишей Esc. Сначала закрывается то, что сверху:
// если открыта карточка автора — она, иначе мини-страничка
document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
        return;                             // return — «дальше не выполняй»
    }
    if (!authorPopup.hidden) {
        closeAuthor();
    } else if (!modal.hidden) {
        closeModal();
    }
});

// ===== Карточка автора =====

const authorPopup = document.querySelector(".author-popup");

// Функция «покажи карточку этого автора»
function openAuthor(author) {
    document.querySelector(".author-photo").src = author.photo;
    document.querySelector(".author-photo").alt = author.name;
    document.querySelector(".author-name").textContent = author.name;
    document.querySelector(".author-about").textContent = author.about;
    // Кнопка канала: ссылка, текст и цвет зависят от площадки (YouTube или Rutube).
    // className целиком заменяет классы кнопки: общий author-channel + цвет площадки
    const channelButton = document.querySelector(".author-channel");
    channelButton.href = author.link;
    channelButton.textContent = "▶ Открыть канал на " + platformNames[author.platform];
    channelButton.className = "author-channel channel-" + author.platform;
    authorPopup.hidden = false;
    document.body.style.overflow = "hidden";
}

// Клик по плашке автора в мини-страничке
document.querySelector(".modal-source").addEventListener("click", function (event) {
    const badge = event.target.closest(".author-badge");
    if (badge) {
        openAuthor(findAuthor(badge.dataset.author));
    }
});

function closeAuthor() {
    authorPopup.hidden = true;
    // Прокрутку возвращаем, только если под карточкой автора не открыта мини-страничка
    if (modal.hidden) {
        document.body.style.overflow = "";
    }
}

document.querySelector(".author-close").addEventListener("click", closeAuthor);

// Клик по тёмному фону вокруг карточки автора — закрыть
authorPopup.addEventListener("click", function (event) {
    if (event.target === authorPopup) {
        closeAuthor();
    }
});

// При открытии страницы рисуем все раскидки
showLineups();
