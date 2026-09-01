(function () {
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var params = new URLSearchParams(window.location.search);
    var to = params.get('to');
    if (to) {
      initStudentMode(to);
    } else {
      initTeacherMode();
    }
  }

  function onlyDigits(str) {
    return (str || '').replace(/\D/g, '');
  }

  // 전화번호가 링크에 숫자 그대로 노출되지 않도록 base64url로 인코딩/디코딩
  function encodePhone(digits) {
    return btoa(digits).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodePhone(encoded) {
    var b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
      return atob(b64);
    } catch (e) {
      return '';
    }
  }

  // ---------- 교사 설정 화면 ----------
  function initTeacherMode() {
    var screen = document.getElementById('teacher-screen');
    screen.hidden = false;

    var phoneInput = document.getElementById('teacher-phone');
    var gradeLockSelect = document.getElementById('grade-lock');
    var classLockSelect = document.getElementById('class-lock');
    var classMaxWrap = document.getElementById('class-max-wrap');
    var rangeRow = document.getElementById('range-row');
    var classMaxInput = document.getElementById('class-max');
    var numberMaxInput = document.getElementById('number-max');
    var makeBtn = document.getElementById('make-link-btn');
    var errorEl = document.getElementById('teacher-error');
    var resultBox = document.getElementById('teacher-result');
    var resultLink = document.getElementById('result-link');
    var copyBtn = document.getElementById('copy-link-btn');
    var copyStatus = document.getElementById('copy-link-status');
    var qrCanvasWrap = document.getElementById('qr-canvas-wrap');
    var downloadQrBtn = document.getElementById('download-qr-btn');

    function updateClassMaxVisibility() {
      var locked = !!classLockSelect.value;
      classMaxWrap.hidden = locked;
      rangeRow.classList.toggle('single', locked);
    }
    classLockSelect.addEventListener('change', updateClassMaxVisibility);
    updateClassMaxVisibility();

    makeBtn.addEventListener('click', function () {
      var digits = onlyDigits(phoneInput.value);
      errorEl.hidden = true;
      resultBox.hidden = true;

      if (digits.length < 9) {
        errorEl.textContent = '전화번호를 다시 확인해주세요. (숫자만 9자리 이상 입력)';
        errorEl.hidden = false;
        return;
      }

      var classLock = classLockSelect.value;
      var classMax = clamp(parseInt(classMaxInput.value, 10), 1, 15, 7);
      var numberMax = clamp(parseInt(numberMaxInput.value, 10), 1, 40, 28);
      var gradeLock = gradeLockSelect.value;

      var base = window.location.origin + window.location.pathname;
      var link = base + '?to=' + encodePhone(digits);
      if (classLock) {
        link += '&fc=' + classLock;
      } else {
        link += '&c=' + classMax;
      }
      link += '&n=' + numberMax;
      if (gradeLock) {
        link += '&g=' + gradeLock;
      }
      resultLink.textContent = link;
      resultBox.hidden = false;

      qrCanvasWrap.innerHTML = '';
      new QRCode(qrCanvasWrap, {
        text: link,
        width: 160,
        height: 160,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });

      downloadQrBtn.onclick = function () {
        downloadQrCode(qrCanvasWrap);
      };

      copyStatus.textContent = '';

      copyBtn.onclick = function () {
        copyText(link, copyStatus);
      };
    });
  }

  function clamp(value, min, max, fallback) {
    if (isNaN(value)) return fallback;
    return Math.min(Math.max(value, min), max);
  }

  // ---------- 학생 입력 화면 ----------
  function initStudentMode(rawTo) {
    var toDigits = onlyDigits(decodePhone(rawTo));

    if (toDigits.length < 9) {
      document.getElementById('student-error-screen').hidden = false;
      return;
    }

    var screen = document.getElementById('student-screen');
    screen.hidden = false;

    var params = new URLSearchParams(window.location.search);
    var lockedGrade = clamp(parseInt(params.get('g'), 10), 1, 3, null);
    var lockedClass = clamp(parseInt(params.get('fc'), 10), 1, 15, null);
    var classMax = clamp(parseInt(params.get('c'), 10), 1, 15, 15);
    var numberMax = clamp(parseInt(params.get('n'), 10), 1, 40, 40);

    var gradeSlot = document.getElementById('grade-slot');
    var classSlot = document.getElementById('class-slot');
    var numberSelect = document.getElementById('number-select');
    var nameInput = document.getElementById('name-input');

    var gradeSelect = null;
    if (lockedGrade) {
      var fixedGrade = document.createElement('div');
      fixedGrade.className = 'fixed-grade';
      fixedGrade.textContent = lockedGrade + '학년';
      gradeSlot.appendChild(fixedGrade);
    } else {
      gradeSelect = document.createElement('select');
      gradeSelect.setAttribute('aria-label', '학년 선택');
      gradeSlot.appendChild(gradeSelect);
      fillSelect(gradeSelect, 1, 3, '학년', '학년');
    }

    var classSelect = null;
    if (lockedClass) {
      var fixedClass = document.createElement('div');
      fixedClass.className = 'fixed-grade';
      fixedClass.textContent = lockedClass + '반';
      classSlot.appendChild(fixedClass);
    } else {
      classSelect = document.createElement('select');
      classSelect.setAttribute('aria-label', '반 선택');
      classSlot.appendChild(classSelect);
      fillSelect(classSelect, 1, classMax, '반', '반');
    }

    fillSelect(numberSelect, 1, numberMax, '번', '번호');

    var bubble = document.getElementById('preview-bubble');
    var sendBtn = document.getElementById('send-btn');

    var PLACEHOLDER_TEXT = '학년·반·번호·이름을 모두 입력하면 여기에 미리보기가 나타나요';

    function currentMessage() {
      var grade = lockedGrade || gradeSelect.value;
      var cls = lockedClass || classSelect.value;
      var num = numberSelect.value;
      var name = nameInput.value.trim();
      if (!grade || !cls || !num || !name) return null;
      return '[등록] ' + grade + '학년' + cls + '반 ' + num + '번 ' + name;
    }

    function render() {
      var msg = currentMessage();
      if (msg) {
        bubble.textContent = msg;
        bubble.classList.remove('placeholder');

        sendBtn.classList.remove('btn-disabled');
        sendBtn.setAttribute('aria-disabled', 'false');
        sendBtn.href = buildSmsLink(toDigits, msg);
      } else {
        bubble.textContent = PLACEHOLDER_TEXT;
        bubble.classList.add('placeholder');

        sendBtn.classList.add('btn-disabled');
        sendBtn.setAttribute('aria-disabled', 'true');
        sendBtn.removeAttribute('href');
      }
    }

    var watchedEls = [numberSelect];
    if (gradeSelect) watchedEls.push(gradeSelect);
    if (classSelect) watchedEls.push(classSelect);
    watchedEls.forEach(function (el) {
      el.addEventListener('change', render);
    });
    nameInput.addEventListener('input', render);

    render();
  }

  function fillSelect(select, min, max, unitLabel, placeholderLabel) {
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = placeholderLabel || unitLabel;
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    for (var i = min; i <= max; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + unitLabel;
      select.appendChild(opt);
    }
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function buildSmsLink(phoneDigits, message) {
    var encoded = encodeURIComponent(message);
    var sep = isIOS() ? '&' : '?';
    return 'sms:' + phoneDigits + sep + 'body=' + encoded;
  }

  function downloadQrCode(canvasWrap) {
    var canvas = canvasWrap.querySelector('canvas');
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = '학생등록링크_QR.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copyText(text, statusEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        statusEl.textContent = '복사했어요 ✅';
      }, function () {
        statusEl.textContent = '복사에 실패했어요. 직접 선택해서 복사해주세요.';
      });
    } else {
      statusEl.textContent = '이 브라우저에서는 자동 복사가 안 돼요. 직접 선택해서 복사해주세요.';
    }
  }
})();
