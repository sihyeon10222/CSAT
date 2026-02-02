// 수능 일정
const CSAT_DATES = {
    2026: new Date(2025, 10, 13, 0, 0, 0, 0), // 2025-11-13 00:00
    2027: new Date(2026, 10, 19, 0, 0, 0, 0), // 2026-11-19 00:00
    2028: new Date(2027, 10, 18, 0, 0, 0, 0), // 2027-11-18 00:00
};

/**
 * [테스트용] 현재 날짜 설정
 * 값을 넣으면 해당 날짜를 '현재'로 인식하여 카운트다운합니다.
 * null로 두면 실제 현재 시스템 시간을 사용합니다.
 * 예: new Date(2026, 10, 1, 10, 0, 0) // 2026년 11월 1일 오전 10시
 */
const DEBUG_DATE = null;

function getNow() {
    if (DEBUG_DATE) {
        // 실제 시간의 흐름을 반영하려면 (DEBUG_DATE + 페이지 로드 후 경과 시간)으로 계산 가능하지만,
        // 단순 테스트를 위해 우선 고정된 DEBUG_DATE를 반환합니다.
        return new Date(DEBUG_DATE);
    }
    return new Date();
}

// DOM Elements
const elements = {
    pastUnified: document.getElementById('pastUnified'),
    pastDaysAgo: document.getElementById('pastDaysAgo'),
    upcomingUnified: document.getElementById('upcomingUnified'),
    upcomingWeekends: document.getElementById('upcomingWeekends'),
    nextUnified: document.getElementById('nextUnified'),
    nextWeekends: document.getElementById('nextWeekends'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    milestonesContainer: document.getElementById('milestonesContainer'),
    themeToggle: document.getElementById('themeToggle'),
};

const MOCK_EXAMS = [
    { date: new Date(2026, 2, 24), label: "3월 학평" },
    { date: new Date(2026, 5, 4), label: "6월 모평" },
    { date: new Date(2026, 8, 2), label: "9월 모평" },
];

// 주말 카운팅 함수
function countWeekends(targetDate) {
    const now = getNow();

    // 이미 지난 날짜면 0 반환
    if (now >= targetDate) {
        return 0;
    }

    let weekendCount = 0;
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    // 현재 날짜의 요일 확인
    const todayDay = current.getDay();

    // 오늘이 토요일(6) 또는 일요일(0)인 경우, 이번 주말을 카운트
    // 그 외의 경우는 다음 주말부터 카운트

    while (current < target) {
        const dayOfWeek = current.getDay();

        // 토요일을 만났을 때 주말 1회로 카운트
        // (토요일에서 시작하거나, 일요일에서 시작해도 해당 주말은 카운트)
        if (dayOfWeek === 6) {
            // 토요일이 수능일 이전이면 카운트
            const sunday = new Date(current);
            sunday.setDate(sunday.getDate() + 1);

            if (current < target) {
                weekendCount++;
            }
        }

        current.setDate(current.getDate() + 1);
    }

    // 오늘이 일요일인 경우 추가 체크
    if (todayDay === 0) {
        // 오늘이 일요일이면 이번 주말도 카운트 (위 로직에서 토요일만 체크하므로)
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        if (today < target) {
            weekendCount++;
        }
    }

    return weekendCount;
}

// 더 정확한 주말 카운팅 함수
function countWeekendsAccurate(targetDate) {
    const now = getNow();

    if (now >= targetDate) {
        return 0;
    }

    let count = 0;
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const todayDay = current.getDay();

    // 오늘이 주말(토/일)인 경우 이번 주말 카운트
    if (todayDay === 0 || todayDay === 6) {
        count = 1;
        // 다음 월요일로 이동
        if (todayDay === 6) {
            current.setDate(current.getDate() + 2);
        } else {
            current.setDate(current.getDate() + 1);
        }
    }

    // 이후 주말 카운트 (토요일 기준)
    while (current < target) {
        const day = current.getDay();
        if (day === 6) { // 토요일
            count++;
            current.setDate(current.getDate() + 2); // 월요일로 점프
        } else {
            // 다음 토요일까지 점프
            const daysUntilSaturday = (6 - day + 7) % 7 || 7;
            current.setDate(current.getDate() + daysUntilSaturday);
        }
    }

    return count;
}

// 통합 형식 포맷팅 (일:시:분:초:밀리초2자리)
function formatUnified(ms) {
    if (ms <= 0) return "000:00:00:00:00";

    const absMs = Math.abs(ms);
    const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(absMs / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(absMs / (1000 * 60)) % 60;
    const seconds = Math.floor(absMs / 1000) % 60;
    const centiseconds = Math.floor((absMs % 1000) / 10);

    return `${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
}

// 진행률 계산
function calculateProgress(pastDate, upcomingDate) {
    const now = getNow();
    const totalDuration = upcomingDate - pastDate;
    const elapsed = now - pastDate;

    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return progress;
}

// 카운터 업데이트
function updateCounters() {
    const now = getNow();

    // 지난 수능 (2026학년도)
    const pastTarget = CSAT_DATES[2026];
    const pastDiff = pastTarget - now;
    elements.pastUnified.textContent = formatUnified(pastDiff);
    if (now > pastTarget) {
        const diffDays = Math.floor((now - pastTarget) / (1000 * 60 * 60 * 24));
        elements.pastDaysAgo.textContent = diffDays;
    }

    // 다가오는 수능 (2027학년도)
    const upcomingDiff = CSAT_DATES[2027] - now;
    elements.upcomingUnified.textContent = formatUnified(upcomingDiff);
    elements.upcomingWeekends.textContent = countWeekendsAccurate(CSAT_DATES[2027]);

    // 그 다음 수능 (2028학년도)
    const nextDiff = CSAT_DATES[2028] - now;
    elements.nextUnified.textContent = formatUnified(nextDiff);
    elements.nextWeekends.textContent = countWeekendsAccurate(CSAT_DATES[2028]);

    // 진행률 업데이트
    const progress = calculateProgress(CSAT_DATES[2026], CSAT_DATES[2027]);
    elements.progressBar.style.setProperty('--progress', `${progress}%`);
    elements.progressText.textContent = `${progress.toFixed(7)}%`;

    // 모의고사 마커 업데이트
    if (elements.milestonesContainer.children.length === 0) {
        renderMilestones();
    } else {
        updateMilestones();
    }

    // 다음 프레임 요청
    requestAnimationFrame(updateCounters);
}

// 모의고사 마커 렌더링
function renderMilestones() {
    const startDate = CSAT_DATES[2026];
    const endDate = CSAT_DATES[2027];
    const totalDuration = endDate - startDate;

    MOCK_EXAMS.forEach((exam, index) => {
        const elapsed = exam.date - startDate;
        const position = (elapsed / totalDuration) * 100;

        if (position >= 0 && position <= 100) {
            const marker = document.createElement('div');
            marker.className = 'milestone-marker';
            marker.id = `milestone-${index}`;
            marker.style.left = `${position}%`;

            marker.innerHTML = `
                <div class="milestone-line"></div>
                <div class="milestone-box">
                    <div class="exam-label">${exam.label}</div>
                    <div class="exam-dday" id="exam-dday-${index}">D-0</div>
                </div>
            `;

            elements.milestonesContainer.appendChild(marker);
        }
    });
    updateMilestones();
}

// 모의고사 마커 실시간 업데이트 (D-day 및 텍스트)
function updateMilestones() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    MOCK_EXAMS.forEach((exam, index) => {
        const ddayElement = document.getElementById(`exam-dday-${index}`);
        if (ddayElement) {
            const targetDate = new Date(exam.date);
            targetDate.setHours(0, 0, 0, 0);

            const diffMs = targetDate - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                ddayElement.textContent = `D-${diffDays}`;
            } else {
                ddayElement.textContent = `D-0`;
            }
        }
    });
}

// 테마 토글
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';

    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 저장된 테마 적용
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// 초기화
function init() {
    applySavedTheme();
    elements.themeToggle.addEventListener('click', toggleTheme);
    requestAnimationFrame(updateCounters);
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', init);
