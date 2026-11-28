let bugsCache = [];
let bugsLoadedOnce = false;
let pendingBugMedia = [];

const BUG_STATUSES = {
  pending: { label: 'На проверке', badgeClass: 'orange' },
  in_progress: { label: 'Решается', badgeClass: 'blue' },
  resolved: { label: 'Решено', badgeClass: 'green' }
};

function formatBugTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function normalizeBugMedia(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(item => {
    if (typeof item === 'string') {
      const isVid = /\.(mp4|mov|webm|m4v|ogg)(\?|$)/i.test(item);
      return { url: item, type: isVid ? 'video' : 'image' };
    }
    return {
      url: item?.url || '',
      type: item?.type === 'video' ? 'video' : 'image'
    };
  }).filter(x => x.url);
}

async function loadBugs(silent = false) {
  const list = document.getElementById('bugsList');
  const { data, error } = await db
    .from('bug_reports')
    .select('*, profiles(full_name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    if (!silent && list) list.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  const rows = data || [];
  if (silent && JSON.stringify(rows) === JSON.stringify(bugsCache)) return;
  bugsCache = rows;
  renderBugs();
}

function renderBugs() {
  const list = document.getElementById('bugsList');
  if (!list) return;

  const ownerView = isSuperAdmin();
  const visibleBugs = ownerView
    ? bugsCache
    : bugsCache.filter(b => b.user_id === currentUser.id);

  if (!visibleBugs.length) {
    list.innerHTML = `
      <div class="empty">
        <div>${ownerView ? 'Пока никто не отправлял баги' : 'Вы ещё не отправляли баги'}</div>
        <button class="btn sm" onclick="openBugModal()">${ICON.plus}<span>Сообщить о баге</span></button>
      </div>
    `;
    return;
  }

  list.innerHTML = visibleBugs.map(b => {
    const st = BUG_STATUSES[b.status] || BUG_STATUSES.pending;
    const media = normalizeBugMedia(b.media_urls);
    const authorName = (b.profiles?.full_name || 'Пользователь').trim();
    const authorAvatar = b.profiles?.avatar_url
      ? `<img src="${esc(b.profiles.avatar_url)}" alt="${esc(authorName)}" onclick="openLightbox('${esc(b.profiles.avatar_url)}')" />`
      : esc(authorName[0].toUpperCase());

    const mediaHtml = media.length ? `
      <div class="bug-media-grid">
        ${media.map(m => m.type === 'video'
          ? `<div class="bug-media-item video"><video src="${esc(m.url)}" controls playsinline preload="metadata"></video></div>`
          : `<div class="bug-media-item"><img src="${esc(m.url)}" alt="Фото бага" onclick="openLightbox('${esc(m.url)}')" /></div>`
        ).join('')}
      </div>
    ` : '';

    return `
      <article class="bug-card">
        <div class="bug-card-top">
          ${ownerView ? `
            <div class="bug-author">
              <div class="bug-avatar">${authorAvatar}</div>
              <div>
                <div class="bug-author-name">${esc(authorName)}</div>
                <div class="bug-time">${esc(formatBugTime(b.created_at))}</div>
              </div>
            </div>
          ` : `
            <div class="bug-time">${esc(formatBugTime(b.created_at))}</div>
          `}
          <span class="badge ${st.badgeClass}">${st.label}</span>
        </div>

        <div class="bug-title">${esc(b.title)}</div>

        ${b.description ? `<div class="bug-text">${linkifyText(b.description)}</div>` : ''}

        ${b.steps ? `
          <div class="bug-steps">
            <div class="bug-steps-label">Путь воспроизведения</div>
            <div>${esc(b.steps)}</div>
          </div>
        ` : ''}

        ${mediaHtml}

        ${ownerView ? `
          <div class="bug-admin-bar">
            <div class="segmented bug-status-seg" style="--cols:3;">
              <div class="seg-slider" style="--idx:${b.status === 'in_progress' ? 1 : b.status === 'resolved' ? 2 : 0};"></div>
              <button type="button" class="${b.status === 'pending' ? 'active' : ''}" onclick="updateBugStatus(${b.id}, 'pending')">На проверке</button>
              <button type="button" class="${b.status === 'in_progress' ? 'active' : ''}" onclick="updateBugStatus(${b.id}, 'in_progress')">Решается</button>
              <button type="button" class="${b.status === 'resolved' ? 'active' : ''}" onclick="updateBugStatus(${b.id}, 'resolved')">Решено</button>
            </div>
            <button type="button" class="btn danger sm bug-del-btn" onclick="deleteBug(${b.id})" title="Удалить">
              ${ICON.trash}
            </button>
          </div>
        ` : ''}
      </article>
    `;
  }).join('');
}

function openBugModal() {
  pendingBugMedia = [];

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-head">
      <h3>Отправить баг</h3>
      <button class="close-x" onclick="closeModal()">${ICON.close}</button>
    </div>
    <div class="stack">
      <div class="field">
        <label>Название бага</label>
        <input id="bugTitleInput" type="text" placeholder="Коротко: что сломалось" />
      </div>

      <div class="field">
        <label>Описание</label>
        <textarea id="bugDescInput" placeholder="Опишите проблему подробнее..."></textarea>
      </div>

      <div class="field">
        <label>Путь воспроизведения</label>
        <textarea id="bugStepsInput" style="min-height:74px;" placeholder="1. Открыл вкладку...&#10;2. Нажал на...&#10;3. Произошло..."></textarea>
      </div>

      <div class="field">
        <label>Фото или видео</label>
        <div id="bugMediaPreview" class="photo-grid"></div>
        <label class="upload-zone">
          ${ICON.photoSm}
          <span>Прикрепить фото или видео</span>
          <input type="file" accept="image/*,video/*" multiple class="hidden" onchange="handleBugMediaSelect(this.files); this.value='';" />
        </label>
      </div>

      <div id="bugMsg" class="msg"></div>

      <div class="row" style="justify-content:flex-end; gap:8px; margin-top:4px;">
        <button class="btn secondary sm" onclick="closeModal()">Отмена</button>
        <button id="sendBugBtn" class="btn sm" onclick="submitBugReport()">Отправить</button>
      </div>
    </div>
  `;
  openModal();
}

function handleBugMediaSelect(fileList) {
  const msg = document.getElementById('bugMsg');
  if (msg) msg.textContent = '';

  for (const file of fileList) {
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 45 * 1024 * 1024) {
      if (msg) msg.textContent = 'Видео должно быть не больше 45 МБ';
      continue;
    }
    pendingBugMedia.push({
      file,
      type: isVideo ? 'video' : 'image',
      preview: URL.createObjectURL(file)
    });
  }
  renderBugMediaPreview();
}

function renderBugMediaPreview() {
  const grid = document.getElementById('bugMediaPreview');
  if (!grid) return;

  grid.innerHTML = pendingBugMedia.map((item, idx) => `
    <div class="photo-item">
      ${item.type === 'video'
        ? `<video src="${item.preview}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video><span class="video-pill">Видео</span>`
        : `<img src="${item.preview}" onclick="openLightbox('${item.preview}')" alt="" />`
      }
      <button type="button" class="photo-del" onclick="removePendingBugMedia(${idx})">${ICON.close}</button>
    </div>
  `).join('');
}

function removePendingBugMedia(idx) {
  const item = pendingBugMedia[idx];
  if (item?.preview) URL.revokeObjectURL(item.preview);
  pendingBugMedia.splice(idx, 1);
  renderBugMediaPreview();
}

async function submitBugReport() {
  const btn = document.getElementById('sendBugBtn');
  const msg = document.getElementById('bugMsg');
  msg.textContent = '';

  const title = document.getElementById('bugTitleInput').value.trim();
  const description = document.getElementById('bugDescInput').value.trim();
  const steps = document.getElementById('bugStepsInput').value.trim();

  if (!title) {
    msg.textContent = 'Введите название бага';
    return;
  }

  btn.disabled = true;
  btn.textContent = pendingBugMedia.length ? 'Загрузка файлов...' : 'Отправка...';

  try {
    const uploadedMedia = [];

    for (const item of pendingBugMedia) {
      let bodyToUpload = item.file;
      let ext = (item.file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      let contentType = item.file.type || 'application/octet-stream';

      if (item.type === 'image') {
        bodyToUpload = await compressImage(item.file, 1280, 0.78);
        ext = 'jpg';
        contentType = 'image/jpeg';
      }

      const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await db.storage.from('bug-media').upload(path, bodyToUpload, { contentType });
      if (upErr) throw upErr;

      const { data: pub } = db.storage.from('bug-media').getPublicUrl(path);
      uploadedMedia.push({ url: pub.publicUrl, type: item.type });
    }

    const { error } = await db.from('bug_reports').insert([{
      user_id: currentUser.id,
      title,
      description,
      steps,
      media_urls: uploadedMedia,
      status: 'pending'
    }]);

    if (error) throw error;

    pendingBugMedia.forEach(i => i.preview && URL.revokeObjectURL(i.preview));
    pendingBugMedia = [];
    closeModal();
    await loadBugs();
    showToast('Баг отправлен — статус «На проверке»');
  } catch (err) {
    msg.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }
}

async function updateBugStatus(bugId, newStatus) {
  const item = bugsCache.find(b => b.id === bugId);
  if (!item || item.status === newStatus) return;

  const prevStatus = item.status;
  item.status = newStatus;
  renderBugs();

  const { error } = await db.from('bug_reports').update({ status: newStatus }).eq('id', bugId);
  if (error) {
    item.status = prevStatus;
    renderBugs();
    alert('Не удалось обновить статус: ' + error.message);
  } else {
    showToast(`Статус: ${BUG_STATUSES[newStatus].label}`);
  }
}

async function deleteBug(bugId) {
  if (!confirm('Удалить этот отчёт о баге?')) return;
  const { error } = await db.from('bug_reports').delete().eq('id', bugId);
  if (error) {
    alert('Ошибка удаления: ' + error.message);
    return;
  }
  await loadBugs();
  showToast('Отчёт удалён');
}
