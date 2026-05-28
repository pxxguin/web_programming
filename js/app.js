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
    const SAVINGS_GOALS_KEY = 'assetflow_savings_goals';

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

    const defaultGoals = [
        { id: Date.now() + 30, name: '맥북 프로 구매', target: 3000000, current: 1500000 }
    ];
    let savingsGoals = initData(SAVINGS_GOALS_KEY, defaultGoals);

    let chartInstance = null;
    let trendChartInstance = null;
    let currentCalendarDate = new Date();

    let editAssetId = null;
    let editGoalId = null;
    let editFeId = null;
    let editTxId = null;

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
    const drillDownContainer = document.getElementById('drillDownContainer');
    const drillDownTitle = document.getElementById('drillDownTitle');
    const drillDownList = document.getElementById('drillDownList');
    const closeDrillDown = document.getElementById('closeDrillDown');

    if (closeDrillDown) {
        closeDrillDown.addEventListener('click', () => {
            if (drillDownContainer) drillDownContainer.style.display = 'none';
        });
    }

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

    const goalListEl = document.getElementById('goalList');
    const openGoalBtn = document.getElementById('openGoalBtn');
    const goalModal = document.getElementById('goalModal');
    const closeGoalModal = document.getElementById('closeGoalModal');
    const goalForm = document.getElementById('goalForm');

    const dailyDetailsModal = document.getElementById('dailyDetailsModal');
    const closeDailyDetailsModal = document.getElementById('closeDailyDetailsModal');
    const dailyDetailsTitle = document.getElementById('dailyDetailsTitle');
    const dailyDetailsList = document.getElementById('dailyDetailsList');

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
                    <button class="edit-btn" aria-label="수정" data-action="edit-tx" data-id="${t.id}">✏️</button>
                    <button class="delete-btn" aria-label="삭제" data-action="delete-tx" data-id="${t.id}">
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

        // 이전 달 대비 트렌드 계산
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const todayDay = String(now.getDate()).padStart(2, '0');
        const lastMonthEnd = `${lastMonthStr}-${todayDay}`;

        const lastMonthIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(lastMonthStr) && t.date <= lastMonthEnd).reduce((sum, t) => sum + parseInt(t.amount), 0);
        const lastMonthExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(lastMonthStr) && t.date <= lastMonthEnd).reduce((sum, t) => sum + parseInt(t.amount), 0);

        const calcTrend = (current, previous, isIncome) => {
            if (previous === 0) return { text: '비교 데이터 없음', class: 'neutral' };
            const diff = current - previous;
            const percent = Math.abs(Math.round((diff / previous) * 100));
            if (diff > 0) return { text: `지난달 동기 대비 ${percent}% 증가 ⬆️`, class: isIncome ? 'good' : 'bad' };
            if (diff < 0) return { text: `지난달 동기 대비 ${percent}% 감소 ⬇️`, class: isIncome ? 'bad' : 'good' };
            return { text: '지난달 동기 대비 동일', class: 'neutral' };
        };

        const incomeTrendEl = document.getElementById('incomeTrend');
        if (incomeTrendEl) {
            const trend = calcTrend(thisMonthIncome, lastMonthIncome, true);
            incomeTrendEl.textContent = trend.text;
            incomeTrendEl.className = `trend-indicator ${trend.class}`;
        }

        const expenseTrendEl = document.getElementById('expenseTrend');
        if (expenseTrendEl) {
            const trend = calcTrend(thisMonthExpense, lastMonthExpense, false);
            expenseTrendEl.textContent = trend.text;
            expenseTrendEl.className = `trend-indicator ${trend.class}`;
        }

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
    
    document.addEventListener("DOMContentLoaded", function () {
    const savedTheme = localStorage.getItem("color-theme") || "light";
    document.documentElement.setAttribute("color-theme", savedTheme);
    });

    const toggleButton = document.querySelector('.dark-light-toggle');

    toggleButton.addEventListener('click', () => {      
    const currentTheme = document.documentElement.getAttribute("color-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("color-theme", newTheme);
    localStorage.setItem("color-theme", newTheme);
    });

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
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { color: textColor, font: { family: "'Pretendard', 'Outfit', sans-serif" }, padding: 20 } }
                    },
                    onClick: (e, elements) => {
                        if (elements.length > 0 && drillDownContainer) {
                            const index = elements[0].index;
                            const category = labels[index];
                            drillDownTitle.textContent = `${category} 상세내역`;

                            const filtered = expenses.filter(t => t.category === category).sort((a, b) => new Date(b.date) - new Date(a.date));
                            drillDownList.innerHTML = filtered.map(createTransactionHTML).join('');
                            drillDownContainer.style.display = 'block';
                        }
                    }
                }
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

    const updateAccountSelect = () => {
        const selects = document.querySelectorAll('#transactionAccount');
        selects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            let optionsHtml = '<option value="none">지정 안함 (현금)</option>';
            accounts.forEach(a => {
                optionsHtml += `<option value="${a.id}">${a.name} (${a.bank})</option>`;
            });
            select.innerHTML = optionsHtml;
            if ([...select.options].some(o => o.value === currentVal)) {
                select.value = currentVal;
            } else {
                select.value = 'none';
            }
        });
    };

    const updateAssetList = () => {
        updateAccountSelect();
        if (!assetListEl) return;
        if (accounts.length === 0) {
            assetListEl.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">등록된 자산이 없습니다.</li>';
            return;
        }
        assetListEl.innerHTML = accounts.map(a => {
            let interestHtml = '';
            if ((a.type === '적금' || a.type === '예금') && a.period && a.interestRate) {
                const rawInterest = a.amount * (a.interestRate / 100) * (a.period / 12);
                const afterTax = Math.floor(rawInterest * 0.846); // 15.4% 세금 제외
                interestHtml = `<div class="interest-info">✨ 만기 예상 이자(세후): +${formatCurrency(afterTax)} 원</div>`;
            }
            return `
            <li class="transaction-item" data-id="${a.id}">
                <div class="item-info">
                    <div class="item-icon" style="background: var(--primary-color); color: white;">🏦</div>
                    <div class="item-details">
                        <h4>${a.name}</h4>
                        <span class="item-date">${a.bank} · ${a.type} ${a.period ? `(${a.period}개월, ${a.interestRate}%)` : ''}</span>
                        ${interestHtml}
                    </div>
                </div>
                <div class="item-amount-action">
                    <span class="item-amount">${formatCurrency(a.amount)} 원</span>
                    <button class="edit-btn" aria-label="수정" data-action="edit-asset" data-id="${a.id}">✏️</button>
                    <button class="delete-btn" aria-label="삭제" data-action="delete-asset" data-id="${a.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </li>
            `;
        }).join('');
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
                    <button class="edit-btn" aria-label="수정" data-action="edit-fe" data-id="${fe.id}">✏️</button>
                    <button class="delete-btn" aria-label="삭제" data-action="delete-fe" data-id="${fe.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    ${fe.isActive ? `<button class="stop-btn" aria-label="중단하기" data-action="stop-fe" data-id="${fe.id}">중단</button>` : ''}
                </div>
            </li>
        `).join('');
    };

    const updateSavingsGoals = () => {
        if (!goalListEl) return;
        if (savingsGoals.length === 0) {
            goalListEl.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">등록된 저축 목표가 없습니다.</li>';
            return;
        }
        goalListEl.innerHTML = savingsGoals.map(g => {
            const percent = Math.min(Math.round((g.current / g.target) * 100), 100);
            return `
                <li class="transaction-item" style="flex-direction: column; align-items: stretch; gap: 0.5rem;" data-id="${g.id}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="item-info">
                            <div class="item-icon" style="background: var(--income-bg); color: var(--income-color);">🎯</div>
                            <div class="item-details">
                                <h4>${g.name}</h4>
                            </div>
                        </div>
                        <div class="item-amount-action">
                            <button class="edit-btn" aria-label="수정" data-action="edit-goal" data-id="${g.id}">✏️</button>
                            <button class="delete-btn" data-action="delete-goal" data-id="${g.id}" aria-label="삭제">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="goal-progress-container">
                        <div class="goal-stats">
                            <span>달성률 <strong>${percent}%</strong></span>
                            <span>${formatCurrency(g.current)} 원 / ${formatCurrency(g.target)} 원</span>
                        </div>
                        <div class="goal-bar">
                            <div class="goal-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                </li>
            `;
        }).join('');
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

            const exp = dailyExpenses[dateStr] || 0;
            if (exp > 0 && exp === maxExp) cell.classList.add('max-expense');
            else if (exp > 0 && exp === minExp) cell.classList.add('min-expense');

            if (exp === 0 && dateStr <= todayStr) {
                cell.classList.add('no-spend-day');
            }

            let dateHtml = `<div class="cell-date ${dateStr === todayStr ? 'today' : ''}">${i}</div>`;
            const dayTx = transactions.filter(t => t.date === dateStr);
            const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

            if (inc > 0) dateHtml += `<div class="cell-amount income">+${formatCurrency(inc)}</div>`;
            if (exp > 0) dateHtml += `<div class="cell-amount expense">-${formatCurrency(exp)}</div>`;

            cell.innerHTML = dateHtml;
            calendarDaysEl.appendChild(cell);
        }

        let currentStreak = 0;
        let maxStreak = 0;
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (dateStr > todayStr) break;
            
            const exp = dailyExpenses[dateStr] || 0;
            if (exp === 0) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        const streakBadge = document.getElementById('streakBadge');
        if (streakBadge) {
            if (maxStreak >= 1) {
                streakBadge.innerHTML = `🔥 이번 달 최대 무지출: ${maxStreak}일 연속`;
                streakBadge.style.display = 'inline-flex';
            } else {
                streakBadge.style.display = 'none';
            }
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
        updateSavingsGoals();
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

    // 모달 관리 공통 (거래 추가/수정)
    if (addBtn && addModal) {
        const closeModalHandler = () => { addModal.classList.remove('active'); transactionForm.reset(); document.getElementById('date').value = new Date().toISOString().split('T')[0]; editTxId = null; };
        addBtn.addEventListener('click', () => { editTxId = null; addModal.classList.add('active'); });
        if (closeModal) closeModal.addEventListener('click', closeModalHandler);
        addModal.addEventListener('click', (e) => { if (e.target === addModal) closeModalHandler(); });
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="type"]:checked').value;
            const amount = parseInt(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const memo = document.getElementById('memo').value;
            const accountInput = document.getElementById('transactionAccount');
            const accountId = accountInput ? accountInput.value : 'none';

            if (editTxId) {
                // 기존 내역 롤백
                const oldTx = transactions.find(t => t.id === editTxId);
                if (oldTx && oldTx.accountId && oldTx.accountId !== 'none') {
                    const oldAcc = accounts.find(a => a.id === parseInt(oldTx.accountId));
                    if (oldAcc) {
                        if (oldTx.type === 'income') oldAcc.amount -= oldTx.amount;
                        else if (oldTx.type === 'expense') oldAcc.amount += oldTx.amount;
                    }
                }
                
                if (oldTx) {
                    oldTx.type = type; oldTx.amount = amount; oldTx.category = category;
                    oldTx.date = date; oldTx.memo = memo; oldTx.accountId = accountId;
                }
            } else {
                transactions.push({ id: Date.now(), type, amount, category, date, memo, accountId });
            }

            // 새 금액 계좌에 반영
            if (accountId !== 'none') {
                const acc = accounts.find(a => a.id === parseInt(accountId));
                if (acc) {
                    if (type === 'income') acc.amount += amount;
                    else if (type === 'expense') acc.amount -= amount;
                }
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
            updateAll();
            closeModalHandler();
        });
    }

    // 내역 수정 및 삭제 이벤트 위임
    const handleTransactionAction = (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        
        if (btn.classList.contains('delete-btn') || btn.dataset.action === 'delete-tx') {
            if (confirm('이 내역을 삭제하시겠습니까?')) {
                const tx = transactions.find(t => t.id === id);
                if (tx && tx.accountId && tx.accountId !== 'none') {
                    const acc = accounts.find(a => a.id === parseInt(tx.accountId));
                    if (acc) {
                        if (tx.type === 'income') acc.amount -= tx.amount;
                        else if (tx.type === 'expense') acc.amount += tx.amount;
                    }
                }
                transactions = transactions.filter(t => t.id !== id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
                localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
                updateAll();
            }
        } else if (btn.classList.contains('edit-btn') || btn.dataset.action === 'edit-tx') {
            const tx = transactions.find(t => t.id === id);
            if (tx && addModal) {
                editTxId = tx.id;
                const typeRadio = document.getElementById(`type${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}`);
                if (typeRadio) typeRadio.checked = true;
                
                document.getElementById('amount').value = tx.amount;
                document.getElementById('category').value = tx.category;
                document.getElementById('date').value = tx.date;
                document.getElementById('memo').value = tx.memo || '';
                
                if (document.getElementById('transactionAccount')) {
                    document.getElementById('transactionAccount').value = tx.accountId || 'none';
                }
                addModal.classList.add('active');
            }
        }
    };
    
    if (recentListEl) recentListEl.addEventListener('click', handleTransactionAction);
    if (fullListEl) fullListEl.addEventListener('click', handleTransactionAction);

    // 필터/검색
    if (filterType) filterType.addEventListener('change', updateFullList);
    if (filterCategory) filterCategory.addEventListener('change', updateFullList);
    if (searchInput) searchInput.addEventListener('keyup', updateFullList);

    // 자산 모달
    const assetTypeSelect = document.getElementById('assetType');
    const assetInterestGroup = document.getElementById('assetInterestGroup');
    if (assetTypeSelect && assetInterestGroup) {
        assetTypeSelect.addEventListener('change', () => {
            if (assetTypeSelect.value === '적금' || assetTypeSelect.value === '예금') {
                assetInterestGroup.style.display = 'block';
            } else {
                assetInterestGroup.style.display = 'none';
            }
        });
    }

    if (openAssetBtn) {
        openAssetBtn.addEventListener('click', () => {
            editAssetId = null;
            assetForm.reset();
            if (assetInterestGroup) assetInterestGroup.style.display = 'none';
            assetModal.classList.add('active');
        });
        closeAssetModal.addEventListener('click', () => assetModal.classList.remove('active'));
        assetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('assetType').value;
            const bank = document.getElementById('assetBank').value;
            const name = document.getElementById('assetName').value;
            const amount = parseInt(document.getElementById('assetAmount').value);
            let period = null;
            let interestRate = null;
            if (type === '적금' || type === '예금') {
                period = parseInt(document.getElementById('assetPeriod').value) || 0;
                interestRate = parseFloat(document.getElementById('assetInterestRate').value) || 0;
            }

            if (editAssetId) {
                const a = accounts.find(a => a.id === editAssetId);
                if (a) {
                    a.type = type; a.bank = bank; a.name = name; a.amount = amount;
                    a.period = period; a.interestRate = interestRate;
                }
            } else {
                accounts.push({ id: Date.now(), type, bank, name, amount, period, interestRate });
            }
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
            assetModal.classList.remove('active');
            assetForm.reset();
            updateAll();
        });

        assetListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = parseInt(btn.dataset.id);
            if (btn.dataset.action === 'delete-asset') {
                if (confirm('이 자산을 삭제하시겠습니까?')) {
                    accounts = accounts.filter(a => a.id !== id);
                    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
                    updateAll();
                }
            } else if (btn.dataset.action === 'edit-asset') {
                const a = accounts.find(a => a.id === id);
                if (a) {
                    editAssetId = a.id;
                    document.getElementById('assetType').value = a.type;
                    document.getElementById('assetBank').value = a.bank;
                    document.getElementById('assetName').value = a.name;
                    document.getElementById('assetAmount').value = a.amount;
                    if (a.type === '적금' || a.type === '예금') {
                        if (assetInterestGroup) assetInterestGroup.style.display = 'block';
                        document.getElementById('assetPeriod').value = a.period || '';
                        document.getElementById('assetInterestRate').value = a.interestRate || '';
                    } else {
                        if (assetInterestGroup) assetInterestGroup.style.display = 'none';
                    }
                    assetModal.classList.add('active');
                }
            }
        });
    }

    // 고정지출 모달
    if (openFixedExpenseBtn) {
        openFixedExpenseBtn.addEventListener('click', () => {
            editFeId = null;
            fixedExpenseForm.reset();
            fixedExpenseModal.classList.add('active');
        });
        closeFixedExpenseModal.addEventListener('click', () => fixedExpenseModal.classList.remove('active'));
        fixedExpenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('feName').value;
            const amount = parseInt(document.getElementById('feAmount').value);
            const category = document.getElementById('feCategory').value;
            const day = parseInt(document.getElementById('feDay').value);
            const startDate = document.getElementById('feStart').value;
            const endDate = document.getElementById('feEnd').value || null;
            
            if (editFeId) {
                const fe = fixedExpenses.find(f => f.id === editFeId);
                if (fe) {
                    fe.name = name; fe.amount = amount; fe.category = category;
                    fe.day = day; fe.startDate = startDate;
                    if (endDate) {
                        fe.endDate = endDate;
                        fe.isActive = false;
                    } else {
                        fe.endDate = null;
                        fe.isActive = true;
                    }
                }
            } else {
                fixedExpenses.push({
                    id: Date.now(),
                    name, amount, category, day, startDate,
                    endDate,
                    isActive: !endDate
                });
            }
            localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
            fixedExpenseModal.classList.remove('active');
            fixedExpenseForm.reset();
            processFixedExpenses();
            updateAll();
        });

        fixedExpenseListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = parseInt(btn.dataset.id);
            if (btn.dataset.action === 'stop-fe') {
                if (confirm('이 고정 지출을 중단하시겠습니까?\n이후 결제일부터는 내역이 생성되지 않습니다.')) {
                    const fe = fixedExpenses.find(f => f.id === id);
                    if (fe) {
                        fe.isActive = false;
                        fe.endDate = getStr(new Date());
                        localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
                        updateAll();
                    }
                }
            } else if (btn.dataset.action === 'delete-fe') {
                if (confirm('이 고정 지출을 삭제하시겠습니까?\n이미 생성된 과거 거래 내역은 유지됩니다.')) {
                    fixedExpenses = fixedExpenses.filter(f => f.id !== id);
                    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(fixedExpenses));
                    updateAll();
                }
            } else if (btn.dataset.action === 'edit-fe') {
                const fe = fixedExpenses.find(f => f.id === id);
                if (fe) {
                    editFeId = fe.id;
                    document.getElementById('feName').value = fe.name;
                    document.getElementById('feAmount').value = fe.amount;
                    document.getElementById('feCategory').value = fe.category;
                    document.getElementById('feDay').value = fe.day;
                    document.getElementById('feStart').value = fe.startDate;
                    document.getElementById('feEnd').value = fe.endDate || '';
                    fixedExpenseModal.classList.add('active');
                }
            }
        });
    }

    // 저축 목표 모달
    if (openGoalBtn) {
        openGoalBtn.addEventListener('click', () => {
            editGoalId = null;
            goalForm.reset();
            goalModal.classList.add('active');
        });
        closeGoalModal.addEventListener('click', () => goalModal.classList.remove('active'));
        goalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('goalName').value;
            const target = parseInt(document.getElementById('goalTargetAmount').value);
            const current = parseInt(document.getElementById('goalCurrentAmount').value);
            
            if (editGoalId) {
                const g = savingsGoals.find(g => g.id === editGoalId);
                if (g) {
                    g.name = name; g.target = target; g.current = current;
                }
            } else {
                savingsGoals.push({ id: Date.now(), name, target, current });
            }
            
            localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(savingsGoals));
            goalModal.classList.remove('active');
            goalForm.reset();
            updateAll();
        });

        goalListEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const id = parseInt(btn.dataset.id);
            if (btn.dataset.action === 'delete-goal') {
                if (confirm('이 저축 목표를 삭제하시겠습니까?')) {
                    savingsGoals = savingsGoals.filter(g => g.id !== id);
                    localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(savingsGoals));
                    updateAll();
                }
            } else if (btn.dataset.action === 'edit-goal') {
                const g = savingsGoals.find(g => g.id === id);
                if (g) {
                    editGoalId = g.id;
                    document.getElementById('goalName').value = g.name;
                    document.getElementById('goalTargetAmount').value = g.target;
                    document.getElementById('goalCurrentAmount').value = g.current;
                    goalModal.classList.add('active');
                }
            }
        });
    }

    // 달력 날짜 클릭 모달
    const calendarDaysEl = document.getElementById('calendarDays');
    if (calendarDaysEl && dailyDetailsModal) {
        calendarDaysEl.addEventListener('click', (e) => {
            const cell = e.target.closest('.calendar-cell');
            if (!cell || cell.classList.contains('empty')) return;
            
            const dateText = cell.querySelector('.cell-date').textContent;
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth() + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dateText).padStart(2, '0')}`;
            
            dailyDetailsTitle.textContent = `${year}년 ${month}월 ${dateText}일 내역`;
            
            const dayTx = transactions.filter(t => t.date === dateStr);
            if (dayTx.length === 0) {
                dailyDetailsList.innerHTML = '<li style="text-align:center; padding: 2rem; color: var(--text-muted);">이 날의 내역이 없습니다.</li>';
            } else {
                dailyDetailsList.innerHTML = dayTx.map(createTransactionHTML).join('');
            }
            dailyDetailsModal.classList.add('active');
        });
        
        closeDailyDetailsModal.addEventListener('click', () => {
            dailyDetailsModal.classList.remove('active');
        });
        
        // 모달 배경 클릭 시 닫기
        dailyDetailsModal.addEventListener('click', (e) => { 
            if (e.target === dailyDetailsModal) {
                dailyDetailsModal.classList.remove('active');
            } 
        });
        
        // 동적으로 생성되는 수정/삭제 버튼 위임 (모달 내부)
        dailyDetailsList.addEventListener('click', handleTransactionAction);
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
