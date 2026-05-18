/**
 * AssetFlow - Personal Asset Management Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. 초기 상태 및 데이터 관리 ===
    const STORAGE_KEY = 'assetflow_transactions';
    const THEME_KEY = 'assetflow_theme';
    const BUDGET_KEY = 'assetflow_budget';
    const ACCOUNTS_KEY = 'assetflow_accounts';
    const FIXED_EXPENSES_KEY = 'assetflow_fixed_expenses';
    
    // 데이터 초기화
    const initData = (key, defaultData) => {
        const stored = localStorage.getItem(key);
        if (!stored) {
            localStorage.setItem(key, JSON.stringify(defaultData));
            return defaultData;
        }
        return JSON.parse(stored);
    };

    const today = new Date();
    const getStr = (d) => d.toISOString().split('T')[0];
    const prev1 = new Date(); prev1.setMonth(prev1.getMonth() - 1);
    const prev2 = new Date(); prev2.setMonth(prev2.getMonth() - 2);

    const defaultTransactions = [
        { id: Date.now() + 1, type: 'income', amount: 3000000, category: '급여', date: getStr(today), memo: '이번달 급여' },
        { id: Date.now() + 2, type: 'expense', amount: 45000, category: '식비', date: getStr(today), memo: '점심 식사' },
        { id: Date.now() + 5, type: 'income', amount: 3000000, category: '급여', date: getStr(prev1), memo: '지난달 급여' },
        { id: Date.now() + 6, type: 'expense', amount: 450000, category: '식비', date: getStr(prev1), memo: '외식' }
    ];

    const defaultAccounts = [
        { id: Date.now() + 10, type: '예금', bank: '신한은행', name: '청년도약계좌', amount: 5000000 }
    ];

    const defaultFixedExpenses = [
        { id: Date.now() + 20, name: '넷플릭스', amount: 17000, category: '문화', day: 15, startDate: getStr(prev2), isActive: true, endDate: null }
    ];

    let transactions = initData(STORAGE_KEY, defaultTransactions);
    let accounts = initData(ACCOUNTS_KEY, defaultAccounts);
    let fixedExpenses = initData(FIXED_EXPENSES_KEY, defaultFixedExpenses);

    let chartInstance = null;
    let trendChartInstance = null;
    let currentCalendarDate = new Date();

    // === 고정 지출 자동 생성 로직 ===
    const processFixedExpenses = () => {
        let changed = false;
        const currentDate = new Date();
        
        fixedExpenses.forEach(fe => {
            const start = new Date(fe.startDate);
            const end = fe.isActive ? currentDate : new Date(fe.endDate);
            
            let currentCheck = new Date(start.getFullYear(), start.getMonth(), 1);
            const endCheck = new Date(end.getFullYear(), end.getMonth(), 1);

            while (currentCheck <= endCheck) {
                const year = currentCheck.getFullYear();
                const month = String(currentCheck.getMonth() + 1).padStart(2, '0');
                const checkDay = parseInt(fe.day);
                const paymentDate = new Date(year, currentCheck.getMonth(), checkDay);
                
                if (paymentDate >= start && paymentDate <= end && paymentDate <= currentDate) {
                    const monthKey = `${year}-${month}`;
                    const exists = transactions.some(t => t.fixedExpenseId === fe.id && t.feMonth === monthKey);
                    
                    if (!exists) {
                        transactions.push({
                            id: Date.now() + Math.random(),
                            type: 'expense',
                            amount: parseInt(fe.amount),
                            category: fe.category,
                            date: getStr(paymentDate),
                            memo: `[고정] ${fe.name}`,
                            fixedExpenseId: fe.id,
                            feMonth: monthKey
                        });
                        changed = true;
                    }
                }
                currentCheck.setMonth(currentCheck.getMonth() + 1);
            }
        });

        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        }
    };
    
    processFixedExpenses();

    // === 2. DOM 요소 선택 ===
    const htmlEl = document.documentElement;
    const themeToggleBtn = document.getElementById('themeToggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    
    // 모달 및 폼
    const addBtn = document.getElementById('addBtn');
    const addModal = document.getElementById('addModal');
    const closeModal = document.getElementById('closeModal');
    const transactionForm = document.getElementById('transactionForm');

    // index.html DOM
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const recentListEl = document.getElementById('recentList');
    const expenseChartCtx = document.getElementById('expenseChart');
    const noDataMessage = document.getElementById('noDataMessage');
    const trendChartCtx = document.getElementById('trendChart');
    const noTrendDataMessage = document.getElementById('noTrendDataMessage');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    
    // details.html DOM
    const fullListEl = document.getElementById('fullList');
    const listCountEl = document.getElementById('listCount');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const searchInput = document.getElementById('searchInput');
    const emptyStateMessage = document.getElementById('emptyStateMessage');
    
    // assets.html DOM
    const assetListEl = document.getElementById('assetList');
    const fixedExpenseListEl = document.getElementById('fixedExpenseList');
    const openAssetBtn = document.getElementById('openAssetBtn');
    const openFixedExpenseBtn = document.getElementById('openFixedExpenseBtn');
    const assetModal = document.getElementById('assetModal');
    const closeAssetModal = document.getElementById('closeAssetModal');
    const assetForm = document.getElementById('assetForm');
    const fixedExpenseModal = document.getElementById('fixedExpenseModal');
    const closeFixedExpenseModal = document.getElementById('closeFixedExpenseModal');
    const fixedExpenseForm = document.getElementById('fixedExpenseForm');

    // === 3. 유틸리티 함수 ===
    const formatCurrency = (amount) => new Intl.NumberFormat('ko-KR').format(amount);
    const getCategoryEmoji = (category) => {
        const map = { '식비': '🍔', '교통': '🚌', '쇼핑': '🛍️', '주거': '🏠', '문화': '🍿', '급여': '💰', '기타': '✨' };
        return map[category] || '✨';
    };
    const getChartColors = () => {
        const isDark = htmlEl.getAttribute('data-theme') === 'dark';
        return { textColor: isDark ? '#f8fafc' : '#1e293b', gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' };
    };
    const createTransactionHTML = (t) => {
        const isIncome = t.type === 'income';
        const sign = isIncome ? '+' : '-';
        return `
            <li class="transaction-item" data-id="${t.id}">
                <div class="item-info">
                    <div class="item-icon">${getCategoryEmoji(t.category)}</div>
                    <div class="item-details">
                        <h4>${t.memo || t.category}</h4>
                        <span class="item-date">${t.date} · ${t.category}</span>
                    </div>
                </div>
                <div class="item-amount-action">
                    <span class="item-amount ${t.type}">${sign} ${formatCurrency(t.amount)} 원</span>
                    <button class="delete-btn" aria-label="삭제" data-id="${t.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </li>
        `;
    };

    // === 4. UI 렌더링 로직 ===
    const updateSummary = () => {
        if (!totalBalanceEl) return;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const baseAssetsTotal = accounts.reduce((sum, a) => sum + parseInt(a.amount), 0);
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseInt(t.amount), 0);
        const totalExp = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseInt(t.amount), 0);
        
        const balance = baseAssetsTotal + (totalIncome - totalExp);
        const thisMonthIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + parseInt(t.amount), 0);
        const thisMonthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((sum, t) => sum + parseInt(t.amount), 0);

        totalIncomeEl.textContent = `+ ${formatCurrency(thisMonthIncome)} 원`;
        totalExpenseEl.textContent = `- ${formatCurrency(thisMonthExpense)} 원`;
        totalBalanceEl.textContent = `${formatCurrency(balance)} 원`;

        const budgetFill = document.getElementById('budgetFill');
        if (budgetFill) {
            let budget = localStorage.getItem(BUDGET_KEY) || 1000000;
            const percent = Math.min((thisMonthExpense / budget) * 100, 100);
            budgetFill.style.width = `${percent}%`;
            document.getElementById('budgetSpent').textContent = `${formatCurrency(thisMonthExpense)} 원`;
            document.getElementById('budgetTotal').textContent = `/ ${formatCurrency(budget)} 원`;
            if (percent >= 80) budgetFill.classList.add('warning');
            else budgetFill.classList.remove('warning');
        }
    };

    const updateRecentList = () => {
        if (!recentListEl) return;
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = sorted.slice(0, 5);
        if (recent.length === 0) {
            recentListEl.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">최근 거래 내역이 없습니다.</li>';
            return;
        }
        recentListEl.innerHTML = recent.map(createTransactionHTML).join('');
    };

    const updateFullList = () => {
        if (!fullListEl) return;
        let filtered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const typeVal = filterType ? filterType.value : 'all';
        const catVal = filterCategory ? filterCategory.value : 'all';
        const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

        if (typeVal !== 'all') filtered = filtered.filter(t => t.type === typeVal);
        if (catVal !== 'all') filtered = filtered.filter(t => t.category === catVal);
        if (searchVal !== '') {
            filtered = filtered.filter(t => (t.memo && t.memo.toLowerCase().includes(searchVal)) || t.amount.toString().includes(searchVal));
        }

        listCountEl.textContent = `${filtered.length}건`;
        if (filtered.length === 0) {
            fullListEl.style.display = 'none';
            emptyStateMessage.style.display = 'flex';
        } else {
            fullListEl.style.display = 'flex';
            emptyStateMessage.style.display = 'none';
            fullListEl.innerHTML = filtered.map(createTransactionHTML).join('');
        }
    };

    const updateChart = () => {
        if (!expenseChartCtx) return;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
        
        if (expenses.length === 0) {
            noDataMessage.style.display = 'block';
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            return;
        }
        noDataMessage.style.display = 'none';
        const categoryData = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + parseInt(t.amount);
            return acc;
        }, {});
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const { textColor } = getChartColors();
        const bgColors = ['#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#8b5cf6', '#f43f5e'];

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.options.plugins.legend.labels.color = textColor;
            chartInstance.update();
        } else {
            chartInstance = new Chart(expenseChartCtx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 10 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: textColor, font: { family: "'Pretendard', 'Outfit', sans-serif" }, padding: 20 } } } }
            });
        }
    };

    const updateTrendChart = () => {
        if (!trendChartCtx) return;
        if (transactions.length === 0) {
            noTrendDataMessage.style.display = 'block';
            if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
            return;
        }
        noTrendDataMessage.style.display = 'none';
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        const incomeData = months.map(m => transactions.filter(t => t.type === 'income' && t.date.startsWith(m)).reduce((sum, t) => sum + t.amount, 0));
        const expenseData = months.map(m => transactions.filter(t => t.type === 'expense' && t.date.startsWith(m)).reduce((sum, t) => sum + t.amount, 0));
        const { textColor, gridColor } = getChartColors();
        const monthLabels = months.map(m => `${parseInt(m.split('-')[1])}월`);

        if (trendChartInstance) {
            trendChartInstance.data.labels = monthLabels;
            trendChartInstance.data.datasets[0].data = incomeData;
            trendChartInstance.data.datasets[1].data = expenseData;
            trendChartInstance.options.scales.x.ticks.color = textColor;
            trendChartInstance.options.scales.y.ticks.color = textColor;
            trendChartInstance.options.scales.x.grid.color = gridColor;
            trendChartInstance.options.scales.y.grid.color = gridColor;
            trendChartInstance.options.plugins.legend.labels.color = textColor;
            trendChartInstance.update();
        } else {
            trendChartInstance = new Chart(trendChartCtx, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [
                        { label: '수입', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
                        { label: '지출', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { ticks: { color: textColor }, grid: { display: false } }, y: { ticks: { color: textColor }, grid: { color: gridColor, borderDash: [5, 5] } } },
                    plugins: { legend: { position: 'top', labels: { color: textColor, font: { family: "'Pretendard', 'Outfit', sans-serif" } } } }
                }
            });
        }
    };

    const updateAssetList = () => {
        if (!assetListEl) return;
        if (accounts.length === 0) {
            assetListEl.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">등록된 자산이 없습니다.</li>';
            return;
        }
        assetListEl.innerHTML = accounts.map(a => `
            <li class="transaction-item">
                <div class="item-info">
                    <div class="item-icon" style="background: var(--primary-color); color: white;">🏦</div>
                    <div class="item-details">
                        <h4>${a.name}</h4>
                        <span class="item-date">${a.bank} · ${a.type}</span>
                    </div>
                </div>
                <div class="item-amount-action">
                    <span class="item-amount">${formatCurrency(a.amount)} 원</span>
                </div>
            </li>
        `).join('');
    };

    const updateFixedExpenseList = () => {
        if (!fixedExpenseListEl) return;
        if (fixedExpenses.length === 0) {
            fixedExpenseListEl.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">등록된 고정 지출이 없습니다.</li>';
            return;
        }
        fixedExpenseListEl.innerHTML = fixedExpenses.map(fe => `
            <li class="transaction-item" data-id="${fe.id}">
                <div class="item-info">
                    <div class="item-icon">${getCategoryEmoji(fe.category)}</div>
                    <div class="item-details">
                        <h4>${fe.name} <span class="status-badge ${fe.isActive ? 'active' : 'stopped'}">${fe.isActive ? '활성' : '중단됨'}</span></h4>
                        <span class="item-date">매월 ${fe.day}일 · ${fe.category}</span>
                    </div>
                </div>
                <div class="item-amount-action">
                    <span class="item-amount expense">- ${formatCurrency(fe.amount)} 원</span>
                    ${fe.isActive ? `<button class="stop-btn" aria-label="중단하기" data-action="stop-fe" data-id="${fe.id}">중단</button>` : ''}
                </div>
            </li>
        `).join('');
    };

    const renderCalendar = () => {
        const calendarDaysEl = document.getElementById('calendarDays');
        if (!calendarDaysEl) return;

        calendarDaysEl.innerHTML = '';
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        document.getElementById('currentMonthYear').textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            calendarDaysEl.appendChild(emptyCell);
        }

        const dailyExpenses = {};
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const exp = transactions.filter(t => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            dailyExpenses[dateStr] = exp;
        }

        const validExpenses = Object.values(dailyExpenses).filter(e => e > 0);
        let maxExp = -1, minExp = Infinity;
        if (validExpenses.length > 0) {
            maxExp = Math.max(...validExpenses);
            minExp = Math.min(...validExpenses);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const exp = dailyExpenses[dateStr];
            if (exp > 0 && exp === maxExp) cell.classList.add('max-expense');
            else if (exp > 0 && exp === minExp) cell.classList.add('min-expense');
            
            let dateHtml = `<div class="cell-date ${dateStr === todayStr ? 'today' : ''}">${i}</div>`;
            const dayTx = transactions.filter(t => t.date === dateStr);
            const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

            if (inc > 0) dateHtml += `<div class="cell-amount income">+${formatCurrency(inc)}</div>`;
            if (exp > 0) dateHtml += `<div class="cell-amount expense">-${formatCurrency(exp)}</div>`;

            cell.innerHTML = dateHtml;
            calendarDaysEl.appendChild(cell);
        }
    };

    const updateAll = () => {
        updateSummary();
        updateRecentList();
        updateFullList();
        updateChart();
        updateTrendChart();
        renderCalendar();
        updateAssetList();
        updateFixedExpenseList();
    };

    // === 5. 이벤트 핸들러 ===
    const initTheme = () => {
        if (localStorage.getItem(THEME_KEY) === 'dark') {
            htmlEl.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    };
    
    themeToggleBtn.addEventListener('click', () => {
        const next = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        sunIcon.style.display = next === 'dark' ? 'none' : 'block';
        moonIcon.style.display = next === 'dark' ? 'block' : 'none';
        updateChart();
        updateTrendChart();
    });

    mobileMenuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));

    if (setBudgetBtn) {
        setBudgetBtn.addEventListener('click', () => {
            const current = localStorage.getItem(BUDGET_KEY) || 1000000;
            const res = prompt('이번 달 목표 예산을 입력하세요 (원):', current);
            if (res && !isNaN(res)) {
                localStorage.setItem(BUDGET_KEY, res);
                updateSummary();
            }
        });
    }

    // 모달 관리 공통 (거래 추가)
    if (addBtn && addModal) {
        const closeModalHandler = () => { addModal.classList.remove('active'); transactionForm.reset(); document.getElementById('date').value = new Date().toISOString().split('T')[0]; };
        addBtn.addEventListener('click', () => addModal.classList.add('active'));
        if(closeModal) closeModal.addEventListener('click', closeModalHandler);
        addModal.addEventListener('click', (e) => { if (e.target === addModal) closeModalHandler(); });
        const dateInput = document.getElementById('date');
        if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="type"]:checked').value;
            const amount = document.getElementById('amount').value;
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const memo = document.getElementById('memo').value;

            transactions.push({ id: Date.now(), type, amount: parseInt(amount), category, date, memo });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
            updateAll();
            closeModalHandler();
        });
    }

    // 리스트 삭제 위임
    const handleDelete = (e) => {
        const btn = e.target.closest('.delete-btn');
        if (!btn) return;
        if(confirm('이 내역을 삭제하시겠습니까?')) {
            const id = parseInt(btn.dataset.id);
            transactions = transactions.filter(t => t.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
            updateAll();
        }
    };
    if (recentListEl) recentListEl.addEventListener('click', handleDelete);
    if (fullListEl) fullListEl.addEventListener('click', handleDelete);

    // 필터/검색
    if (filterType) filterType.addEventListener('change', updateFullList);
    if (filterCategory) filterCategory.addEventListener('change', updateFullList);
    if (searchInput) searchInput.addEventListener('keyup', updateFullList);

    // 자산 모달
    if (openAssetBtn) {
        openAssetBtn.addEventListener('click', () => assetModal.classList.add('active'));
        closeAssetModal.addEventListener('click', () => assetModal.classList.remove('active'));
        assetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            accounts.push({
                id: Date.now(),
                type: document.getElementById('assetType').value,
                bank: document.getElementById('assetBank').value,
                name: document.getElementById('assetName').value,
                amount: parseInt(document.getElementById('assetAmount').value)
            });
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
            assetModal.classList.remove('active');
            assetForm.reset();
            updateAll();
        });
    }

    // 고정지출 모달
    if (openFixedExpenseBtn) {
        openFixedExpenseBtn.addEventListener('click', () => fixedExpenseModal.classList.add('active'));
        closeFixedExpenseModal.addEventListener('click', () => fixedExpenseModal.classList.remove('active'));
        fixedExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            fixedExpenses.push({
                id: Date.now(),
                name: document.getElementById('feName').value,
                amount: parseInt(document.getElementById('feAmount').value),
                category: document.getElementById('feCategory').value,
                day: parseInt(document.getElementById('feDay').value),
                startDate: document.getElementById('feStart').value,
                isActive: true,
                endDate: null
            });
            localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
            fixedExpenseModal.classList.remove('active');
            fixedExpenseForm.reset();
            processFixedExpenses();
            updateAll();
        });
        
        fixedExpenseListEl.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'stop-fe') {
                if (confirm('이 고정 지출을 중단하시겠습니까?\n이후 결제일부터는 내역이 생성되지 않습니다.')) {
                    const id = parseInt(e.target.dataset.id);
                    const fe = fixedExpenses.find(f => f.id === id);
                    if (fe) {
                        fe.isActive = false;
                        fe.endDate = getStr(new Date());
                        localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
                        updateAll();
                    }
                }
            }
        });
    }

    // 달력 네비게이션
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(); });
    }

    // === 6. 초기 구동 ===
    initTheme();
    updateAll();
});
