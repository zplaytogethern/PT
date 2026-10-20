/**
 * admin.js — Trang quản trị giá ZPlayN
 *
 * LUỒNG HOẠT ĐỘNG:
 * 1. Load prices.json từ file local (data/prices.json) hoặc localStorage (nháp)
 * 2. Admin chỉnh sửa trực tiếp trên form
 * 3. Lưu / xuất:
 *    a) "Xem thử"     → lưu vào localStorage, mở index.html?preview=1
 *    b) "Tải JSON"    → tải file prices.json về máy (cách an toàn nhất cho local)
 *    c) "Đẩy GitHub"  → gọi GitHub Contents API để push trực tiếp
 *    d) "Nhập JSON"   → import file prices.json đã chỉnh tay
 *
 * FIX BUG "giá không lên web":
 * - Web tĩnh chạy local → không thể tự cập nhật file. Phải dùng "Tải JSON"
 *   rồi thay thủ công, HOẶC push lên GitHub Pages.
 * - Đã thêm cảnh báo rõ ràng trong giao diện.
 *
 * i18n: Hỗ trợ tiếng Việt (VIE) và tiếng Anh (ENG).
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const msg = $('msg');
  let data = null;
  let dirty = false;

  const ICONS = {
    'nong-trai': '🌾',
    'thoi-tiet': '⛅',
    'tim-sao': '💖',
  };

  /* ── i18n ────────────────────────────────────────────────────── */
  const I18N = {
    vi: {
      heroTitle: 'Trang quản trị giá',
      heroSub: 'ZPlayN',
      draftNone: '💾 Chưa có thay đổi',
      draftDirty: '✏️ Có thay đổi chưa lưu',
      draftSaved: '✅ Đã lưu',
      btnImport: '📂 Nhập JSON',
      btnPreview: '👁️ Xem thử',
      btnDownload: '⬇️ Tải JSON',
      btnAddCat: '➕ Thêm danh mục mới',
      btnPush: '☁️ Cập nhật lên GitHub',
      addService: '➕ Thêm dịch vụ',
      editCat: '✏️ Sửa tên',
      delCat: '🗑️ Xóa mục',
      labelName: 'Tên dịch vụ',
      labelNote: 'Ghi chú',
      labelDesc: 'Mô tả dịch vụ',
      labelPrice: 'Giá (đồng, 0=Liên hệ)',
      contactSection: '📞 Liên hệ',
      contactLabelInput: 'Chữ trên nút liên hệ',
      contactLinkInput: 'Đường dẫn (Zalo / Facebook / Instagram)',
      syncSection: '🚀 Lưu và đồng bộ',
      importTitle: '📂 Nhập file prices.json',
      importHint: 'Nếu bạn đã tải file prices.json về máy, chỉnh sửa rồi muốn import lại — dùng nút này.',
      importZone: '📁 Kéo thả hoặc bấm để chọn file prices.json',
      ghTitle: '☁️ Đẩy thẳng lên GitHub Pages',
      ghOwner: 'Tài khoản GitHub',
      ghRepo: 'Tên repo',
      ghBranch: 'Nhánh',
      ghToken: 'Token',
      copyright: '© Bản quyền thuộc NguyenAnhZn',
    },
    en: {
      heroTitle: 'Price Admin Panel',
      heroSub: 'ZPlayN',
      draftNone: '💾 No changes yet',
      draftDirty: '✏️ Unsaved changes',
      draftSaved: '✅ Saved',
      btnImport: '📂 Import JSON',
      btnPreview: '👁️ Preview',
      btnDownload: '⬇️ Download JSON',
      btnAddCat: '➕ Add new category',
      btnPush: '☁️ Push to GitHub',
      addService: '➕ Add service',
      editCat: '✏️ Edit name',
      delCat: '🗑️ Delete',
      labelName: 'Service name',
      labelNote: 'Note',
      labelDesc: 'Service description',
      labelPrice: 'Price (VND, 0=Contact)',
      contactSection: '📞 Contact',
      contactLabelInput: 'Contact button text',
      contactLinkInput: 'Link (Zalo / Facebook / Instagram)',
      syncSection: '🚀 Save & Sync',
      importTitle: '📂 Import prices.json',
      importHint: 'If you already downloaded prices.json and edited it locally, use this to reimport.',
      importZone: '📁 Drag & drop or click to select prices.json',
      ghTitle: '☁️ Push directly to GitHub Pages',
      ghOwner: 'GitHub username',
      ghRepo: 'Repository name',
      ghBranch: 'Branch',
      ghToken: 'Token',
      copyright: '© Copyright belongs to NguyenAnhZn',
    },
  };

  try { localStorage.removeItem('admin-lang'); } catch (e) {}
  let lang = (window.sessionStorage && sessionStorage.getItem('admin-lang')) || 'vi';
  const t = (key) => (I18N[lang] || I18N.vi)[key] || key;

  function applyLang() {
    // Hero
    const heroTitle = document.querySelector('.hero h1');
    const heroSub = document.querySelector('.hero-sub');
    if (heroTitle) heroTitle.textContent = t('heroTitle');
    if (heroSub) heroSub.textContent = t('heroSub');
    // Top buttons
    if ($('btnImport')) $('btnImport').innerHTML = t('btnImport');
    if ($('btnPreview')) $('btnPreview').innerHTML = t('btnPreview');
    if ($('btnDownload')) $('btnDownload').innerHTML = t('btnDownload');
    if ($('btnAddCat')) $('btnAddCat').innerHTML = t('btnAddCat');
    if ($('btnPush')) $('btnPush').innerHTML = t('btnPush');
    // Draft info
    if (!dirty && $('draftInfo')) $('draftInfo').textContent = t('draftNone');
    // Contact section
    const contactSec = document.querySelector('.panel h2');
    if (contactSec) contactSec.textContent = t('contactSection');
    // Copyright
    const copyrightEl = $('adminCopyright');
    if (copyrightEl) copyrightEl.textContent = t('copyright');
    // Lang toggle
    const toggle = $('langToggle');
    if (toggle) toggle.textContent = lang === 'vi' ? '🌐 ENG' : '🌐 VIE';
    // Redraw editor to update labels
    if (data) draw();
  }

  /* ── Init lang toggle ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = $('langToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        lang = lang === 'vi' ? 'en' : 'vi';
        try { sessionStorage.setItem('admin-lang', lang); } catch (e) {}
        applyLang();
      });
    }
  });

  /* ── Status message ──────────────────────────────────────────── */
  const say = (text, type = 'ok') => {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  };

  /* ── Draft info bar ──────────────────────────────────────────── */
  const markDirty = () => {
    dirty = true;
    $('draftInfo').textContent = t('draftDirty');
    $('draftInfo').style.color = '#f78166';
  };
  const markClean = () => {
    dirty = false;
    $('draftInfo').textContent = t('draftSaved');
    $('draftInfo').style.color = '#3fb950';
  };

  /* ── Load ────────────────────────────────────────────────────── */
  async function init() {
    // Ưu tiên nháp đang soạn
    const draft = localStorage.getItem('prices-draft');
    if (draft) {
      data = JSON.parse(draft);
      say('Đang mở bản nháp đã lưu. Nhấn "Tải JSON" để xuất hoặc "Đẩy GitHub" để cập nhật web.', 'info');
      markDirty();
    } else {
      const res = await fetch('data/prices.json?v=' + Date.now());
      if (!res.ok) throw new Error('Không đọc được prices.json (HTTP ' + res.status + ')');
      data = await res.json();
    }

    // Khôi phục thông tin GitHub từ localStorage
    ['ghOwner', 'ghRepo', 'ghBranch'].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v && $(k)) $(k).value = v;
    });
    const savedToken = sessionStorage.getItem('ghToken');
    if (savedToken && $('ghToken')) $('ghToken').value = savedToken;

    draw();
  }

  /* ── Draw editor ─────────────────────────────────────────────── */
  function draw() {
    const box = $('editor');
    box.innerHTML = '';

    data.categories.forEach((cat, ci) => {
      const icon = ICONS[cat.id] || '🏷️';
      const wrap = document.createElement('section');
      wrap.className = 'cat';
      wrap.style.setProperty('--c', cat.color || '#58a6ff');
      wrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <h2>${icon} <span class="cat-title-text">${cat.title}</span></h2>
          <div class="row" style="margin:0">
            <button type="button" class="b b-ghost" style="font-size:.78rem;padding:5px 12px" data-ci="${ci}" data-action="edit-cat">${t('editCat')}</button>
            <button type="button" class="b b-del" style="font-size:.78rem;padding:5px 12px" data-ci="${ci}" data-action="del-cat">${t('delCat')}</button>
          </div>
        </div>
        <p class="cat-meta">Màu: <input type="color" value="${cat.color || '#58a6ff'}" data-ci="${ci}" data-action="color" style="width:36px;height:26px;padding:1px;border:none;background:none;cursor:pointer;vertical-align:middle"></p>
        <div class="rows" data-ci="${ci}"></div>
      `;
      const rows = wrap.querySelector('.rows');

      (cat.items || []).forEach((it, ii) => {
        rows.appendChild(makeRow(it, ci, ii));
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'b b-ghost b-add';
      addBtn.innerHTML = t('addService');
      addBtn.dataset.ci = ci;
      addBtn.dataset.action = 'add-item';
      wrap.appendChild(addBtn);
      box.appendChild(wrap);
    });

    // --- Event delegation ---
    box.onclick = handleBoxClick;
    box.oninput = handleBoxInput;

    $('contactLabel').value = data.contact?.label || '';
    $('contactLink').value = data.contact?.link || '';
  }

  function makeRow(it, ci, ii) {
    const r = document.createElement('div');
    r.className = 'r';
    r.innerHTML = `
      <label>${t('labelName')}<input type="text" data-k="name" value="${escHtml(it.name || '')}"></label>
      <label>${t('labelNote')}<input type="text" data-k="note" value="${escHtml(it.note || '')}"></label>
      <label>${t('labelDesc')}<input type="text" data-k="description" value="${escHtml(it.description || '')}" placeholder="${lang === 'vi' ? 'Mô tả ngắn về dịch vụ…' : 'Short description…'}"></label>
      <label>${t('labelPrice')}<input type="number" min="0" step="1000" data-k="price" value="${it.price || 0}"></label>
      <button type="button" class="b b-del x" data-ci="${ci}" data-ii="${ii}" data-action="del-item">✕</button>
    `;
    return r;
  }

  function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── Event handlers ──────────────────────────────────────────── */
  function handleBoxClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const ci = Number(btn.dataset.ci);
    const ii = Number(btn.dataset.ii);
    const action = btn.dataset.action;

    if (action === 'del-item') {
      data.categories[ci].items.splice(ii, 1);
      draw(); markDirty();
    } else if (action === 'add-item') {
      data.categories[ci].items.push({ name: '', note: '', description: '', price: 0 });
      draw(); markDirty();
    } else if (action === 'del-cat') {
      if (confirm('Xóa toàn bộ danh mục "' + data.categories[ci].title + '"?')) {
        data.categories.splice(ci, 1);
        draw(); markDirty();
      }
    } else if (action === 'edit-cat') {
      const newTitle = prompt('Nhập tên mới:', data.categories[ci].title);
      if (newTitle && newTitle.trim()) {
        data.categories[ci].title = newTitle.trim();
        draw(); markDirty();
      }
    }
  }

  function handleBoxInput(e) {
    const inp = e.target;
    if (!inp.matches('input')) return;
    markDirty();

    // Color picker
    if (inp.dataset.action === 'color') {
      const ci = Number(inp.dataset.ci);
      data.categories[ci].color = inp.value;
      inp.closest('.cat').style.setProperty('--c', inp.value);
      return;
    }

    // Item field
    const k = inp.dataset.k;
    if (!k) return;
    const r = inp.closest('.r');
    if (!r) return;
    const rows = inp.closest('.rows');
    const ci = Number(rows.dataset.ci);
    const ii = [...rows.querySelectorAll('.r')].indexOf(r);
    if (ii < 0) return;
    data.categories[ci].items[ii][k] = k === 'price' ? (Number(inp.value) || 0) : inp.value;
  }

  /* ── Collect current state ───────────────────────────────────── */
  function collect() {
    data.contact = {
      label: $('contactLabel').value.trim(),
      link: $('contactLink').value.trim(),
    };
    data.updated = new Date().toISOString().slice(0, 10);
    return JSON.stringify(data, null, 2) + '\n';
  }

  /* ── Add new category ────────────────────────────────────────── */
  $('btnAddCat').onclick = () => {
    const prompt_ = lang === 'vi' ? 'Tên danh mục mới:' : 'New category name:';
    const title = prompt(prompt_);
    if (!title || !title.trim()) return;
    const id = title.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    data.categories.push({ id, title: title.trim(), color: '#58a6ff', note: '', items: [] });
    draw(); markDirty();
  };

  /* ── Import JSON file ────────────────────────────────────────── */
  function handleFileImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.categories) throw new Error('File JSON không đúng định dạng (thiếu "categories")');
        data = parsed;
        draw();
        markDirty();
        say('✅ Đã nhập file ' + file.name + ' thành công!', 'ok');
      } catch (err) {
        say('❌ Lỗi đọc file: ' + err.message, 'err');
      }
    };
    reader.readAsText(file);
  }

  $('btnImport').onclick = () => $('fileInput2').click();
  $('fileInput2').onchange = (e) => handleFileImport(e.target.files[0]);

  // Import zone (drag & drop + click)
  const importZone = $('importZone');
  if (importZone) {
    $('fileInput').onchange = (e) => handleFileImport(e.target.files[0]);
    importZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importZone.style.borderColor = 'var(--accent)';
    });
    importZone.addEventListener('dragleave', () => {
      importZone.style.borderColor = '';
    });
    importZone.addEventListener('drop', (e) => {
      e.preventDefault();
      importZone.style.borderColor = '';
      handleFileImport(e.dataTransfer.files[0]);
    });
  }

  /* ── Preview ─────────────────────────────────────────────────── */
  $('btnPreview').onclick = () => {
    localStorage.setItem('prices-draft', collect());
    window.open('index.html?preview=1', '_blank');
    say('👁️ Đã lưu nháp. Xem thử đang mở. Web thật chưa thay đổi.', 'info');
  };

  /* ── Download JSON ───────────────────────────────────────────── */
  $('btnDownload').onclick = () => {
    const blob = new Blob([collect()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prices.json';
    a.click();
    URL.revokeObjectURL(a.href);
    say('⬇️ Đã tải prices.json. Hãy thay file trong thư mục data/ của repo rồi commit & push.', 'ok');
    markClean();
  };

  /* ── Base64 encode (UTF-8 safe) ──────────────────────────────── */
  const b64 = (str) => {
    let bin = '';
    new TextEncoder().encode(str).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  /* ── Progress bar helper ─────────────────────────────────────── */
  const progress = {
    show: () => {
      $('progressWrap').style.display = 'block';
      $('progressBar').style.width = '0%';
    },
    set: (pct) => { $('progressBar').style.width = pct + '%'; },
    hide: () => { setTimeout(() => { $('progressWrap').style.display = 'none'; }, 600); },
  };

  /* ── Push to GitHub ──────────────────────────────────────────── */
  $('btnPush').onclick = async () => {
    const owner = $('ghOwner').value.trim();
    const repo = $('ghRepo').value.trim();
    const branch = $('ghBranch').value.trim() || 'main';
    const token = $('ghToken').value.trim();

    if (!owner || !repo || !token) {
      return say('⚠️ Hãy nhập đủ tài khoản, tên repo và token.', 'err');
    }

    localStorage.setItem('ghOwner', owner);
    localStorage.setItem('ghRepo', repo);
    localStorage.setItem('ghBranch', branch);
    sessionStorage.setItem('ghToken', token);

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/data/prices.json`;
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    try {
      $('btnPush').disabled = true;
      say('⏳ Đang kết nối GitHub…', 'info');
      progress.show(); progress.set(20);

      // Lấy SHA của file hiện tại (cần để update)
      const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
      progress.set(50);

      if (!cur.ok && cur.status !== 404) {
        const errBody = await cur.json().catch(() => ({}));
        throw new Error(`Không đọc được repo (HTTP ${cur.status}): ${errBody.message || ''}`);
      }
      const sha = cur.ok ? (await cur.json()).sha : undefined;
      progress.set(70);

      say('⏳ Đang đẩy dữ liệu lên GitHub…', 'info');
      const body = {
        message: `Cập nhật bảng giá ${new Date().toLocaleDateString('vi-VN')}`,
        content: b64(collect()),
        branch,
      };
      if (sha) body.sha = sha;

      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
      progress.set(95);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`GitHub từ chối (HTTP ${res.status}): ${errBody.message || 'Kiểm tra token và quyền ghi.'}`);
      }

      progress.set(100); progress.hide();
      localStorage.removeItem('prices-draft');
      markClean();
      say('🎉 Đã cập nhật lên GitHub! Web sẽ hiển thị giá mới sau khoảng 1–2 phút (GitHub Pages cần build lại).', 'ok');
    } catch (e) {
      progress.hide();
      say('❌ ' + e.message, 'err');
    } finally {
      $('btnPush').disabled = false;
    }
  };

  /* ── Contact fields ──────────────────────────────────────────── */
  ['contactLabel', 'contactLink'].forEach((id) => {
    $(id)?.addEventListener('input', markDirty);
  });

  /* ── Warn before unload if dirty ─────────────────────────────── */
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = 'Bạn có thay đổi chưa lưu. Bạn chắc muốn rời trang?';
    }
  });

  /* ── Boot ────────────────────────────────────────────────────── */
  init().catch((e) => say('❌ Không tải được dữ liệu: ' + e.message, 'err'));

  /* ── Apply lang on boot ─────────────────────────────────────── */
  // Run after DOM ready (init has already rendered)
  window.addEventListener('load', () => applyLang());
})();
