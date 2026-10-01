// Stato dell'applicazione (Transazioni vuote di partenza)
let transactions = JSON.parse(localStorage.getItem('my_expenses_data')) || [];

// Elementi DOM
const form = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');

const transactionsList = document.getElementById('transactions-list');
const noTransactionsEl = document.getElementById('no-transactions');
const categoryBreakdownEl = document.getElementById('category-breakdown');

const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');

const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const clearBtn = document.getElementById('clear-btn');

// Data odierna di default per il campo Data
dateInput.valueAsDate = new Date();

// Inizializzazione App
function initApp() {
    updateUI();
}

// Aggiorna tutta l'interfaccia utente
function updateUI() {
    saveToLocalStorage();
    renderSummary();
    renderTransactions();
    renderCategoryBreakdown();
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

// Calcola e aggiorna le schede riassuntive
function renderSummary() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const balance = amounts.reduce((acc, item) => acc + item, 0);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    totalBalanceEl.textContent = formatCurrency(balance);
    totalIncomeEl.textContent = `+ ${formatCurrency(income)}`;
    totalExpenseEl.textContent = `- ${formatCurrency(expense)}`;
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

// Rendering ripartizione spese per categoria (ProgressBar)
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

    // Ordina categorie per spesa maggiore
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

// Esporta dati JSON
exportBtn.addEventListener('click', () => {
    if (transactions.length === 0) {
        alert('Nessun dato da esportare!');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gestione_spese_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

// Importa dati JSON
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                transactions = importedData;
                updateUI();
                alert('Dati importati con successo!');
            } else {
                alert('Formato file non valido.');
            }
        } catch (err) {
            alert('Errore nella lettura del file JSON.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
});

// Cancella tutti i dati
clearBtn.addEventListener('click', () => {
    if (transactions.length === 0) return;
    if (confirm('ATTENZIONE: Sei sicuro di voler cancellare TUTTI i dati salvati? Questa azione è irreversibile.')) {
        transactions = [];
        updateUI();
    }
});

// Avvia l'app al caricamento
initApp();
