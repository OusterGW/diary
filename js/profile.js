let currentUser = null;
let currentProfile = null;

const isAdmin = () => currentProfile && (currentProfile.role === 'admin' || currentProfile.role === 'super_admin');
const isSuperAdmin = () => currentProfile && currentProfile.role === 'super_admin';

async function loadMyProfile() {
  const { data } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data || { id: currentUser.id, email: currentUser.email, full_name: currentUser.email, role: 'user' };
  const admin = isAdmin();
  document.getElementById('addLessonBtn').classList.toggle('hidden', !admin);
  document.getElementById('adminScheduleBar').classList.toggle('hidden', !admin);
}

function renderProfilePage() {
  const container = document.getElementById('profileContent');
  if (!container || !currentProfile) return;

  const name = safeFullName(currentProfile);
  const roleLabels = { super_admin: 'Главный админ', admin: 'Админ', user: 'Ученик' };
  const roleCls = 'badge ' + (currentProfile.role === 'super_admin' ? 'orange' : currentProfile.role === 'admin' ? 'blue' : 'gray');
  const avatarHtml = currentProfile.avatar_url
    ? `<img src="${esc(currentProfile.avatar_url)}" alt="${esc(name)}" onclick="openLightbox('${esc(currentProfile.avatar_url)}')" />`
    : esc(name[0].toUpperCase());

  container.innerHTML = `
    <div class="profile-hero">
      <div class="profile-hero-avatar">${avatarHtml}</div>
      <button class="btn pill" onclick="openProfileEditModal()">
        ${ICON.edit}
        <span>Изменить</span>
      </button>
      <div class="profile-hero-name">${esc(name)}</div>
      <span class="${roleCls}">${roleLabels[currentProfile.role] || 'Ученик'}</span>
    </div>

    <button class="btn danger" style="width:100%;" onclick="signOut()">Выйти из аккаунта</button>
  `;
}

function renderProfilePhotoRow() {
  const slot = document.getElementById('photoRowSlot');
  if (!slot || !currentProfile) return;
  const hasPhoto = Boolean(currentProfile.avatar_url);

  slot.innerHTML = `
    <label class="photo-input-trigger">
      ${hasPhoto ? `<img class="photo-input-thumb" src="${esc(currentProfile.avatar_url)}" alt="" />` : ICON.photo}
      <span>${hasPhoto ? 'Изменить фото' : 'Выбрать фото'}</span>
      <input type="file" accept="image/*" class="hidden" onchange="uploadAvatar(this.files[0])" />
    </label>
    ${hasPhoto ? `
      <button type="button" id="delAvatarBtn" class="photo-input-del" onclick="deleteAvatar()">
        ${ICON.trash}
        <span>Удалить</span>
      </button>
    ` : ''}
  `;
}

function openProfileEditModal() {
  if (!currentProfile) return;
  const name = safeFullName(currentProfile);

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-head">
      <h3>Редактировать профиль</h3>
      <button class="close-x" onclick="closeModal()">${ICON.close}</button>
    </div>
    <div class="stack">
      <div class="field">
        <label>Фото</label>
        <div id="photoRowSlot" class="photo-input-row"></div>
      </div>

      <div class="field">
        <label>Имя</label>
        <input id="profNameInput" type="text" value="${esc(name)}" placeholder="Ваше имя" />
      </div>

      <div id="profMsg" class="msg"></div>

      <div class="row" style="justify-content:flex-end; gap:8px; margin-top:4px;">
        <button class="btn secondary sm" onclick="closeModal()">Отмена</button>
        <button id="saveProfBtn" class="btn sm" onclick="saveProfileName()">Сохранить</button>
      </div>
    </div>
  `;
  renderProfilePhotoRow();
  openModal();
}

async function uploadAvatar(file) {
  if (!file) return;
  const msg = document.getElementById('profMsg');
  msg.className = 'msg';
  msg.textContent = 'Загрузка фото...';

  try {
    const compressed = await compressImage(file, 500, 0.84);
    const path = `${currentUser.id}/${Date.now()}.jpg`;
    const { error: upErr } = await db.storage.from('avatars').upload(path, compressed, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true
    });
    if (upErr) throw upErr;

    const { data: pub } = db.storage.from('avatars').getPublicUrl(path);
    const { error: dbErr } = await db.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', currentUser.id);
    if (dbErr) throw dbErr;

    await loadMyProfile();
    renderProfilePage();
    renderProfilePhotoRow();
    loadMembers(true);

    msg.className = 'msg ok';
    msg.textContent = 'Фото обновлено';
  } catch (err) {
    msg.textContent = 'Ошибка: ' + err.message;
  }
}

async function deleteAvatar() {
  const msg = document.getElementById('profMsg');
  const btn = document.getElementById('delAvatarBtn');
  if (btn) btn.disabled = true;
  msg.className = 'msg';
  msg.textContent = '';

  try {
    const { error } = await db.from('profiles').update({ avatar_url: null }).eq('id', currentUser.id);
    if (error) throw error;

    await loadMyProfile();
    renderProfilePage();
    renderProfilePhotoRow();
    loadMembers(true);

    msg.className = 'msg ok';
    msg.textContent = 'Фото удалено';
  } catch (err) {
    msg.textContent = 'Ошибка: ' + err.message;
    if (btn) btn.disabled = false;
  }
}

async function saveProfileName() {
  const msg = document.getElementById('profMsg');
  const btn = document.getElementById('saveProfBtn');
  msg.className = 'msg';
  msg.textContent = '';

  const newName = document.getElementById('profNameInput').value.trim();
  if (!newName) { msg.textContent = 'Имя не может быть пустым'; return; }

  btn.disabled = true;
  btn.textContent = 'Сохранение...';

  const { error } = await db.from('profiles').update({ full_name: newName }).eq('id', currentUser.id);
  if (error) {
    msg.textContent = error.message;
    btn.disabled = false;
    btn.textContent = 'Сохранить';
    return;
  }

  await loadMyProfile();
  renderProfilePage();
  loadMembers(true);
  closeModal();
  showToast('Профиль обновлён');
}