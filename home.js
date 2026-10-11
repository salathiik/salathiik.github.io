// «Робот» для главной страницы: рисует плитки карт из списка maps (файл data.js).
// Если у карты есть раскидки — плитка ведёт на её страницу, если нет — на страницу «Скоро».

const mapGrid = document.querySelector(".map-grid");

let html = "";

for (const map of maps) {
    // Считаем, сколько раскидок у этой карты
    let count = 0;
    for (const lineup of lineups) {
        if (lineup.map === map.id) {
            count = count + 1;
        }
    }

    // Решаем, куда ведёт плитка и что написать под названием
    let link;
    let note;
    if (count > 0) {
        link = "map.html?map=" + map.id;
        note = "Раскидок: " + count;
    } else {
        link = "soon.html";
        note = "Скоро";
    }

    html += `
        <a class="map-card" href="${link}">
            <img class="map-picture" src="${map.image}" alt="Карта ${map.name}">
            <span class="map-name">${map.name}</span>
            <span class="map-count">${note}</span>
        </a>
    `;
}

mapGrid.innerHTML = html;

// ===== Статистика для блока «О сайте» =====

// Считаем раскидки каждого типа
let smokes = 0;
let flashes = 0;
let molotovs = 0;
for (const lineup of lineups) {
    if (lineup.type === "smoke") {
        smokes = smokes + 1;
    } else if (lineup.type === "flash") {
        flashes = flashes + 1;
    } else if (lineup.type === "molotov") {
        molotovs = molotovs + 1;
    }
}

// Считаем карты, у которых есть хотя бы одна раскидка
let mapsWithLineups = 0;
for (const map of maps) {
    for (const lineup of lineups) {
        if (lineup.map === map.id) {
            mapsWithLineups = mapsWithLineups + 1;
            break;      // break значит «хватит, выходи из цикла»: одной раскидки достаточно
        }
    }
}

// Пишем цифры на страницу. getElementById находит элемент по его id
// lineups.length — это длина списка, то есть сколько в нём раскидок
document.getElementById("stat-total").textContent = lineups.length;
document.getElementById("stat-maps").textContent = mapsWithLineups;
document.getElementById("stat-smoke").textContent = smokes;
document.getElementById("stat-flash").textContent = flashes;
document.getElementById("stat-molotov").textContent = molotovs;
