// Stato dell'applicazione
let transactions = JSON.parse(localStorage.getItem('my_expenses_data')) || [];
let monthChartInstance = null;

// Elementi DOM
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

const totalBalanceEl = document.getElementById('total-balance');

const noChartMsg = document.getElementById('no-chart-msg');

const transactionsList = document.getElementById('transactions-list');
const noTransactionsEl = document.getElementById('no-transactions');
const categoryBreakdownEl = document.getElementById('category-breakdown');

const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');

const clearBtn = document.getElementById('clear-btn');

// Nomi dei mesi in italiano
const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Data odierna di default per il campo Data
dateInput.valueAsDate = new Date();

// Inizializzazione App
function initApp() {
    updateUI();
    setupCalendar();
}

// Aggiorna tutta l'interfaccia utente
function updateUI() {
    saveToLocalStorage();
    renderTotalBalance();
    renderTransactions();
    renderCategoryBreakdown();
    renderCalendar();
}

// Salva in LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('my_expenses_data', JSON.stringify(transactions));
}

// Formatta importi in valuta Euro
function formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Formatta date per la tabella (GG/MM/AAAA)
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Calcola e aggiorna solo il Saldo Totale in alto
function renderTotalBalance() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const balance = amounts.reduce((acc, item) => acc + item, 0);
    totalBalanceEl.textContent = formatCurrency(balance);
}

// Genera/Aggiorna il grafico Chart.js per le spese del mese
function renderMonthChart(monthTransactions) {
    const monthExpenses = monthTransactions.filter(t => t.type === 'expense');
    const canvas = document.getElementById('monthChart');

    if (monthExpenses.length === 0) {
        canvas.style.display = 'none';
        noChartMsg.classList.remove('hidden');
        if (monthChartInstance) {
            monthChartInstance.destroy();
            monthChartInstance = null;
        }
        return;
    }

    canvas.style.display = 'block';
    noChartMsg.classList.add('hidden');

    // Calcola totale spese per categoria nel mese corrente
    const categoryTotals = {};
    monthExpenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    // Color palette moderna
    const backgroundColors = [
        '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'
    ];

    if (monthChartInstance) {
        monthChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    monthChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            return ` ${context.label}: ${formatCurrency(val)}`;
                        }
                    }
                }
            }
        }
    });
}

