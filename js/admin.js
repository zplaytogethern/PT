/**
 * admin.js — Trang quản trị giá ZPlayN (Bilingual & User-Centric)
 *
 * TÍNH NĂNG:
 * 1. Đọc và lưu trữ song ngữ (Tiếng Việt & English) cho tất cả danh mục, dịch vụ và liên hệ.
 * 2. Nút "⚡ Tự động dịch EN" tự động điền bản tiếng Anh thông minh cho mọi mục còn thiếu.
 * 3. Hỗ trợ Xem thử (?preview=1), Tải file JSON về máy, hoặc Đẩy thẳng lên GitHub Pages.
 * 4. Kéo thả hoặc duyệt file prices.json để nhập dữ liệu.
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
    'hat-dua-hau--hat-giong': '🍉',
    'default': '🏷️',
  };

  /* ─── Từ điển tự động dịch tiếng Anh thông minh ─────────────────── */
  const TRANSLATE_MAP = {
    'nông trại': 'Farm',
    'thời tiết': 'Weather',
    'tim và sao': 'Hearts & Stars',
    'hạt dưa hấu (hạt giống)': 'Watermelon Seeds',
    'hạt dưa hấu ( hạt giống)': 'Watermelon Seeds',
    'hạt dưa hấu': 'Watermelon Seeds',
    'xu nông trại theo mốc, nhân sâm theo gói.': 'Farm coins by milestone, ginseng by pack.',
    'chọn số lượng thời tiết cần mua.': 'Choose the amount of weather to purchase.',
    'giá theo gói tim và sao.': 'Price by heart and star pack.',
    'hạt giống cây trồng chất lượng cao': 'High-quality crop seeds',
    'hạt giống cây trồng dưa hấu chất lượng cao': 'High-quality watermelon seeds',
    'hạt giống cây trồng dưa hấu chất lượng.': 'High-quality watermelon seeds.',
    'nhắn zalo 0388486348 hoặc bấm vào đây để vào ig': 'Message Zalo 0388486348 or tap here for Instagram',
    'giao nhanh qua trang cá nhân': 'Fast delivery to character profile',
    'gói 100 củ': 'Pack of 100 roots',
    '5% nhận ánh vàng, cầu vồng, ẩm ướt': '5% chance for Gold, Rainbow, Moist',
    'done thư cây phong': 'Delivered via Maple Tree mailbox',
    'done thư': 'Delivered via mailbox',
    'sale': 'SALE',
  };

  function smartTranslate(text) {
    if (!text) return '';
    const clean = String(text).trim();
    const lower = clean.toLowerCase();
    if (TRANSLATE_MAP[lower]) return TRANSLATE_MAP[lower];

    return clean
      .replace(/xu nông trại/gi, 'Farm Coins')
      .replace(/thời tiết tự chọn/gi, 'Custom Weather')
      .replace(/thời tiết/gi, 'Weather')
      .replace(/nhân sâm/gi, 'Ginseng')
      .replace(/hạt giống/gi, 'Seeds')
      .replace(/hạt dưa hấu/gi, 'Watermelon Seeds')
      .replace(/(\d+)\s*hạt/gi, '$1 Seeds')
      .replace(/(\d+)\s*củ/gi, '$1 Roots')
      .replace(/done thư cây phong/gi, 'Delivered via Maple Tree mailbox')
      .replace(/done thư/gi, 'Delivered via mailbox')
      .replace(/chừa 1 slot cho clone, tự chạy/gi, 'Leave 1 slot for clone, auto-run')
      .replace(/yêu cầu tên nhân vật và id game/gi, 'Character name & Game ID required')
      .replace(/yêu cầu tên nhân vật/gi, 'Character name required');
  }

  /* ─── i18n ──────────────────────────────────────────────────────── */
  const I18N = {
    vi: {
      heroTitle: 'Trang quản trị giá',
      heroSub: 'ZPlayN',
      draftNone: '💾 Chưa có thay đổi',
      draftDirty: '✏️ Có thay đổi chưa lưu',
      draftSaved: '✅ Đã lưu',
      btnAutoTranslate: '⚡ Tự động dịch EN',
      btnImport: '📂 Nhập JSON',
      btnPreview: '👁️ Xem thử',
      btnDownload: '⬇️ Tải JSON',
      btnAddCat: '➕ Thêm danh mục mới',
      btnPush: '☁️ Cập nhật lên GitHub',
      addService: '➕ Thêm dịch vụ',
      editCat: '✏️ Sửa danh mục',
      delCat: '🗑️ Xóa mục',
      labelNameVi: 'Tên dịch vụ (VI)',
      labelNameEn: 'Tên dịch vụ (EN)',
      labelNoteVi: 'Ghi chú (VI)',
      labelNoteEn: 'Ghi chú (EN)',
      labelDescVi: 'Mô tả (VI)',
      labelDescEn: 'Mô tả (EN)',
      labelPrice: 'Giá (0=Liên hệ)',
      contactSection: '⚙️ Cài đặt chung & Liên hệ',
      lblVersion: '🏷️ Số phiên bản (Version)',
      lblContactText: 'Chữ nút liên hệ (Tiếng Việt)',
      lblContactTextEn: 'Contact button text (English)',
      lblContactLink: 'Đường dẫn liên hệ (Zalo / Facebook / Instagram)',
      copyright: '© Bản quyền thuộc NguyenAnhZn',
      btnMagicTitle: 'Tự động dịch sang tiếng Anh',
    },
    en: {
      heroTitle: 'Price Admin Panel',
      heroSub: 'ZPlayN',
      draftNone: '💾 No changes yet',
      draftDirty: '✏️ Unsaved changes',
      draftSaved: '✅ Saved',
      btnAutoTranslate: '⚡ Auto-translate EN',
      btnImport: '📂 Import JSON',
      btnPreview: '👁️ Preview',
      btnDownload: '⬇️ Download JSON',
      btnAddCat: '➕ Add new category',
      btnPush: '☁️ Push to GitHub',
      addService: '➕ Add service',
      editCat: '✏️ Edit category',
      delCat: '🗑️ Delete',
      labelNameVi: 'Service Name (VI)',
      labelNameEn: 'Service Name (EN)',
      labelNoteVi: 'Note (VI)',
      labelNoteEn: 'Note (EN)',
      labelDescVi: 'Description (VI)',
      labelDescEn: 'Description (EN)',
      labelPrice: 'Price (0=Contact)',
      contactSection: '⚙️ General Settings & Contact',
      lblVersion: '🏷️ Version Number',
      lblContactText: 'Contact button text (Vietnamese)',
      lblContactTextEn: 'Contact button text (English)',
      lblContactLink: 'Contact link (Zalo / Facebook / Instagram)',
      copyright: '© Copyright belongs to NguyenAnhZn',
      btnMagicTitle: 'Auto-translate to English',
    },
  };

  let lang = 'vi';
  try {
    lang = localStorage.getItem('admin-lang') || (window.sessionStorage && sessionStorage.getItem('admin-lang')) || 'vi';
  } catch (e) { }

  const t = (key) => (I18N[lang] || I18N.vi)[key] || key;

  function applyLang() {
    const heroTitle = document.querySelector('.hero h1');
    const heroSub = document.querySelector('.hero-sub');
    if (heroTitle) heroTitle.textContent = t('heroTitle');
    if (heroSub) heroSub.textContent = t('heroSub');

    if ($('btnAutoTranslateAll')) $('btnAutoTranslateAll').textContent = t('btnAutoTranslate');
    if ($('btnImport')) $('btnImport').textContent = t('btnImport');
    if ($('btnPreview')) $('btnPreview').textContent = t('btnPreview');
    if ($('btnDownload')) $('btnDownload').textContent = t('btnDownload');
    if ($('btnAddCat')) $('btnAddCat').textContent = t('btnAddCat');
    if ($('btnPush')) $('btnPush').textContent = t('btnPush');

    if (!dirty && $('draftInfo')) $('draftInfo').textContent = t('draftNone');

    const contactSec = $('contactSectionTitle');
    if (contactSec) contactSec.textContent = t('contactSection');

    const toggle = $('langToggle');
    if (toggle) toggle.textContent = lang === 'vi' ? '🌐 ENG' : '🌐 VIE';

    if (data) draw();
  }

  /* ── Status Message ──────────────────────────────────────────── */
  const say = (text, type = 'ok') => {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  };

  /* ── Draft Info Bar ──────────────────────────────────────────── */
  const markDirty = () => {
    dirty = true;
    const info = $('draftInfo');
    if (info) {
      info.textContent = t('draftDirty');
      info.style.color = '#f78166';
    }
  };

  const markClean = () => {
    dirty = false;
    const info = $('draftInfo');
    if (info) {
      info.textContent = t('draftSaved');
      info.style.color = '#3fb950';
    }
  };

  /* ── Init Data ───────────────────────────────────────────────── */
  async function init() {
    const draft = localStorage.getItem('prices-draft');
    if (draft) {
      try {
        data = JSON.parse(draft);
        say('Đang mở bản nháp đã lưu trên máy. Nhấn "Tải JSON" hoặc "Cập nhật lên GitHub" để lưu.', 'info');
        markDirty();
      } catch (e) {
        localStorage.removeItem('prices-draft');
      }
    }

    if (!data) {
      const nonce = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const res = await fetch('data/prices.json?v=' + nonce, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      if (!res.ok) throw new Error('Không đọc được prices.json (HTTP ' + res.status + ')');
      data = await res.json();
    }

    ['ghOwner', 'ghRepo', 'ghBranch'].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v && $(k)) $(k).value = v;
    });
    const savedToken = sessionStorage.getItem('ghToken');
    if (savedToken && $('ghToken')) $('ghToken').value = savedToken;

    draw();
  }

  /* ── Draw Editor ─────────────────────────────────────────────── */
  function draw() {
    const box = $('editor');
    box.innerHTML = '';

    (data.categories || []).forEach((cat, ci) => {
      const icon = ICONS[cat.id] || ICONS.default;
      const wrap = document.createElement('section');
      wrap.className = 'cat';
      wrap.style.setProperty('--c', cat.color || '#58a6ff');

      wrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <h2>${icon} <span class="cat-title-text">${cat.title}</span> <small style="font-size:.8rem;color:var(--ink2);font-weight:400">(${cat.title_en || 'chưa có EN'})</small></h2>
          <div class="row" style="margin:0">
            <button type="button" class="b b-ghost" style="font-size:.76rem;padding:4px 10px" data-ci="${ci}" data-action="edit-cat">${t('editCat')}</button>
            <button type="button" class="b b-del" style="font-size:.76rem;padding:4px 10px" data-ci="${ci}" data-action="del-cat">${t('delCat')}</button>
          </div>
        </div>

        <div class="cat-notes-row">
          <label>Ghi chú danh mục (VI)
            <input type="text" data-ci="${ci}" data-action="cat-note" value="${escHtml(cat.note || '')}" placeholder="Ghi chú danh mục tiếng Việt…">
          </label>
          <label class="lbl-en">Category note (EN)
            <input type="text" data-ci="${ci}" data-action="cat-note-en" value="${escHtml(cat.note_en || '')}" placeholder="English category note…">
          </label>
        </div>

        <p class="cat-meta">
          Màu sắc danh mục:
          <input type="color" value="${cat.color || '#58a6ff'}" data-ci="${ci}" data-action="color" style="width:34px;height:24px;padding:0;border:none;background:none;cursor:pointer;vertical-align:middle">
          <span style="opacity:.6;font-size:.76rem">Mã ID: ${cat.id}</span>
        </p>

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

    box.onclick = handleBoxClick;
    box.oninput = handleBoxInput;

    if ($('contactLabel')) $('contactLabel').value = data.contact?.label || '';
    if ($('contactLabelEn')) $('contactLabelEn').value = data.contact?.label_en || '';
    if ($('contactLink')) $('contactLink').value = data.contact?.link || '';
    if ($('appVersion')) $('appVersion').value = data.version || '1.0';
  }

  function makeRow(it, ci, ii) {
    const r = document.createElement('div');
    r.className = 'r';
    r.dataset.ii = ii;
    r.dataset.ci = ci;

    r.innerHTML = `
      <div class="r-grid-top">
        <label>${t('labelNameVi')}
          <input type="text" data-k="name" value="${escHtml(it.name || '')}" placeholder="Tên dịch vụ tiếng Việt">
        </label>
        <label class="lbl-en">${t('labelNameEn')}
          <input type="text" data-k="name_en" value="${escHtml(it.name_en || '')}" placeholder="Service name in English">
        </label>
        <label>${t('labelPrice')}
          <input type="number" min="0" step="1000" data-k="price" value="${it.price || 0}">
        </label>
        <button type="button" class="b b-del" data-ci="${ci}" data-ii="${ii}" data-action="del-item" title="Xóa dịch vụ">✕</button>
      </div>

      <div class="r-grid-bot">
        <label>${t('labelNoteVi')}
          <input type="text" data-k="note" value="${escHtml(it.note || '')}" placeholder="Ghi chú (vd: SALE)">
        </label>
        <label class="lbl-en">${t('labelNoteEn')}
          <input type="text" data-k="note_en" value="${escHtml(it.note_en || '')}" placeholder="Note (e.g. SALE)">
        </label>
        <label>${t('labelDescVi')}
          <input type="text" data-k="description" value="${escHtml(it.description || '')}" placeholder="Mô tả dịch vụ…">
        </label>
        <label class="lbl-en">${t('labelDescEn')}
          <input type="text" data-k="description_en" value="${escHtml(it.description_en || '')}" placeholder="English description…">
        </label>
        <button type="button" class="b b-magic" data-ci="${ci}" data-ii="${ii}" data-action="translate-item" title="${t('btnMagicTitle')}">⚡ Dịch EN</button>
      </div>
    `;
    return r;
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── Event Handlers ──────────────────────────────────────────── */
  function handleBoxClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const ci = Number(btn.dataset.ci);
    const ii = Number(btn.dataset.ii);
    const action = btn.dataset.action;

    if (action === 'del-item') {
      data.categories[ci].items.splice(ii, 1);
      draw();
      markDirty();
    } else if (action === 'add-item') {
      data.categories[ci].items.push({
        name: '',
        name_en: '',
        note: '',
        note_en: '',
        description: '',
        description_en: '',
        price: 0,
      });
      draw();
      markDirty();
    } else if (action === 'translate-item') {
      const it = data.categories[ci].items[ii];
      if (it.name && !it.name_en) it.name_en = smartTranslate(it.name);
      if (it.note && !it.note_en) it.note_en = smartTranslate(it.note);
      if (it.description && !it.description_en) it.description_en = smartTranslate(it.description);
      draw();
      markDirty();
      say('✨ Đã tự động dịch dịch vụ "' + (it.name || '') + '" sang tiếng Anh!', 'ok');
    } else if (action === 'del-cat') {
      if (confirm('Bạn chắc chắn muốn xóa toàn bộ danh mục "' + data.categories[ci].title + '"?')) {
        data.categories.splice(ci, 1);
        draw();
        markDirty();
      }
    } else if (action === 'edit-cat') {
      const cat = data.categories[ci];
      const newTitle = prompt('Tên danh mục (Tiếng Việt):', cat.title);
      if (newTitle !== null && newTitle.trim()) {
        cat.title = newTitle.trim();
        const newTitleEn = prompt('Category name (English):', cat.title_en || smartTranslate(cat.title));
        if (newTitleEn !== null) cat.title_en = newTitleEn.trim();
        draw();
        markDirty();
      }
    }
  }

  function handleBoxInput(e) {
    const inp = e.target;
    if (!inp.matches('input')) return;
    markDirty();

    const action = inp.dataset.action;
    const ci = Number(inp.dataset.ci);

    if (action === 'color') {
      data.categories[ci].color = inp.value;
      inp.closest('.cat').style.setProperty('--c', inp.value);
      return;
    }

    if (action === 'cat-note') {
      data.categories[ci].note = inp.value;
      return;
    }

    if (action === 'cat-note-en') {
      data.categories[ci].note_en = inp.value;
      return;
    }

    const k = inp.dataset.k;
    if (!k) return;
    const r = inp.closest('.r');
    if (!r) return;
    const rows = inp.closest('.rows');
    const rCi = Number(rows.dataset.ci);
    const rIi = Number(r.dataset.ii);
    if (data.categories[rCi] && data.categories[rCi].items[rIi]) {
      data.categories[rCi].items[rIi][k] = k === 'price' ? (Number(inp.value) || 0) : inp.value;
    }
  }

  /* ── Collect Current State ───────────────────────────────────── */
  function collect() {
    data.contact = {
      label: $('contactLabel') ? $('contactLabel').value.trim() : '',
      label_en: $('contactLabelEn') ? $('contactLabelEn').value.trim() : '',
      link: $('contactLink') ? $('contactLink').value.trim() : '',
    };
    if ($('appVersion')) {
      data.version = $('appVersion').value.trim() || '1.0';
    }
    data.updated = new Date().toISOString().slice(0, 10);
    return JSON.stringify(data, null, 2) + '\n';
  }

  /* ── Nút Tự Động Dịch Toàn Bộ EN ──────────────────────────────── */
  const btnAutoTranslateAll = $('btnAutoTranslateAll');
  if (btnAutoTranslateAll) {
    btnAutoTranslateAll.onclick = () => {
      let count = 0;
      (data.categories || []).forEach((cat) => {
        if (!cat.title_en && cat.title) {
          cat.title_en = smartTranslate(cat.title);
          count++;
        }
        if (!cat.note_en && cat.note) {
          cat.note_en = smartTranslate(cat.note);
          count++;
        }
        (cat.items || []).forEach((it) => {
          if (!it.name_en && it.name) {
            it.name_en = smartTranslate(it.name);
            count++;
          }
          if (!it.note_en && it.note) {
            it.note_en = smartTranslate(it.note);
            count++;
          }
          if (!it.description_en && it.description) {
            it.description_en = smartTranslate(it.description);
            count++;
          }
        });
      });

      if (data.contact && !data.contact.label_en && data.contact.label) {
        data.contact.label_en = smartTranslate(data.contact.label);
        count++;
      }

      draw();
      markDirty();
      say(`🎉 Đã tự động điền bản tiếng Anh cho ${count} trường còn thiếu!`, 'ok');
    };
  }

  /* ── Thêm Danh Mục Mới ────────────────────────────────────────── */
  $('btnAddCat').onclick = () => {
    const title = prompt(lang === 'vi' ? 'Tên danh mục mới (Tiếng Việt):' : 'New category name (Vietnamese):');
    if (!title || !title.trim()) return;

    const titleEn = prompt(lang === 'vi' ? 'Tên danh mục bằng tiếng Anh:' : 'Category name in English:', smartTranslate(title.trim())) || '';

    const id = title.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    data.categories.push({
      id,
      title: title.trim(),
      title_en: titleEn.trim(),
      color: '#58a6ff',
      note: '',
      note_en: '',
      items: []
    });

    draw();
    markDirty();
  };

  /* ── Nhập File JSON ──────────────────────────────────────────── */
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

  $('btnImport').onclick = () => $('fileInput').click();
  $('fileInput').onchange = (e) => handleFileImport(e.target.files[0]);

  const importZone = $('importZone');
  if (importZone) {
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

  /* ── Xem Thử ─────────────────────────────────────────────────── */
  $('btnPreview').onclick = () => {
    localStorage.setItem('prices-draft', collect());
    window.open('index.html?preview=1', '_blank');
    say('👁️ Đã lưu nháp và mở trang xem thử. Khách xem web thật vẫn thấy giá cũ cho đến khi bạn Cập nhật lên GitHub.', 'info');
  };

  /* ── Tải File JSON ───────────────────────────────────────────── */
  $('btnDownload').onclick = () => {
    const blob = new Blob([collect()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prices.json';
    a.click();
    URL.revokeObjectURL(a.href);
    say('⬇️ Đã tải file prices.json. Hãy thay file trong thư mục data/ rồi commit & push.', 'ok');
    markClean();
  };

  /* ── Base64 Encode An Toàn UTF-8 ─────────────────────────────── */
  const b64 = (str) => {
    let bin = '';
    new TextEncoder().encode(str).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  /* ── Progress Bar ────────────────────────────────────────────── */
  const progress = {
    show: () => {
      $('progressWrap').style.display = 'block';
      $('progressBar').style.width = '0%';
    },
    set: (pct) => { $('progressBar').style.width = pct + '%'; },
    hide: () => { setTimeout(() => { $('progressWrap').style.display = 'none'; }, 600); },
  };

  /* ── Đẩy Lên GitHub ──────────────────────────────────────────── */
  $('btnPush').onclick = async () => {
    const owner = $('ghOwner').value.trim();
    const repo = $('ghRepo').value.trim();
    const branch = $('ghBranch').value.trim() || 'main';
    const token = $('ghToken').value.trim();

    if (!owner || !repo || !token) {
      return say('⚠️ Hãy nhập đủ tài khoản GitHub, tên repo và token.', 'err');
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
      progress.show();
      progress.set(25);

      const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
      progress.set(50);

      if (!cur.ok && cur.status !== 404) {
        const errBody = await cur.json().catch(() => ({}));
        throw new Error(`Không đọc được repo (HTTP ${cur.status}): ${errBody.message || ''}`);
      }
      const sha = cur.ok ? (await cur.json()).sha : undefined;
      progress.set(70);

      say('⏳ Đang đẩy dữ liệu song ngữ lên GitHub…', 'info');
      const body = {
        message: `Cập nhật bảng giá song ngữ ${new Date().toLocaleDateString('vi-VN')}`,
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

      progress.set(100);
      progress.hide();
      localStorage.removeItem('prices-draft');
      markClean();
      say('🎉 Đã cập nhật thành công lên GitHub! Bảng giá sẽ hiển thị mới nhất sau khoảng 1–2 phút.', 'ok');
    } catch (e) {
      progress.hide();
      say('❌ ' + e.message, 'err');
    } finally {
      $('btnPush').disabled = false;
    }
  };

  /* ── Contact & Version Fields Listeners ──────────────────────── */
  ['contactLabel', 'contactLabelEn', 'contactLink', 'appVersion'].forEach((id) => {
    $(id)?.addEventListener('input', markDirty);
  });

  /* ── Đổi Ngôn Ngữ Admin ──────────────────────────────────────── */
  const toggle = $('langToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      lang = lang === 'vi' ? 'en' : 'vi';
      try {
        localStorage.setItem('admin-lang', lang);
        sessionStorage.setItem('admin-lang', lang);
      } catch (e) { }
      applyLang();
    });
  }

  /* ── Cảnh báo khi rời trang nếu chưa lưu ──────────────────────── */
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = 'Bạn có thay đổi chưa lưu. Bạn chắc muốn rời trang?';
    }
  });

  /* ── Boot ────────────────────────────────────────────────────── */
  init().catch((e) => say('❌ Không tải được dữ liệu: ' + e.message, 'err'));
  window.addEventListener('load', () => applyLang());
})();
