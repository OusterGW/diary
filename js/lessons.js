const today = new Date().getDay();
let selectedDay = (today >= 1 && today <= 5) ? today : 1;
let editorType = 'lesson';
let lessonsCache = [];
let completedSet = new Set();
let daysInitialized = false;
let suppressNextClick = false;
let editingPhotos = [];
let pendingFiles = [];

function isWindowLesson(l) {
  const s = (l?.subject || '').trim().toLowerCase();
  return s === 'нет урока' || s === 'окно';
}

function initDaysBar() {
  if (daysInitialized) return;
  const bar = document.getElementById('daysBar');
  DAYS.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'day-btn';
    btn.dataset.day = d.id;
    btn.textContent = d.short;
    btn.onclick = () => selectDay(d.id);
    bar.appendChild(btn);
  });
  daysInitialized = true;
}

function updateDaysUI() {
  const idx = DAYS.findIndex(d => d.id === selectedDay);
  document.getElementById('daySlider').style.setProperty('--idx', Math.max(0, idx));
  document.querySelectorAll('#daysBar .day-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.day) === selectedDay);
  });
  document.getElementById('dayTitle').textContent = DAYS[idx]?.full || 'Понедельник';
}

function selectDay(dayId) {
  if (selectedDay === dayId) return;
  const dirClass = dayId > selectedDay ? 'day-slide-next' : 'day-slide-prev';
  selectedDay = dayId;
  updateDaysUI();
  renderLessons();
  playAnim(document.getElementById('lessonsList'), dirClass);
}

async function loadHwData(silent = false) {
  const [lessonsRes, compRes] = await Promise.all([
    db.from('lessons').select('*').order('lesson_number', { ascending: true }).order('id', { ascending: true }),
    db.from('user_completions').select('lesson_id').eq('user_id', currentUser.id).eq('completed', true)
  ]);
  const newLessons = lessonsRes.data || [];
  const newCompArr = (compRes.data || []).map(r => r.lesson_id);

  const changed = !silent
    || JSON.stringify(newLessons) !== JSON.stringify(lessonsCache)
    || JSON.stringify(newCompArr) !== JSON.stringify([...completedSet]);

  lessonsCache = newLessons;
  completedSet = new Set(newCompArr);

  if (changed) renderLessons();
}

function renderLessons() {
  const list = document.getElementById('lessonsList');
  const dayLessons = lessonsCache
    .filter(l => l.day_of_week === selectedDay)
    .sort((a, b) => a.lesson_number - b.lesson_number || a.id - b.id);

  if (!dayLessons.length) {
    list.innerHTML = `
      <div class="empty">
        <div>На этот день уроков пока нет</div>
        ${isAdmin() ? `<button class="btn sm" onclick="openLessonModal(null)">${ICON.plus}<span>Добавить урок</span></button>` : ''}
      </div>
    `;
    return;
  }

  const adminMode = isAdmin();

  list.innerHTML = dayLessons.map(l => {
    if (isWindowLesson(l)) {
      const canOpen = adminMode || Boolean(l.homework);
      return `
        <div class="lesson-card window ${canOpen ? '' : 'static-card'}"
             data-lesson-id="${l.id}"
             ${canOpen ? `onclick="if(!suppressNextClick) openLessonModal(${l.id})"` : ''}>
          <div class="window-mark">${ICON.dash}</div>
          <div class="lesson-num">${l.lesson_number}</div>
          <div class="lesson-info">
            <div class="lesson-title"><span>Нет урока</span></div>
            ${l.lesson_time ? `<div class="lesson-meta">${esc(l.lesson_time)}</div>` : ''}
            ${l.homework ? `<div class="lesson-preview">${esc(l.homework)}</div>` : ''}
          </div>
          ${adminMode ? `<div class="drag-handle" title="Потяните, чтобы поменять номер">${ICON.grip}</div>` : ''}
        </div>
      `;
    }

    const done = completedSet.has(l.id);
    const photosCount = (l.photo_urls || []).length;
    const meta = [l.lesson_time, l.teacher].filter(Boolean).map(esc).join(' · ');

    return `
      <div class="lesson-card ${l.is_cancelled ? 'cancelled' : ''} ${done ? 'done' : ''}"
           data-lesson-id="${l.id}" onclick="if(!suppressNextClick) openLessonModal(${l.id})">
        <button class="check-btn ${done ? 'checked' : ''}" onclick="event.stopPropagation(); toggleDone(${l.id})">
          ${done ? ICON.check : ''}
        </button>
        <div class="lesson-num">${l.lesson_number}</div>
        <div class="lesson-info">
          <div class="lesson-title">
            <span>${esc(l.subject)}</span>
            ${l.is_cancelled ? '<span class="badge red">Отменён</span>' : ''}
            ${photosCount ? `<span class="badge blue">${ICON.photoSm} ${photosCount}</span>` : ''}
          </div>
          ${meta ? `<div class="lesson-meta">${meta}</div>` : ''}
          ${l.homework ? `<div class="lesson-preview">${esc(l.homework)}</div>` : ''}
        </div>
        ${adminMode ? `<div class="drag-handle" title="Потяните, чтобы поменять номер урока">${ICON.grip}</div>` : ''}
      </div>
    `;
  }).join('');

  if (adminMode) attachDragHandlers();
}