// Rendering lista transazioni con filtri
function renderTransactions() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const typeFilter = filterType.value;

    const filtered = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm) || 
                              t.category.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    transactionsList.innerHTML = '';

    if (filtered.length === 0) {
        noTransactionsEl.style.display = 'block';
    } else {
        noTransactionsEl.style.display = 'none';

        // Ordina per data decrescente (più recenti in alto)
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        filtered.forEach(t => {
            const tr = document.createElement('tr');

            const isIncome = t.type === 'income';
            const badgeClass = isIncome ? 'tag-income' : 'tag-expense';
            const amountClass = isIncome ? 'amount-income' : 'amount-expense';
            const sign = isIncome ? '+' : '-';

            tr.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td><strong>${t.description}</strong></td>
                <td>${t.category}</td>
                <td><span class="tag-badge ${badgeClass}">${isIncome ? 'Entrata' : 'Uscita'}</span></td>
                <td class="${amountClass}">${sign} ${formatCurrency(t.amount)}</td>
                <td>
                    <button class="btn-delete" onclick="deleteTransaction('${t.id}')" title="Elimina">🗑️</button>
                </td>
            `;
            transactionsList.appendChild(tr);
        });
    }
}

// Rendering ripartizione spese generali per categoria (ProgressBar)
function renderCategoryBreakdown() {
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        categoryBreakdownEl.innerHTML = '<p class="empty-msg">Nessuna spesa registrata per mostrare la ripartizione.</p>';
        return;
    }

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    categoryBreakdownEl.innerHTML = '';

    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([category, sum]) => {
        const percentage = totalExpense > 0 ? ((sum / totalExpense) * 100).toFixed(1) : 0;

        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <div class="category-info">
                <span>${category}</span>
                <span>${formatCurrency(sum)} (${percentage}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        categoryBreakdownEl.appendChild(item);
    });
}

// Aggiungi nuova transazione
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTransaction = {
        id: Date.now().toString(),
        description: descriptionInput.value.trim(),
        amount: parseFloat(amountInput.value),
        type: typeInput.value,
        category: categoryInput.value,
        date: dateInput.value
    };

    transactions.push(newTransaction);
    updateUI();

    // Reset form eccetto data
    descriptionInput.value = '';
    amountInput.value = '';
    descriptionInput.focus();
});

// Elimina transazione
function deleteTransaction(id) {
    if (confirm('Sei sicuro di voler eliminare questa transazione?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    }
}

// Eventi Filtri e Ricerca
searchInput.addEventListener('input', renderTransactions);
filterType.addEventListener('change', renderTransactions);

// Cancella tutti i dati
clearBtn.addEventListener('click', () => {
    if (transactions.length === 0) return;
    if (confirm('ATTENZIONE: Sei sicuro di voler cancellare TUTTI i dati salvati? Questa azione è irreversibile.')) {
        transactions = [];
        updateUI();
    }
});

// ===== CALENDARIO SETTIMANALE / MENSILE =====
const calGrid = document.getElementById('cal-grid');
const calPrev = document.getElementById('cal-prev');
const calNext = document.getElementById('cal-next');
const calRange = document.getElementById('cal-range');
const calStatus = document.getElementById('cal-status');
const calSummary = document.getElementById('cal-summary');
const calChart = document.getElementById('cal-chart');
const calChartTitle = document.getElementById('cal-chart-title');
const calToggleBtn = document.getElementById('cal-toggle');
const mainGridEl = document.querySelector('.main-grid');
const historySectionEl = document.querySelector('.history-section');
const dowNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

let calView = 'week';                    // 'week' = settimana | 'month' = mese
let calAnchor = startOfDay(new Date());  // una data qualsiasi dentro il periodo mostrato

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function getToday() { return startOfDay(new Date()); }
function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function round2(n) { return Math.round(n * 100) / 100; }
// Settimana italiana: inizia di lunedì
function startOfWeek(d) { return addDays(startOfDay(d), -((d.getDay() + 6) % 7)); }

// Data che decide a quale mese appartiene la settimana mostrata:
// il giovedì della settimana, ma mai una data futura (per la settimana corrente vale oggi).
function getWeekRefDate(anchor) {
    const thursday = addDays(startOfWeek(anchor), 3);
    const today = getToday();
    return thursday > today ? today : thursday;
}

// Importo compatto per le celle del mese (12500 -> 12,5k)
function formatShort(n) {
    const abs = Math.abs(n);
    if (abs >= 10000) return (abs / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + 'k';
    return abs.toLocaleString('it-IT', {
        minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
        maximumFractionDigits: 2
    });
}

// Entrate e uscite raggruppate per giorno
function getDailyTotals() {
    const map = {};
    transactions.forEach(t => {
        if (!t.date) return;
        const e = map[t.date] || (map[t.date] = { income: 0, expense: 0 });
        if (t.type === 'income') e.income += t.amount; else e.expense += t.amount;
    });
    return map;
}

// Totali di un mese intero
function getMonthTotals(year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let income = 0, expense = 0;
    transactions.forEach(t => {
        if (!t.date || !t.date.startsWith(prefix)) return;
        if (t.type === 'income') income += t.amount; else expense += t.amount;
    });
    return { income: round2(income), expense: round2(expense), balance: round2(income - expense) };
}

// Si può andare avanti solo se non siamo già nella settimana (o nel mese) corrente
function canGoForward() {
    const today = getToday();
    if (calView === 'week') {
        return startOfWeek(calAnchor) < startOfWeek(today);
    }
    return calAnchor.getFullYear() < today.getFullYear() ||
        (calAnchor.getFullYear() === today.getFullYear() && calAnchor.getMonth() < today.getMonth());
}

function calNavigate(dir) {
    if (dir > 0 && !canGoForward()) return;
    const today = getToday();
    let next;
    if (calView === 'week') {
        next = addDays(calAnchor, 7 * dir);
    } else {
        next = new Date(calAnchor.getFullYear(), calAnchor.getMonth() + dir, 1);
        if (next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()) next = today;
    }
    calAnchor = next > today ? today : next;
    renderCalendar();
}

function toggleCalView() {
    if (calView === 'week') {
        calAnchor = getWeekRefDate(calAnchor); // il mese della settimana che stavi guardando
        calView = 'month';
    } else {
        calView = 'week';
    }
    renderCalendar();
}

function dayClasses(d, tot, today) {
    const cls = ['cal-day'];
    const net = round2(tot.income - tot.expense);
    if (dateKey(d) === dateKey(today)) cls.push('today');
    if (d > today) cls.push('future');
    if (net > 0) cls.push('net-pos'); else if (net < 0) cls.push('net-neg');
    return cls;
}

// Cella della vista settimana: etichette e importi completi
function weekCellHTML(d, totals, today) {
    const key = dateKey(d);
    const tot = totals[key] || { income: 0, expense: 0 };
    const cls = dayClasses(d, tot, today).concat('week');
    return `<div class="${cls.join(' ')}">
        <div class="cal-day-head">
            <span class="cal-dow">${dowNames[(d.getDay() + 6) % 7]}</span>
            <span class="cal-date">${d.getDate()}</span>
        </div>
        <div class="cal-line cal-in${tot.income ? '' : ' zero'}">
            <span class="cal-lbl">Entrate</span>
            <span class="cal-val">+ ${formatCurrency(tot.income)}</span>
        </div>
        <div class="cal-line cal-out${tot.expense ? '' : ' zero'}">
            <span class="cal-lbl">Uscite</span>
            <span class="cal-val">- ${formatCurrency(tot.expense)}</span>
        </div>
    </div>`;
}

// Cella della vista mese: compatta
function monthCellHTML(d, totals, today) {
    const key = dateKey(d);
    const tot = totals[key] || { income: 0, expense: 0 };
    const cls = dayClasses(d, tot, today).concat('compact');
    return `<div class="${cls.join(' ')}" title="${formatDate(key)} — Entrate: ${formatCurrency(tot.income)} · Uscite: ${formatCurrency(tot.expense)}">
        <span class="cal-date">${d.getDate()}</span>
        <span class="cal-mini cal-in${tot.income ? '' : ' zero'}">+${formatShort(tot.income)}</span>
        <span class="cal-mini cal-out${tot.expense ? '' : ' zero'}">-${formatShort(tot.expense)}</span>
    </div>`;
}

function renderCalendar() {
    const today = getToday();
    const totals = getDailyTotals();
    const isWeek = calView === 'week';

    // Mese di cui mostrare il saldo
    const ref = isWeek ? getWeekRefDate(calAnchor) : calAnchor;
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const m = getMonthTotals(year, month);

    // Verdetto in alto al centro: saldo del mese positivo / negativo
    let kind, verdict;
    if (m.balance > 0) { kind = 'positive'; verdict = `✅ POSITIVO · + ${formatCurrency(m.balance)}`; }
    else if (m.balance < 0) { kind = 'negative'; verdict = `🔻 NEGATIVO · - ${formatCurrency(Math.abs(m.balance))}`; }
    else { kind = 'neutral'; verdict = `⚖️ IN PARI · ${formatCurrency(0)}`; }
    calStatus.className = `cal-status ${kind}`;
    calStatus.innerHTML = `<span class="cal-status-label">Saldo di ${monthNames[month]} ${year}</span>` +
                          `<span class="cal-status-value">${verdict}</span>`;

    if (isWeek) {
        const start = startOfWeek(calAnchor);
        const end = addDays(start, 6);
        const short = d => `${d.getDate()} ${monthNames[d.getMonth()].slice(0, 3).toLowerCase()}`;
        calRange.textContent = `Settimana dal ${short(start)} al ${short(end)} ${end.getFullYear()}`;

        let cells = '';
        for (let i = 0; i < 7; i++) cells += weekCellHTML(addDays(start, i), totals, today);
        calGrid.innerHTML = cells;
        calGrid.className = 'cal-grid week-grid clickable-grid';
        calGrid.setAttribute('role', 'button');
        calGrid.setAttribute('tabindex', '0');
        calGrid.title = 'Clicca per vedere il mese';
        calSummary.classList.add('hidden');
        calSummary.innerHTML = '';
        calChart.classList.add('hidden');
        if (monthChartInstance) { monthChartInstance.destroy(); monthChartInstance = null; }
        calToggleBtn.textContent = '📅 Vedi mese';
    } else {
        calRange.textContent = `Mese di ${monthNames[month]} ${year}`;

        const first = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let cells = dowNames.map(n => `<div class="cal-dow-head">${n}</div>`).join('');
        for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells += '<div class="cal-day compact empty"></div>';
        for (let day = 1; day <= daysInMonth; day++) cells += monthCellHTML(new Date(year, month, day), totals, today);
        calGrid.innerHTML = cells;
        calGrid.className = 'cal-grid';
        calGrid.removeAttribute('role');
        calGrid.removeAttribute('tabindex');
        calGrid.removeAttribute('title');

        const balClass = m.balance > 0 ? 'pos' : (m.balance < 0 ? 'neg' : '');
        calSummary.innerHTML = `
            <div class="mini-card mini-card-income"><h4>Entrate Mese</h4><p class="mini-amount">+ ${formatCurrency(m.income)}</p></div>
            <div class="mini-card mini-card-expense"><h4>Uscite Mese</h4><p class="mini-amount">- ${formatCurrency(m.expense)}</p></div>
            <div class="mini-card mini-card-balance ${balClass}"><h4>Risultato Mese</h4><p class="mini-amount">${m.balance > 0 ? '+ ' : (m.balance < 0 ? '- ' : '')}${formatCurrency(Math.abs(m.balance))}</p></div>`;
        calSummary.classList.remove('hidden');

        // Grafico delle spese del mese, in fondo (prima il contenitore visibile, poi il disegno)
        calChart.classList.remove('hidden');
        calChartTitle.textContent = `📊 Spese di ${monthNames[month]} ${year} per categoria`;
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthTx = transactions.filter(t => t.date && t.date.startsWith(prefix));
        if (typeof Chart !== 'undefined') renderMonthChart(monthTx);
        calToggleBtn.textContent = '↩ Torna alla settimana';
    }

    // Dentro il calendario (vista mese) nascondo form, ripartizione e storico
    mainGridEl.classList.toggle('hidden', !isWeek);
    historySectionEl.classList.toggle('hidden', !isWeek);

    // Avanti disattivato se sei già alla settimana (o al mese) corrente
    const fwd = canGoForward();
    calNext.disabled = !fwd;
    calNext.title = fwd ? 'Vai avanti' : (isWeek ? 'Sei già nella settimana corrente' : 'Sei già nel mese corrente');
    calPrev.title = isWeek ? 'Settimana precedente' : 'Mese precedente';
}

function setupCalendar() {
    calPrev.addEventListener('click', () => calNavigate(-1));
    calNext.addEventListener('click', () => calNavigate(1));
    calToggleBtn.addEventListener('click', toggleCalView);
    // Clic sul calendario (vista settimana) -> mostra il mese corrente
    calGrid.addEventListener('click', () => { if (calView === 'week') toggleCalView(); });
    calGrid.addEventListener('keydown', (e) => {
        if (calView === 'week' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleCalView();
        }
    });
}

// Avvia l'app al caricamento
initApp();
