// ========================================
// STOPWATCH MODULE
// ========================================

const Stopwatch = (() => {
    // 상태
    let elapsedMs = 0;
    let isRunning = false;
    let startTime = 0;
    let animationFrameId = null;

    // DOM 요소
    const elements = {
        hand: document.getElementById('swHand'),
        ticks: document.getElementById('swTicks'),
        display: document.getElementById('swDisplay'),
        startBtn: document.getElementById('swStartBtn'),
        resetBtn: document.getElementById('swResetBtn'),
    };

    // 눈금 생성
    function createTicks(container) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const angle = i * 6;
            const isHour = i % 5 === 0;
            const length = isHour ? 8 : 4;
            const outerRadius = 45;
            const innerRadius = outerRadius - length;

            const x1 = 50 + outerRadius * Math.cos((angle - 90) * Math.PI / 180);
            const y1 = 50 + outerRadius * Math.sin((angle - 90) * Math.PI / 180);
            const x2 = 50 + innerRadius * Math.cos((angle - 90) * Math.PI / 180);
            const y2 = 50 + innerRadius * Math.sin((angle - 90) * Math.PI / 180);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', isHour ? '#666' : '#ccc');
            line.setAttribute('stroke-width', isHour ? '1.5' : '0.75');
            container.appendChild(line);
        }
    }

    // 시간 포맷
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    // 바늘 회전 (초 기준, 60초에 한 바퀴) - 계속 증가하는 각도 사용
    function updateHand(ms) {
        if (!elements.hand) return;
        // 총 경과 시간을 기반으로 각도 계산 (리셋되지 않고 계속 증가)
        const totalSeconds = ms / 1000;
        const angle = totalSeconds * 6; // 360도 / 60초 = 6도/초
        elements.hand.style.transform = `rotate(${angle}deg)`;
    }

    // 디스플레이 업데이트
    function updateDisplay(ms) {
        if (!elements.display) return;
        elements.display.textContent = formatTime(ms);
    }

    // 모든 디스플레이 업데이트
    function updateAllDisplays() {
        updateHand(elapsedMs);
        updateDisplay(elapsedMs);
    }

    // 애니메이션 루프
    function tick() {
        if (!isRunning) return;

        const now = performance.now();
        elapsedMs = now - startTime;
        updateAllDisplays();

        animationFrameId = requestAnimationFrame(tick);
    }

    // 시작/일시정지 토글
    function toggleStart() {
        if (isRunning) {
            pause();
        } else {
            start();
        }
    }

    function start() {
        isRunning = true;
        // 이전에 일시정지했던 시간을 고려
        startTime = performance.now() - elapsedMs;
        if (elements.startBtn) elements.startBtn.textContent = '일시정지';
        tick();
    }

    function pause() {
        isRunning = false;
        if (elements.startBtn) elements.startBtn.textContent = '계속';
        cancelAnimationFrame(animationFrameId);
    }

    function reset() {
        isRunning = false;
        elapsedMs = 0;
        startTime = 0;
        if (elements.startBtn) elements.startBtn.textContent = '시작';
        cancelAnimationFrame(animationFrameId);

        // 바늘 되돌아가기 애니메이션 (0.5초 동안 부드럽게)
        if (elements.hand) {
            elements.hand.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
            updateHand(0);

            // 애니메이션 완료 후 트랜지션 제거 (다음 작동 시 레이그 방지)
            setTimeout(() => {
                if (elements.hand) {
                    elements.hand.style.transition = '';
                }
            }, 600);
        }

        updateDisplay(0);
    }

    // 이벤트 바인딩
    function bindEvents() {
        elements.startBtn?.addEventListener('click', toggleStart);
        elements.resetBtn?.addEventListener('click', reset);
    }

    // 초기화
    function init() {
        createTicks(elements.ticks);
        bindEvents();
        updateAllDisplays();
    }

    return { init };
})();

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Stopwatch.init);
} else {
    Stopwatch.init();
}