// --- Перетаскивание уроков ---
function attachDragHandlers() {
  document.querySelectorAll('#lessonsList .drag-handle').forEach(handle => {
    handle.addEventListener('pointerdown', startLessonDrag);
  });
}

function startLessonDrag(e) {
  e.preventDefault();
  e.stopPropagation();

  clearAnimClasses(document.getElementById('pageHw'));
  clearAnimClasses(document.getElementById('lessonsList'));

  const list = document.getElementById('lessonsList');
  const card = e.currentTarget.closest('.lesson-card');
  if (!card) return;

  const rect = card.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;

  const placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  placeholder.style.height = rect.height + 'px';

  card.style.width = rect.width + 'px';
  card.style.left = rect.left + 'px';
  card.style.top = rect.top + 'px';
  card.parentNode.insertBefore(placeholder, card);
  card.classList.add('dragging');

  const pointerId = e.pointerId;
  e.currentTarget.setPointerCapture?.(pointerId);

  function swapWithFlip(targetCard, insertBefore) {
    const siblings = [...list.querySelectorAll('.lesson-card:not(.dragging)')];
    const beforeTops = new Map(siblings.map(el => [el, el.getBoundingClientRect().top]));

    if (insertBefore) list.insertBefore(placeholder, targetCard);
    else list.insertBefore(placeholder, targetCard.nextSibling);

    siblings.forEach(el => {
      const dy = beforeTops.get(el) - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(0, ${dy}px, 0)`;
      el.offsetHeight;
      el.style.transition = 'transform 0.2s var(--ease-ios)';
      el.style.transform = 'translate3d(0, 0, 0)';
    });
  }

  function onMove(ev) {
    const newTop = ev.clientY - offsetY;
    card.style.top = newTop + 'px';
    const cardCenter = newTop + rect.height / 2;

    const siblings = [...list.querySelectorAll('.lesson-card:not(.dragging)')];
    for (const sib of siblings) {
      const r = sib.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const isBefore = placeholder.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING;

      if (isBefore && cardCenter > mid) {
        swapWithFlip(sib, false);
        break;
      } else if (!isBefore && cardCenter < mid) {
        swapWithFlip(sib, true);
        break;
      }
    }
  }

  async function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);

    suppressNextClick = true;
    setTimeout(() => { suppressNextClick = false; }, 120);

    list.insertBefore(card, placeholder);
    placeholder.remove();

    card.classList.remove('dragging');
    card.style.width = '';
    card.style.left = '';
    card.style.top = '';

    list.querySelectorAll('.lesson-card').forEach(el => {
      el.style.transition = '';
      el.style.transform = '';
    });

    await applyDraggedOrder();
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

async function applyDraggedOrder() {
  const list = document.getElementById('lessonsList');
  const orderedIds = [...list.querySelectorAll('.lesson-card')].map(el => Number(el.dataset.lessonId));
  const dayLessons = lessonsCache
    .filter(l => l.day_of_week === selectedDay)
    .sort((a, b) => a.lesson_number - b.lesson_number || a.id - b.id);

  const originalIds = dayLessons.map(l => l.id);
  if (JSON.stringify(orderedIds) === JSON.stringify(originalIds)) return;

  const slotNumbers = dayLessons.map(l => l.lesson_number).sort((a, b) => a - b);
  const updates = [];

  orderedIds.forEach((id, idx) => {
    const lesson = lessonsCache.find(l => l.id === id);
    const newNum = slotNumbers[idx];
    if (!lesson || lesson.lesson_number === newNum) return;

    const newTime = LESSON_TIMES[newNum] || lesson.lesson_time;
    lesson.lesson_number = newNum;
    lesson.lesson_time = newTime;
    updates.push({ id, lesson_number: newNum, lesson_time: newTime });
  });

  if (!updates.length) return;
  renderLessons();

  const results = await Promise.all(
    updates.map(u => db.from('lessons').update({
      lesson_number: u.lesson_number,
      lesson_time: u.lesson_time
    }).eq('id', u.id))
  );

  const err = results.find(r => r.error)?.error;
  if (err) {
    alert('Не удалось сохранить новый порядок: ' + err.message);
    await loadHwData();
  }
}

async function toggleDone(lessonId) {
  const wasDone = completedSet.has(lessonId);
  const card = document.querySelector(`.lesson-card[data-lesson-id="${lessonId}"]`);
  const checkBtn = card?.querySelector('.check-btn');

  if (wasDone) {
    completedSet.delete(lessonId);
    card?.classList.remove('done');
    if (checkBtn) { checkBtn.classList.remove('checked'); checkBtn.innerHTML = ''; }
    await db.from('user_completions').delete().eq('user_id', currentUser.id).eq('lesson_id', lessonId);
  } else {
    completedSet.add(lessonId);
    card?.classList.add('done');
    if (checkBtn) { checkBtn.classList.add('checked'); checkBtn.innerHTML = ICON.check; }
    await db.from('user_completions').upsert({ user_id: currentUser.id, lesson_id: lessonId, completed: true });
  }
}

// --- Автоподбор учителя ---
function normSubj(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,—–\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTeacherForSubject(rawSubject) {
  const q = normSubj(rawSubject);
  if (q.length < 2) return null;

  for (const rule of TEACHER_RULES) {
    if (rule.keys.includes(q)) return rule.teacher;
  }
  for (const rule of TEACHER_RULES) {
    if (rule.keys.some(k => k.startsWith(q) || q.startsWith(k))) {
      return rule.teacher;
    }
  }

  for (const l of lessonsCache) {
    if (!l.subject || !l.teacher || isWindowLesson(l)) continue;
    const s = normSubj(l.subject);
    if (s === q || (q.length >= 3 && s.startsWith(q))) {
      return l.teacher.trim();
    }
  }

  return null;
}

// --- Основное расписание ---
async function saveCurrentDayAsBase() {
  const dayName = DAYS.find(d => d.id === selectedDay)?.full || 'этот день';
  const dayLessons = lessonsCache
    .filter(l => l.day_of_week === selectedDay)
    .sort((a, b) => a.lesson_number - b.lesson_number || a.id - b.id);

  if (!dayLessons.length) {
    showToast('На этот день нет уроков для сохранения');
    return;
  }
  if (!confirm(`Сделать текущее расписание (${dayName}) основным?`)) return;

  const btn = document.getElementById('setBaseBtn');
  btn.disabled = true;

  try {
    const { error: delErr } = await db.from('base_lessons').delete().eq('day_of_week', selectedDay);
    if (delErr) throw delErr;

    const rows = dayLessons.map(l => ({
      day_of_week: selectedDay,
      lesson_number: l.lesson_number,
      subject: l.subject,
      teacher: isWindowLesson(l) ? '' : (l.teacher || findTeacherForSubject(l.subject) || ''),
      lesson_time: LESSON_TIMES[l.lesson_number] || l.lesson_time || ''
    }));

    const { error: insErr } = await db.from('base_lessons').insert(rows);
    if (insErr) throw insErr;

    showToast(`Основное расписание (${dayName}) сохранено`);
  } catch (err) {
    alert('Ошибка сохранения основного расписания: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

async function restoreDayFromBase() {
  const dayName = DAYS.find(d => d.id === selectedDay)?.full || 'этот день';
  if (!confirm(`Вернуть основное расписание на ${dayName}? Текущие уроки и ДЗ за этот день будут заменены.`)) return;

  const btn = document.getElementById('restoreBaseBtn');
  btn.disabled = true;

  try {
    let baseRows = [];
    const { data, error } = await db
      .from('base_lessons')
      .select('*')
      .eq('day_of_week', selectedDay)
      .order('lesson_number', { ascending: true });

    if (!error && data && data.length) {
      baseRows = data;
    } else {
      baseRows = (DEFAULT_BASE_SCHEDULE[selectedDay] || []).map(item => ({
        ...item,
        day_of_week: selectedDay
      }));
    }

    const { error: delErr } = await db.from('lessons').delete().eq('day_of_week', selectedDay);
    if (delErr) throw delErr;

    if (baseRows.length) {
      const payload = baseRows.map(r => ({
        day_of_week: selectedDay,
        lesson_number: r.lesson_number,
        subject: r.subject,
        teacher: r.teacher || '',
        lesson_time: r.lesson_time || LESSON_TIMES[r.lesson_number] || '',
        homework: '',
        is_cancelled: false,
        photo_urls: []
      }));
      const { error: insErr } = await db.from('lessons').insert(payload);
      if (insErr) throw insErr;
    }

    await loadHwData();
    showToast(`Расписание (${dayName}) восстановлено`);
  } catch (err) {
    alert('Ошибка восстановления: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

// --- Модалка урока / окна ---
function updateAutoMetaPreview() {
  const box = document.getElementById('autoMetaPreview');
  if (!box) return;
  const num = parseInt(document.getElementById('edNum')?.value, 10) || 1;
  const timeStr = LESSON_TIMES[num] || 'время не задано';
  const dayName = DAYS.find(d => d.id === selectedDay)?.full || '';

  if (editorType === 'window') {
    box.innerHTML = `${ICON.clock}<span>${esc(dayName)} · ${esc(timeStr)}</span>`;
    return;
  }

  const subj = document.getElementById('edSubj')?.value || '';
  const teacher = findTeacherForSubject(subj);
  const parts = [dayName, timeStr];
  if (teacher) parts.push(teacher);
  box.innerHTML = `${ICON.clock}<span>${parts.map(esc).join(' · ')}</span>`;
}

function switchEditorType(type) {
  editorType = type;
  const isWin = type === 'window';

  const slider = document.getElementById('editorTypeSlider');
  if (slider) slider.style.setProperty('--idx', isWin ? 1 : 0);
  document.getElementById('edTypeLesson')?.classList.toggle('active', !isWin);
  document.getElementById('edTypeWindow')?.classList.toggle('active', isWin);

  document.getElementById('subjFieldWrap')?.classList.toggle('hidden', isWin);
  document.getElementById('cancelFieldWrap')?.classList.toggle('hidden', isWin);
  document.getElementById('photosFieldWrap')?.classList.toggle('hidden', isWin);

  const hwLabel = document.getElementById('hwLabel');
  const hwInput = document.getElementById('edHw');
  if (hwLabel) hwLabel.textContent = isWin ? 'Комментарий (необязательно)' : 'Домашнее задание';
  if (hwInput) hwInput.placeholder = isWin ? 'Например: свободный урок' : 'Что задали...';

  if (!isWin) {
    const subjInput = document.getElementById('edSubj');
    if (subjInput && normSubj(subjInput.value) === 'нет урока') {
      subjInput.value = '';
    }
  }
  updateAutoMetaPreview();
}

function openLessonModal(lessonId) {
  const l = lessonId ? lessonsCache.find(x => x.id === lessonId) : null;

  if (!isAdmin()) {
    if (!l) return;
    const photos = (l.photo_urls || []).map(url => `
      <div class="photo-item">
        <img src="${esc(url)}" onclick="openLightbox('${esc(url)}')" alt="" />
      </div>
    `).join('');
    const meta = [l.lesson_time, l.teacher].filter(Boolean).map(esc).join(' · ');

    document.getElementById('modalContent').innerHTML = `
      <div class="modal-head">
        <div>
          <h3>${l.lesson_number}. ${esc(isWindowLesson(l) ? 'Нет урока' : l.subject)}</h3>
          ${meta ? `<div style="font-size:13px; color:var(--muted); margin-top:4px;">${meta}</div>` : ''}
          ${l.is_cancelled ? '<span class="badge red" style="margin-top:6px;">Урока не будет</span>' : ''}
        </div>
        <button class="close-x" onclick="closeModal()">${ICON.close}</button>
      </div>
      <div class="hw-box">${l.homework ? linkifyText(l.homework) : '<span style="color:var(--muted)">Домашнее задание не задано</span>'}</div>
      ${photos ? `<div class="photo-grid">${photos}</div>` : ''}
    `;
    openModal();
    return;
  }

  const isWin = l ? isWindowLesson(l) : false;
  editorType = isWin ? 'window' : 'lesson';
  editingPhotos = l ? [...(l.photo_urls || [])] : [];
  pendingFiles = [];

  const dayLessons = lessonsCache.filter(x => x.day_of_week === selectedDay);
  const maxNum = dayLessons.length ? Math.max(...dayLessons.map(x => x.lesson_number)) : 0;
  const numVal = l ? l.lesson_number : maxNum + 1;
  const idArg = l ? l.id : 'null';

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-head">
      <h3>${l ? (isWin ? 'Окно в расписании' : 'Урок и ДЗ') : 'Добавить в расписание'}</h3>
      <button class="close-x" onclick="closeModal()">${ICON.close}</button>
    </div>
    <div class="stack">
      <div class="segmented" style="--cols:2;">
        <div class="seg-slider" id="editorTypeSlider" style="--idx:${isWin ? 1 : 0};"></div>
        <button type="button" id="edTypeLesson" class="${!isWin ? 'active' : ''}" onclick="switchEditorType('lesson')">Урок</button>
        <button type="button" id="edTypeWindow" class="${isWin ? 'active' : ''}" onclick="switchEditorType('window')">Окно (нет урока)</button>
      </div>

      <div class="row">
        <div class="field" style="width:92px;">
          <label>Урок №</label>
          <input id="edNum" type="number" min="1" max="12" value="${numVal}" oninput="updateAutoMetaPreview()" />
        </div>
        <div id="subjFieldWrap" class="field" style="flex:1;">
          <label>Предмет</label>
          <input id="edSubj" list="subjectSuggestions" type="text"
            value="${l && !isWin ? esc(l.subject) : ''}"
            placeholder="Введите предмет..." />
        </div>
      </div>

      <div id="autoMetaPreview" class="auto-meta"></div>

      <div class="field">
        <label id="hwLabel">Домашнее задание</label>
        <textarea id="edHw" placeholder="Что задали...">${l ? esc(l.homework) : ''}</textarea>
      </div>

      <label id="cancelFieldWrap" class="toggle-row">
        <input id="edCancel" type="checkbox" ${l?.is_cancelled ? 'checked' : ''} />
        <span>Урока не будет (отменён)</span>
      </label>

      <div id="photosFieldWrap" class="field">
        <label>Фотографии к ДЗ</label>
        <div id="edPhotoGrid" class="photo-grid"></div>
        <label class="upload-zone">
          ${ICON.photoSm}
          <span>Добавить фотографии</span>
          <input id="edPhotoFile" type="file" accept="image/*" multiple class="hidden" onchange="handleNewPhotos(this.files)" />
        </label>
      </div>

      <div id="edMsg" class="msg"></div>

      <div class="row" style="justify-content: space-between; margin-top:4px;">
        ${l ? `<button class="btn danger sm" onclick="deleteLesson(${l.id})">${ICON.trash}<span>Удалить</span></button>` : '<span></span>'}
        <div class="row" style="gap:6px;">
          <button class="btn secondary sm" onclick="closeModal()">Отмена</button>
          <button id="saveLessonBtn" class="btn sm" onclick="saveLesson(${idArg})">Сохранить</button>
        </div>
      </div>
    </div>
  `;

  const subjInput = document.getElementById('edSubj');
  subjInput.addEventListener('input', updateAutoMetaPreview);
  subjInput.addEventListener('change', updateAutoMetaPreview);

  switchEditorType(editorType);
  renderEditingPhotos();
  openModal();
}

function handleNewPhotos(fileList) {
  for (const file of fileList) {
    pendingFiles.push({ file, preview: URL.createObjectURL(file) });
  }
  renderEditingPhotos();
}

function renderEditingPhotos() {
  const grid = document.getElementById('edPhotoGrid');
  if (!grid) return;
  const savedHtml = editingPhotos.map((url, idx) => `
    <div class="photo-item">
      <img src="${esc(url)}" onclick="openLightbox('${esc(url)}')" />
      <button class="photo-del" onclick="editingPhotos.splice(${idx},1); renderEditingPhotos();">${ICON.close}</button>
    </div>
  `).join('');
  const pendingHtml = pendingFiles.map((item, idx) => `
    <div class="photo-item">
      <img src="${item.preview}" onclick="openLightbox('${item.preview}')" />
      <button class="photo-del" onclick="pendingFiles.splice(${idx},1); renderEditingPhotos();">${ICON.close}</button>
    </div>
  `).join('');
  grid.innerHTML = savedHtml + pendingHtml;
}

async function saveLesson(lessonId) {
  const btn = document.getElementById('saveLessonBtn');
  const msg = document.getElementById('edMsg');
  msg.textContent = '';

  const existing = lessonId ? lessonsCache.find(x => x.id === lessonId) : null;
  const day_of_week = existing ? existing.day_of_week : selectedDay;
  const lesson_number = parseInt(document.getElementById('edNum').value, 10) || 1;
  const lesson_time = LESSON_TIMES[lesson_number] || '';
  const homework = document.getElementById('edHw').value.trim();

  let payload;

  if (editorType === 'window') {
    payload = {
      day_of_week,
      lesson_number,
      subject: 'Нет урока',
      teacher: '',
      lesson_time,
      homework,
      is_cancelled: false,
      photo_urls: []
    };
  } else {
    const subject = document.getElementById('edSubj').value.trim();
    const is_cancelled = document.getElementById('edCancel').checked;

    if (!subject) { msg.textContent = 'Введите название предмета'; return; }

    const teacher = findTeacherForSubject(subject)
      || (existing && normSubj(existing.subject) === normSubj(subject) ? existing.teacher : '')
      || '';

    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    try {
      for (const item of pendingFiles) {
        const compressed = await compressImage(item.file, 1280, 0.78);
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await db.storage.from('diary-photos').upload(path, compressed, {
          contentType: 'image/jpeg'
        });
        if (upErr) throw upErr;
        const { data: pub } = db.storage.from('diary-photos').getPublicUrl(path);
        editingPhotos.push(pub.publicUrl);
      }
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Сохранить';
      return;
    }

    payload = { day_of_week, lesson_number, subject, teacher, lesson_time, homework, is_cancelled, photo_urls: editingPhotos };
  }

  btn.disabled = true;
  btn.textContent = 'Сохранение...';

  try {
    const { error } = lessonId
      ? await db.from('lessons').update(payload).eq('id', lessonId)
      : await db.from('lessons').insert([payload]);

    if (error) throw error;

    closeModal();
    await loadHwData();
  } catch (err) {
    msg.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Сохранить';
  }
}

async function deleteLesson(lessonId) {
  if (!confirm('Удалить эту запись из расписания?')) return;
  const { error } = await db.from('lessons').delete().eq('id', lessonId);
  if (error) { alert('Не удалось удалить: ' + error.message); return; }
  closeModal();
  await loadHwData();
}