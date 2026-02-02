// ========================================
// TIMER MODULE
// ========================================

const Timer = (() => {
    // 상태
    let totalSeconds = 0;
    let remainingSeconds = 0;
    let isRunning = false;
    let intervalId = null;
    let isSoundEnabled = localStorage.getItem('timerSoundEnabled') !== 'false';
    let audioCtx = null;
    let alarmIntervalId = null;

    // 기본 프리셋 (localStorage에서 불러오거나 기본값 사용)
    const DEFAULT_PRESETS = [
        { label: '1분', seconds: 60 },
        { label: '10분', seconds: 600 },
        { label: '30분', seconds: 1800 },
        { label: '1시간', seconds: 3600 },
    ];

    let presets = JSON.parse(localStorage.getItem('timerPresets')) || [...DEFAULT_PRESETS];

    // DOM 요소
    const elements = {
        progress: document.getElementById('timerProgress'),
        display: document.getElementById('timerDisplay'),
        hours: document.getElementById('timerHours'),
        minutes: document.getElementById('timerMinutes'),
        seconds: document.getElementById('timerSeconds'),
        startBtn: document.getElementById('timerStartBtn'),
        resetBtn: document.getElementById('timerResetBtn'),
        presetGrid: document.getElementById('presetGrid'),
        presetAddBtn: document.getElementById('presetAddBtn'),
        soundBtn: document.getElementById('timerSoundBtn'),
        notificationContainer: document.getElementById('notificationContainer'),
        finishModal: document.getElementById('timerFinishModal'),
        finishRestartBtn: document.getElementById('timerFinishRestart'),
        finishCloseBtn: document.getElementById('timerFinishClose'),
    };

    // 모달 요소
    const modal = {
        overlay: document.getElementById('presetModal'),
        editList: document.getElementById('presetEditList'),
        closeBtn: document.getElementById('presetModalClose'),
        saveBtn: document.getElementById('presetModalSave'),
        addInsideBtn: document.getElementById('presetModalAddInside'),
        resetBtn: document.getElementById('presetModalReset'),
    };

    // 시계판 업데이트 (SVG arc)
    function updateClockFace(remaining) {
        if (!elements.progress || !elements.display) return;

        const circumference = 2 * Math.PI * 45; // r=45
        const percent = totalSeconds > 0 ? remaining / totalSeconds : 0;
        const offset = circumference * (1 - percent);

        elements.progress.style.strokeDasharray = circumference;
        elements.progress.style.strokeDashoffset = offset;

        // 시간 표시 (시:분:초 형식으로 변경)
        const hrs = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;

        if (hrs > 0) {
            elements.display.textContent = `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
            elements.display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }

    // 타이머 틱
    function tick() {
        if (remainingSeconds <= 0) {
            stop();
            remainingSeconds = totalSeconds;
            syncInputs(remainingSeconds);
            updateClockFace(remainingSeconds);

            // 종료 알림
            playDingSound();
            showFinishModal();
            return;
        }

        remainingSeconds--;
        updateClockFace(remainingSeconds);
    }

    // 입력에서 초 계산
    function getSecondsFromInputs() {
        const h = parseInt(elements.hours?.value) || 0;
        const m = parseInt(elements.minutes?.value) || 0;
        const s = parseInt(elements.seconds?.value) || 0;
        return h * 3600 + m * 60 + s;
    }

    // 입력 동기화
    function syncInputs(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (elements.hours) elements.hours.value = h;
        if (elements.minutes) elements.minutes.value = m;
        if (elements.seconds) elements.seconds.value = s;
    }

    // 시작/일시정지
    // 소리 토글
    function toggleSound() {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('timerSoundEnabled', isSoundEnabled);
        updateSoundUI();

        // 사용자 제스처 시 AudioContext 초기화
        if (isSoundEnabled && !audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function updateSoundUI() {
        if (!elements.soundBtn) return;
        const onIcon = elements.soundBtn.querySelector('.sound-on-icon');
        const offIcon = elements.soundBtn.querySelector('.sound-off-icon');

        if (isSoundEnabled) {
            onIcon?.classList.remove('hidden');
            offIcon?.classList.add('hidden');
        } else {
            onIcon?.classList.add('hidden');
            offIcon?.classList.remove('hidden');
        }
    }

    // 종료 효과음 (Web Audio API)
    function playDingSound() {
        if (!isSoundEnabled) return;

        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const playDing = () => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.5);
            };

            // 이미 재생 중이면 중복 실행 방지
            if (alarmIntervalId) return;

            // 즉시 한 번 재생 후 0.8초 간격으로 반복
            playDing();
            alarmIntervalId = setInterval(playDing, 800);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    // 알림음 중지
    function stopDingSound() {
        if (alarmIntervalId) {
            clearInterval(alarmIntervalId);
            alarmIntervalId = null;
        }
    }

    // 알림 팝업 표시 (기존 토스트 - 삭제하거나 유지 가능하지만 이번 요청은 모달 중심)
    function showNotification(message) {
        // 모달로 대체되어 기존 토스트는 로깅용으로 남겨둘 수도 있고 제거할 수도 있습니다.
        console.log('Notification:', message);
    }

    // 타이머 종료 모달 표시
    function showFinishModal() {
        if (!elements.finishModal) return;
        elements.finishModal.classList.add('active');
    }

    function closeFinishModal() {
        if (!elements.finishModal) return;
        elements.finishModal.classList.remove('active');
        stopDingSound();
    }

    function restartFromModal() {
        closeFinishModal();
        // 이미 remainingSeconds = totalSeconds가 되어있으므로 바로 시작
        start();
    }

    function toggleStart() {
        // 첫 시작 시 AudioContext 준비 (제스처 필요)
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (isRunning) {
            pause();
        } else {
            start();
        }
    }

    function start() {
        if (remainingSeconds <= 0) {
            // 입력에서 시간 가져오기
            const secs = getSecondsFromInputs();
            if (secs <= 0) return;
            totalSeconds = secs;
            remainingSeconds = secs;
        }

        isRunning = true;
        if (elements.startBtn) elements.startBtn.textContent = '일시정지';
        intervalId = setInterval(tick, 1000);
    }

    function pause() {
        isRunning = false;
        if (elements.startBtn) elements.startBtn.textContent = '계속';
        clearInterval(intervalId);
    }

    function stop() {
        isRunning = false;
        if (elements.startBtn) elements.startBtn.textContent = '시작';
        clearInterval(intervalId);
    }

    function reset() {
        stop();
        remainingSeconds = totalSeconds;
        syncInputs(remainingSeconds);
        updateClockFace(remainingSeconds);
    }

    // 프리셋 설정
    function setPreset(seconds) {
        stop();
        totalSeconds = seconds;
        remainingSeconds = seconds;
        syncInputs(seconds);
        updateClockFace(seconds);
    }

    // 프리셋 버튼 렌더링
    function renderPresets() {
        if (!elements.presetGrid) return;
        elements.presetGrid.innerHTML = '';
        presets.forEach((preset) => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = preset.label;
            btn.addEventListener('click', () => setPreset(preset.seconds));
            elements.presetGrid.appendChild(btn);
        });
    }

    // 프리셋 모달 열기
    function openPresetModal() {
        if (!modal.overlay) return;

        modal.editList.innerHTML = '';
        presets.forEach((preset, index) => {
            const h = Math.floor(preset.seconds / 3600);
            const m = Math.floor((preset.seconds % 3600) / 60);
            const s = preset.seconds % 60;

            const item = document.createElement('div');
            item.className = 'preset-edit-item';
            item.innerHTML = `
                <input type="text" value="${preset.label}" data-index="${index}" data-field="label" placeholder="라벨">
                <div class="preset-time-inputs">
                    <input type="number" value="${h}" data-index="${index}" data-field="h" placeholder="시" min="0" max="99">
                    <span>:</span>
                    <input type="number" value="${m}" data-index="${index}" data-field="m" placeholder="분" min="0" max="59">
                    <span>:</span>
                    <input type="number" value="${s}" data-index="${index}" data-field="s" placeholder="초" min="0" max="59">
                </div>
                <button class="delete-btn" data-index="${index}">삭제</button>
            `;
            modal.editList.appendChild(item);
        });

        // 삭제 버튼 이벤트
        modal.editList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                presets.splice(index, 1);
                openPresetModal(); // 다시 렌더링
            });
        });

        modal.overlay.classList.add('active');
    }

    // 프리셋 모달 저장
    function savePresets() {
        const items = modal.editList.querySelectorAll('.preset-edit-item');
        presets = [];
        items.forEach(item => {
            const label = item.querySelector('input[data-field="label"]').value;
            const h = parseInt(item.querySelector('input[data-field="h"]').value) || 0;
            const m = Math.min(59, parseInt(item.querySelector('input[data-field="m"]').value) || 0);
            const s = Math.min(59, parseInt(item.querySelector('input[data-field="s"]').value) || 0);
            const total = h * 3600 + m * 60 + s;

            if (label && total > 0) {
                presets.push({ label, seconds: total });
            }
        });
        localStorage.setItem('timerPresets', JSON.stringify(presets));
        renderPresets();
        closePresetModal();
    }

    function closePresetModal() {
        if (modal.overlay) modal.overlay.classList.remove('active');
    }

    // 프리셋 추가
    function addPreset() {
        presets.push({ label: '새 프리셋', seconds: 300 });
        openPresetModal();
    }

    // 프리셋 초기화
    function resetPresetsToDefault() {
        if (confirm('모든 프리셋을 초기 상태로 되돌리시겠습니까?')) {
            presets = [...DEFAULT_PRESETS];
            localStorage.setItem('timerPresets', JSON.stringify(presets));
            renderPresets();
            if (modal.overlay.classList.contains('active')) {
                openPresetModal(); // 모달이 열려있으면 갱신
            }
        }
    }

    function handleArrowClick(e) {
        const btn = e.target.closest('.arrow-btn');
        if (!btn) return;

        const targetId = btn.dataset.target;
        const direction = btn.dataset.dir;
        const input = document.getElementById(targetId);
        if (!input) return;

        let value = parseInt(input.value) || 0;
        const max = targetId.includes('Hours') ? 99 : 59;

        if (direction === 'up') {
            value = value >= max ? 0 : value + 1;
        } else {
            value = value <= 0 ? max : value - 1;
        }

        input.value = value;

        // 실행 중이 아닐 때만 상태 업데이트
        if (!isRunning) {
            const secs = getSecondsFromInputs();
            totalSeconds = secs;
            remainingSeconds = secs;
            updateClockFace(secs);
        }
    }

    // 이벤트 바인딩
    function bindEvents() {
        elements.startBtn?.addEventListener('click', toggleStart);
        elements.resetBtn?.addEventListener('click', reset);
        elements.presetAddBtn?.addEventListener('click', openPresetModal);

        // 모달
        modal.closeBtn?.addEventListener('click', closePresetModal);
        modal.saveBtn?.addEventListener('click', savePresets);
        modal.resetBtn?.addEventListener('click', resetPresetsToDefault);
        modal.addInsideBtn?.addEventListener('click', () => {
            // 현재 입력된 것들을 임시로 저장하고 새 항목 추가
            const items = modal.editList.querySelectorAll('.preset-edit-item');
            const currentPresets = [];
            items.forEach(item => {
                const label = item.querySelector('input[data-field="label"]').value;
                const h = parseInt(item.querySelector('input[data-field="h"]').value) || 0;
                const m = parseInt(item.querySelector('input[data-field="m"]').value) || 0;
                const s = parseInt(item.querySelector('input[data-field="s"]').value) || 0;
                currentPresets.push({ label, seconds: h * 3600 + m * 60 + s });
            });
            currentPresets.push({ label: '', seconds: 0 });
            presets = currentPresets;
            openPresetModal();
        });
        modal.overlay?.addEventListener('click', (e) => {
            if (e.target === modal.overlay) closePresetModal();
        });

        // 소리 토글
        elements.soundBtn?.addEventListener('click', toggleSound);

        // 종료 모달 버튼
        elements.finishRestartBtn?.addEventListener('click', restartFromModal);
        elements.finishCloseBtn?.addEventListener('click', closeFinishModal);

        // 화살표 버튼 이벤트 (길게 누르기 지원)
        let holdInterval = null;
        let holdTimeout = null;

        function startHold(btn) {
            const action = () => handleArrowClick({ target: btn });
            action(); // 즉시 한 번 실행

            holdTimeout = setTimeout(() => {
                holdInterval = setInterval(action, 100); // 100ms 간격으로 반복
            }, 200); // 200ms 후 자동 반복 시작
        }

        function stopHold() {
            clearTimeout(holdTimeout);
            clearInterval(holdInterval);
            holdTimeout = null;
            holdInterval = null;
        }

        document.querySelectorAll('.arrow-btn').forEach(btn => {
            // 마우스 이벤트
            btn.addEventListener('mousedown', () => startHold(btn));
            btn.addEventListener('mouseup', stopHold);
            btn.addEventListener('mouseleave', stopHold);

            // 터치 이벤트
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startHold(btn);
            });
            btn.addEventListener('touchend', stopHold);
            btn.addEventListener('touchcancel', stopHold);
        });
    }

    // 초기화
    function init() {
        bindEvents();
        renderPresets();
        updateSoundUI();
        updateClockFace(0);
    }

    return { init };
})();

// DOM이 준비되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Timer.init);
} else {
    Timer.init();
}
