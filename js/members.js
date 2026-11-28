let membersCache = [];

async function loadMembers(silent = false) {
  const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: true });
  const list = document.getElementById('membersList');
  if (error) {
    if (!silent) list.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    return;
  }

  const order = { super_admin: 0, admin: 1, user: 2 };
  data.sort((a, b) => (order[a.role] ?? 2) - (order[b.role] ?? 2));

  if (silent && JSON.stringify(data) === JSON.stringify(membersCache)) return;
  membersCache = data;
  renderMembers();
}

function renderMembers() {
  const list = document.getElementById('membersList');
  const labels = {
    super_admin: '<span class="badge orange">Главный админ</span>',
    admin: '<span class="badge blue">Админ</span>',
    user: '<span class="badge gray">Ученик</span>'
  };

  list.innerHTML = membersCache.map(u => {
    const isMe = u.id === currentUser.id;
    const canManage = isSuperAdmin() && u.role !== 'super_admin' && !isMe;
    const name = safeFullName(u);
    const photoHtml = u.avatar_url
      ? `<img src="${esc(u.avatar_url)}" alt="${esc(name)}" onclick="openLightbox('${esc(u.avatar_url)}')" />`
      : `<div class="member-photo-fallback">${esc(name[0].toUpperCase())}</div>`;

    return `
      <div class="member-card">
        <div class="member-photo">
          ${isMe ? '<span class="my-card-tag">Моя карточка</span>' : ''}
          ${photoHtml}
        </div>
        <div class="member-body">
          <div class="member-name">${esc(name)}</div>
          ${labels[u.role] || labels.user}
          ${canManage ? `
            <div class="member-action">
              <button class="btn ${u.role === 'admin' ? 'danger' : 'secondary'}"
                onclick="toggleAdminRole('${u.id}', '${u.role === 'admin' ? 'user' : 'admin'}')">
                ${u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function toggleAdminRole(userId, newRole) {
  const { error } = await db.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) alert('Ошибка: ' + error.message);
  else await loadMembers();
}