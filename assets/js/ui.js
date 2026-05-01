/* ════════════════════════════════════════════
   ui.js — chỉ giữ theme + search
   Auth được xử lý hoàn toàn trong index.html + supabaseClient.js
   ════════════════════════════════════════════ */

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('theme-pink')) {
        body.classList.replace('theme-pink', 'theme-green');
    } else {
        body.classList.replace('theme-green', 'theme-pink');
    }
}

function executeSearch() {
    const searchQuery = document.getElementById('algo-search').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const algoName = card.querySelector('span').innerText.toLowerCase();
        if (searchQuery === '' || algoName.includes(searchQuery)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

function handleEnterSearch(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        executeSearch();
    }
}