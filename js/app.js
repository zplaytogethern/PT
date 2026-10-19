// Đọc dữ liệu từ data/prices.json (do trang admin cập nhật) rồi hiển thị.
// Thêm ?preview=1 vào địa chỉ để xem bản nháp đang lưu trong trình duyệt admin.
(function () {
  const fmt = (n) => (n > 0 ? n.toLocaleString("vi-VN") + "đ" : "Liên hệ");
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  async function load() {
    if (new URLSearchParams(location.search).has("preview")) {
      const draft = localStorage.getItem("prices-draft");
      if (draft) return JSON.parse(draft);
    }
    const res = await fetch("data/prices.json?v=" + Date.now());
    if (!res.ok) throw new Error("Không đọc được prices.json");
    return res.json();
  }

  function render(data) {
    const tabs = document.getElementById("tabs");
    const content = document.getElementById("content");
    tabs.innerHTML = "";
    content.innerHTML = "";

    data.categories.forEach((cat) => {
      const tab = el("a", "", cat.title);
      tab.href = "#" + cat.id;
      tab.style.setProperty("--c", cat.color);
      tabs.appendChild(tab);

      const sec = el("section", "section");
      sec.id = cat.id;
      sec.style.setProperty("--c", cat.color);

      const head = el("div", "section-head");
      head.append(el("h2", "", cat.title));
      if (cat.note) head.append(el("p", "", cat.note));
      sec.appendChild(head);

      const grid = el("div", "grid");
      cat.items.forEach((it) => {
        const card = el("div", "item");
        const info = el("div");
        info.append(el("div", "item-name", it.name));
        if (it.note) info.append(el("div", "item-note", it.note));
        card.append(info, el("div", "item-price", fmt(it.price)));
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      content.appendChild(sec);
    });

    document.getElementById("updated").textContent = data.updated || "";
    const c = document.getElementById("contact");
    if (data.contact) {
      c.textContent = data.contact.label || "Liên hệ";
      c.href = data.contact.link || "#";
    }
  }

  load().then(render).catch((err) => {
    const content = document.getElementById("content");
    content.innerHTML = "";
    content.appendChild(
      el("p", "error", "Không tải được bảng giá. Vui lòng thử lại sau. (" + err.message + ")")
    );
  });
})();
