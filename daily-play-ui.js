(function () {
  'use strict';
  const play = window.OldAlmanacPlay;
  const $ = (id) => document.getElementById(id);
  if (!play || !$('play-panel')) return;

  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const store = play.createStampStore(storage);
  const panel = $('play-panel');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let date = $('book').dataset.date || play.todayCN();
  let theme = 'free';
  let revealed = false;
  let drawing = false;
  let drawTimer = 0;
  let copyVersion = 0;

  function status(message) { $('play-status').textContent = message; }
  function clearDraw() {
    clearTimeout(drawTimer);
    drawTimer = 0;
    drawing = false;
    $('play-draw-stage').classList.remove('is-drawing');
    $('play-draw-stage').setAttribute('aria-busy', 'false');
  }

  function hideShareText() {
    ++copyVersion;
    $('play-share-text').hidden = true;
    $('play-share-text').value = '';
  }

  function renderSign() {
    const sign = play.signFor(date, theme);
    $('play-unopened').hidden = revealed;
    $('play-sign').hidden = !revealed;
    $('play-sign-number').textContent = '第 ' + sign.number + ' 签';
    $('play-sign-title').textContent = sign.title;
    $('play-poem-first').textContent = sign.lines[0];
    $('play-poem-second').textContent = sign.lines[1];
    $('play-sign-note').textContent = sign.note;
    $('btn-play-draw').disabled = drawing;
    $('btn-play-draw').textContent = drawing ? '签筒轻摇，等一等…' : revealed ? '再读今日签' : '摇一摇 · 抽今日签';
    $('btn-play-copy').hidden = !revealed;
  }

  function renderCollection() {
    const today = play.todayCN();
    const stamps = store.getDates();
    const complete = stamps.includes(date);
    const isToday = date === today;
    const challenge = play.challengeFor(date);
    $('play-challenge-label').textContent = isToday ? '今日小挑战' : '这一天的小挑战';
    $('play-challenge-duration').textContent = challenge.duration;
    $('play-challenge-title').textContent = challenge.title;
    $('play-challenge-description').textContent = challenge.description;
    $('play-completed').hidden = !complete;
    $('btn-play-stamp').disabled = !isToday || complete;
    $('btn-play-stamp').textContent = complete ? '已完成 · 印章已收好' : isToday ? '做到了 · 盖一枚章' : '翻回今天，再来盖章';
    $('btn-play-today').hidden = isToday;
    const stats = play.statsFor(stamps, today);
    $('play-stats').textContent = '共 ' + stats.total + ' 枚 · 连续 ' + stats.streak + ' 天';
    $('play-week').replaceChildren(...stats.week.map((day) => {
      const cell = document.createElement('div');
      cell.className = 'play-day' + (day.stamped ? ' is-stamped' : '') + (day.today ? ' is-today' : '');
      cell.setAttribute('aria-label', day.date + (day.stamped ? ' 已盖章' : ' 未盖章'));
      const seal = document.createElement('span');
      seal.textContent = day.stamped ? '好' : '·';
      seal.setAttribute('aria-hidden', 'true');
      const label = document.createElement('small');
      label.textContent = day.today ? '今天' : day.date.slice(5).replace('-', '/');
      cell.append(seal, label);
      return cell;
    }));
    $('play-storage-note').textContent = store.persistent ? '印章保存在此浏览器，每天一枚。集章册显示最近七天。' : '浏览器暂时无法保存，印章仅在当前页面保留。';
  }

  function render() {
    $('play-date').textContent = date.replace(/-/g, ' / ') + (date === play.todayCN() ? ' · 今日' : ' · 时光里的这一天');
    $('play-theme-hint').textContent = play.themes.find((item) => item.id === theme).hint + '。每日一签，给生活一点新意。';
    panel.querySelectorAll('[data-play-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.playTheme === theme)));
    renderSign();
    renderCollection();
  }

  function revealSign() {
    clearDraw();
    revealed = true;
    renderSign();
    status('签已展开：' + play.signFor(date, theme).title + '。');
  }

  $('btn-play-draw').addEventListener('click', () => {
    if (drawing) return;
    if (revealed || motion.matches) { revealSign(); return; }
    drawing = true;
    $('play-draw-stage').classList.add('is-drawing');
    $('play-draw-stage').setAttribute('aria-busy', 'true');
    status('轻摇签筒，接住今天的一点灵感。');
    renderSign();
    drawTimer = setTimeout(revealSign, 720);
  });

  panel.querySelectorAll('[data-play-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      if (theme === button.dataset.playTheme) return;
      clearDraw();
      hideShareText();
      theme = button.dataset.playTheme;
      revealed = false;
      status('换个心情，再抽一签。');
      render();
    });
  });

  $('btn-play-stamp').addEventListener('click', () => {
    const result = store.stamp(date, play.todayCN());
    renderCollection();
    if (result.kind === 'added') {
      $('play-completed').classList.remove('is-new');
      void $('play-completed').offsetWidth;
      $('play-completed').classList.add('is-new');
      status('今日的小欢喜，盖章收好了。' + (result.persistent ? '' : '记录仅在当前页面保留。'));
    } else if (result.kind === 'readonly') status('这一天只可查看。翻回今天，完成今天的小挑战再盖章。');
  });

  $('btn-play-copy').addEventListener('click', async () => {
    const sign = play.signFor(date, theme);
    const text = ['老黄历 · 今日小馆', date + ' · ' + play.themes.find((item) => item.id === theme).label, '第 ' + sign.number + ' 签 · ' + sign.title, ...sign.lines, sign.note, '今日小挑战：' + play.challengeFor(date).title].join('\n');
    const version = ++copyVersion;
    try {
      await navigator.clipboard.writeText(text);
      if (version !== copyVersion) return;
      status('签文已复制，可以分享给想到的人。');
    } catch {
      if (version !== copyVersion) return;
      const field = $('play-share-text');
      field.value = text;
      field.hidden = false;
      field.focus();
      field.select();
      status('签文已选中，可长按或使用复制快捷键。');
    }
  });

  window.addEventListener('almanac:datechange', (event) => {
    const nextDate = event.detail.date;
    try { play.signFor(nextDate, theme); } catch { return; }
    if (date === nextDate) return;
    date = nextDate;
    clearDraw();
    hideShareText();
    revealed = false;
    $('play-completed').classList.remove('is-new');
    status('翻到新的一天，签文和小挑战也换好了。');
    render();
  });
  window.addEventListener('almanac:playclose', () => { clearDraw(); hideShareText(); renderSign(); });
  window.addEventListener('almanac:playopen', () => { store.reload(); render(); status(''); });
  window.addEventListener('storage', (event) => {
    if (event.key === play.STORAGE_KEY || event.key === null) { store.reload(); renderCollection(); }
  });

  // 午夜或页面从后台返回时更新盖章权限；签文继续跟随当前翻到的日期。
  let lastToday = play.todayCN();
  function refreshToday() {
    const nextToday = play.todayCN();
    if (nextToday !== lastToday) {
      lastToday = nextToday;
      store.reload();
      render();
      status('新的一天到了，翻回今天可以领取新的挑战。');
    }
  }
  window.addEventListener('focus', refreshToday);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
  setInterval(refreshToday, 30000);
  render();
})();
