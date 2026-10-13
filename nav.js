// Меню сайта. Один файл рисует одинаковое меню на всех страницах.
// Чтобы добавить раздел — допиши строчку в список sections.
//
// Весь код обёрнут в фигурные скобки { }: так его переменные видны только здесь
// и не столкнутся с переменными других файлов (например, в economy.js).
{

    const sections = [
        { href: "index.html",   label: "💨 Раскидки" },
        { href: "config.html",  label: "🛠️ Конфиг" },
        { href: "aim.html",     label: "🎯 Аим" },
        { href: "economy.html", label: "💰 Экономика" },
    ];

    // Узнаём, на какой странице мы сейчас. location.pathname — адрес страницы,
    // например "/map.html". split("/").pop() берёт кусок после последнего слеша
    let currentPage = location.pathname.split("/").pop();
    if (currentPage === "" || currentPage === "map.html" || currentPage === "soon.html") {
        currentPage = "index.html";     // страницы карт относятся к разделу «Раскидки»
    }

    let navHtml = `<a class="nav-logo" href="index.html">SaLathiC<span>CS2</span></a>`;
    for (const section of sections) {
        // Раздел, где мы сейчас, получает класс active — CSS подсветит его оранжевым
        let active = "";
        if (section.href === currentPage) {
            active = "active";
        }
        navHtml += `<a class="nav-link ${active}" href="${section.href}">${section.label}</a>`;
    }

    // Кладём меню в самое начало страницы
    const navBar = document.createElement("nav");
    navBar.className = "site-nav";
    navBar.innerHTML = navHtml;
    document.body.prepend(navBar);
}
