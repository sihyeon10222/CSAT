// ========================================
// CALENDAR MODULE
// ========================================

const Calendar = (() => {
    const container = document.getElementById('calendarContainer');
    const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
    let currentMonthElement = null;
    let todayButton = null;

    // 월 이름
    function getMonthName(year, month) {
        return `${year}년 ${month + 1}월`;
    }

    // 해당 월의 일수
    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    // 해당 월 1일의 요일 (0: 일요일)
    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    // 달력 그리드 생성
    function createMonthGrid(year, month, isCurrentMonth = false) {
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const monthDiv = document.createElement('div');
        monthDiv.className = 'calendar-month';
        monthDiv.dataset.year = year;
        monthDiv.dataset.month = month;

        // 월 제목
        const title = document.createElement('div');
        title.className = 'calendar-month-title';
        title.textContent = getMonthName(year, month);
        monthDiv.appendChild(title);

        // 그리드
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';

        // 요일 헤더
        WEEKDAYS.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            grid.appendChild(header);
        });

        // 빈 칸 (1일 전)
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }

        // 날짜들
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;

            // 요일에 따른 색상
            const dayOfWeek = (firstDay + day - 1) % 7;
            if (dayOfWeek === 0) dayDiv.classList.add('sunday');
            if (dayOfWeek === 6) dayDiv.classList.add('saturday');

            // 오늘 표시
            if (isCurrentMonth && day === todayDate && year === todayYear && month === todayMonth) {
                dayDiv.classList.add('today');
            }

            grid.appendChild(dayDiv);
        }

        monthDiv.appendChild(grid);
        return monthDiv;
    }

    // Today 버튼 생성
    function createTodayButton() {
        const section = container.closest('.calendar-section');
        if (!section) return;

        todayButton = document.createElement('button');
        todayButton.className = 'calendar-today-btn';
        todayButton.textContent = 'Today';
        todayButton.style.display = 'none';
        todayButton.addEventListener('click', scrollToCurrentMonth);
        section.appendChild(todayButton);
    }

    // 이번 달로 스크롤
    function scrollToCurrentMonth() {
        const todayElement = container.querySelector('.today');
        if (todayElement) {
            todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (currentMonthElement) {
            currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // 스크롤 이벤트 처리 (Today 버튼 표시/숨김)
    function handleScroll() {
        if (!currentMonthElement || !todayButton) return;

        const containerRect = container.getBoundingClientRect();
        const monthRect = currentMonthElement.getBoundingClientRect();

        // 이번 달이 보이지 않으면 Today 버튼 표시
        const isVisible = monthRect.top < containerRect.bottom && monthRect.bottom > containerRect.top;
        todayButton.style.display = isVisible ? 'none' : 'block';
    }

    // 달력 렌더링 (무한 스크롤용)
    function render() {
        if (!container) return;

        container.innerHTML = '';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // 전후 24개월 생성 (총 49개월)
        const MONTHS_BEFORE = 12;
        const MONTHS_AFTER = 36;

        for (let offset = -MONTHS_BEFORE; offset <= MONTHS_AFTER; offset++) {
            let year = currentYear;
            let month = currentMonth + offset;

            // 월 보정
            while (month < 0) {
                month += 12;
                year--;
            }
            while (month > 11) {
                month -= 12;
                year++;
            }

            const isCurrentMonth = (offset === 0);
            const monthGrid = createMonthGrid(year, month, isCurrentMonth);

            if (isCurrentMonth) {
                currentMonthElement = monthGrid;
            }

            container.appendChild(monthGrid);
        }

        // 초기 스크롤 위치를 '오늘' 날짜로 설정
        const todayElement = container.querySelector('.today');
        if (todayElement) {
            setTimeout(() => {
                todayElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 100);
        }
    }

    // 디바운스 함수 (성능 최적화)
    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // 초기화
    function init() {
        render();
        createTodayButton();

        // 스크롤 이벤트
        container?.addEventListener('scroll', debounce(handleScroll, 50));

        // 창 크기 변경 시 Today 버튼 위치 재확인
        window.addEventListener('resize', debounce(handleScroll, 200));
    }

    return { init };
})();

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Calendar.init);
} else {
    Calendar.init();
}
