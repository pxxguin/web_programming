/**
 * AssetFlow - Personal Asset Management Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // === 1. 초기 상태 및 데이터 관리 ===
    const STORAGE_KEY = 'assetflow_transactions';
    const THEME_KEY = 'assetflow_theme';
    const BUDGET_KEY = 'assetflow_budget';
    
    // 더미 데이터 초기화
    const initData = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            const today = new Date();
            const getStr = (d) => d.toISOString().split('T')[0];
            
            // Add some data for previous months to show trend
            const prev1 = new Date(); prev1.setMonth(prev1.getMonth() - 1);
            const prev2 = new Date(); prev2.setMonth(prev2.getMonth() - 2);

            const dummy = [
                { id: Date.now() + 1, type: 'income', amount: 3000000, category: '급여', date: getStr(today), memo: '이번달 급여' },
                { id: Date.now() + 2, type: 'expense', amount: 45000, category: '식비', date: getStr(today), memo: '점심 식사' },
                { id: Date.now() + 3, type: 'expense', amount: 120000, category: '쇼핑', date: getStr(today), memo: '여름 옷 구매' },
                { id: Date.now() + 4, type: 'expense', amount: 80000, category: '교통', date: getStr(today), memo: '교통카드 충전' },
                { id: Date.now() + 5, type: 'income', amount: 3000000, category: '급여', date: getStr(prev1), memo: '지난달 급여' },
                { id: Date.now() + 6, type: 'expense', amount: 450000, category: '식비', date: getStr(prev1), memo: '외식' },
                { id: Date.now() + 7, type: 'income', amount: 3000000, category: '급여', date: getStr(prev2), memo: '지지난달 급여' },
                { id: Date.now() + 8, type: 'expense', amount: 300000, category: '쇼핑', date: getStr(prev2), memo: '쇼핑' }
            ];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dummy));
            return dummy;
        }
        return JSON.parse(stored);
    };

    let transactions = initData();
    let chartInstance = null;
    let trendChartInstance = null;

    // Calendar State
    let currentCalendarDate = new Date();

    // === 2. DOM 요소 선택 ===
    // 공통/헤더
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
    
    // 대시보드 요약 (index.html 전용)
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const recentListEl = document.getElementById('recentList');
    const expenseChartCtx = document.getElementById('expenseChart');
    const noDataMessage = document.getElementById('noDataMessage');
    const trendChartCtx = document.getElementById('trendChart');
    const noTrendDataMessage = document.getElementById('noTrendDataMessage');

    // 예산 (index.html 전용)
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const budgetFill = document.getElementById('budgetFill');
    const budgetSpent = document.getElementById('budgetSpent');
    const budgetTotal = document.getElementById('budgetTotal');

    // 상세 리스트 (details.html 전용)
    const fullListEl = document.getElementById('fullList');
    const listCountEl = document.getElementById('listCount');
    const filterType = document.getElementById('filterType');
    const filterCategory = document.getElementById('filterCategory');
    const searchInput = document.getElementById('searchInput');
    const emptyStateMessage = document.getElementById('emptyStateMessage');

    // 달력 뷰 (calendar.html 전용)
    const calendarDaysEl = document.getElementById('calendarDays');
    const currentMonthYearEl = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');


    // === 3. 유틸리티 함수 ===
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const getCategoryEmoji = (category) => {
        const map = {
            '식비': '🍔', '교통': '🚌', '쇼핑': '🛍️', '주거': '🏠',
            '문화': '🍿', '급여': '💰', '기타': '✨'
        };
        return map[category] || '✨';
    };

    const getChartColors = () => {
        const isDark = htmlEl.getAttribute('data-theme') === 'dark';
        return {
            textColor: isDark ? '#f8fafc' : '#1e293b',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        };
    };

    // === 4. UI 렌더링 로직 ===
    
    // 예산 업데이트
    const updateBudget = (currentMonthExpense) => {
        if (!budgetFill) return;
        
        let budget = localStorage.getItem(BUDGET_KEY);
        if (!budget) {
            budget = 1000000; // 기본값 100만원
            localStorage.setItem(BUDGET_KEY, budget);
        }
        
        budget = parseInt(budget);
        const percent = Math.min((currentMonthExpense / budget) * 100, 100);
        
        budgetFill.style.width = `${percent}%`;
        budgetSpent.textContent = `${formatCurrency(currentMonthExpense)} 원`;
        budgetTotal.textContent = `/ ${formatCurrency(budget)} 원`;
        
        if (percent >= 80) {
            budgetFill.classList.add('warning');
        } else {
            budgetFill.classList.remove('warning');
        }
    };

    // 요약 카드 업데이트 (대시보드)
    const updateSummary = () => {
        if (!totalBalanceEl) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 총 자산 (모든 기간)
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseInt(t.amount), 0);
        const totalExp = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseInt(t.amount), 0);
        const balance = totalIncome - totalExp;

        // 이번 달 수입/지출
        const thisMonthIncome = transactions
            .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + parseInt(t.amount), 0);
            
        const thisMonthExpense = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
            .reduce((sum, t) => sum + parseInt(t.amount), 0);

        totalIncomeEl.textContent = `+ ${formatCurrency(thisMonthIncome)} 원`;
        totalExpenseEl.textContent = `- ${formatCurrency(thisMonthExpense)} 원`;
        totalBalanceEl.textContent = `${formatCurrency(balance)} 원`;

        updateBudget(thisMonthExpense);
    };

    // 개별 리스트 아이템 HTML 생성
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

    // 최근 거래 내역 업데이트 (대시보드)
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

    // 전체 리스트 업데이트 (상세페이지) - 검색 포함
    const updateFullList = () => {
        if (!fullListEl) return;

        let filtered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const typeVal = filterType.value;
        const catVal = filterCategory.value;
        const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';

        if (typeVal !== 'all') filtered = filtered.filter(t => t.type === typeVal);
        if (catVal !== 'all') filtered = filtered.filter(t => t.category === catVal);
        if (searchVal !== '') {
            filtered = filtered.filter(t => 
                (t.memo && t.memo.toLowerCase().includes(searchVal)) || 
                t.amount.toString().includes(searchVal)
            );
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

    // 카테고리 도넛 차트 업데이트
    const updateChart = () => {
        if (!expenseChartCtx) return;

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // 이번 달 지출만
        const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth));
        
        if (expenses.length === 0) {
            noDataMessage.style.display = 'block';
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
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
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { color: textColor, font: { family: "'Pretendard', 'Outfit', sans-serif" }, padding: 20 } }
                    }
                }
            });
        }
    };

    // 월별 추이 막대 차트 업데이트
    const updateTrendChart = () => {
        if (!trendChartCtx) return;

        if (transactions.length === 0) {
            noTrendDataMessage.style.display = 'block';
            if (trendChartInstance) {
                trendChartInstance.destroy();
                trendChartInstance = null;
            }
            return;
        }
        noTrendDataMessage.style.display = 'none';

        // 최근 6개월 계산
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        const incomeData = months.map(m => 
            transactions.filter(t => t.type === 'income' && t.date.startsWith(m))
                        .reduce((sum, t) => sum + t.amount, 0)
        );
        const expenseData = months.map(m => 
            transactions.filter(t => t.type === 'expense' && t.date.startsWith(m))
                        .reduce((sum, t) => sum + t.amount, 0)
        );

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
                    scales: {
                        x: { ticks: { color: textColor }, grid: { display: false } },
                        y: { ticks: { color: textColor }, grid: { color: gridColor, borderDash: [5, 5] } }
                    },
                    plugins: {
                        legend: { position: 'top', labels: { color: textColor, font: { family: "'Pretendard', 'Outfit', sans-serif" } } }
                    }
                }
            });
        }
    };

    // 달력 렌더링
    const renderCalendar = () => {
        if (!calendarDaysEl) return;

        calendarDaysEl.innerHTML = '';
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        currentMonthYearEl.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const todayStr = new Date().toISOString().split('T')[0];

        // 빈 칸(이전 달)
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            calendarDaysEl.appendChild(emptyCell);
        }

        // 날짜 셀
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            let dateHtml = `<div class="cell-date ${dateStr === todayStr ? 'today' : ''}">${i}</div>`;
            
            // 해당 날짜 데이터 집계
            const dayTx = transactions.filter(t => t.date === dateStr);
            const inc = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const exp = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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
    };


    // === 5. 이벤트 핸들러 ===
    
    // 테마 토글 (다크모드)
    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            htmlEl.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    };
    
    themeToggleBtn.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        
        htmlEl.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        
        if (next === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
        
        // 차트 업데이트
        updateChart();
        updateTrendChart();
    });

    mobileMenuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));

    // 예산 설정 (대시보드 전용)
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

    // 모달 관리
    const openModal = () => addModal.classList.add('active');
    const closeModalHandler = () => {
        addModal.classList.remove('active');
        transactionForm.reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    };

    addBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalHandler);
    addModal.addEventListener('click', (e) => { if (e.target === addModal) closeModalHandler(); });
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // 폼 제출
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

    // 리스트 삭제
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

    // 필터링 및 검색 이벤트
    if (filterType) filterType.addEventListener('change', updateFullList);
    if (filterCategory) filterCategory.addEventListener('change', updateFullList);
    if (searchInput) searchInput.addEventListener('keyup', updateFullList);

    // 달력 네비게이션
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // === 6. 초기 구동 ===
    initTheme();
    updateAll();
});
