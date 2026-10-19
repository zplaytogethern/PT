// Trang admin: sửa giá -> xem thử / tải file / đẩy thẳng lên GitHub.
(function () {
  const $ = (id) => document.getElementById(id);
  const msg = $("msg");
  let data = null;

  const say = (text, ok) => { msg.textContent = text; msg.className = "msg " + (ok ? "ok" : "err"); };

  async function init() {
    const draft = localStorage.getItem("prices-draft");
    if (draft) { data = JSON.parse(draft); say("Đang mở bản nháp đã lưu trong trình duyệt.", true); }
    else {
      const res = await fetch("data/prices.json?v=" + Date.now());
      data = await res.json();
    }
    ["ghOwner", "ghRepo", "ghBranch"].forEach((k) => {
      const v = localStorage.getItem(k); if (v) $(k).value = v;
    });
    $("ghToken").value = sessionStorage.getItem("ghToken") || "";
    draw();
  }

  function draw() {
    const box = $("editor");
    box.innerHTML = "";
    data.categories.forEach((cat) => {
      const wrap = document.createElement("section");
      wrap.className = "cat";
      wrap.style.setProperty("--c", cat.color);
      wrap.innerHTML = `<h2></h2><div class="rows"></div>`;
      wrap.querySelector("h2").textContent = cat.title;
      const rows = wrap.querySelector(".rows");

      cat.items.forEach((it, ii) => {
        const r = document.createElement("div");
        r.className = "r";
        r.innerHTML = `
          <label>Tên<input type="text" data-k="name"></label>
          <label>Ghi chú<input type="text" data-k="note"></label>
          <label>Giá (đồng, 0 = Liên hệ)<input type="number" min="0" step="1000" data-k="price"></label>
          <button type="button" class="b b-del x">Xóa</button>`;
        r.querySelectorAll("input").forEach((inp) => {
          inp.value = it[inp.dataset.k];
          inp.addEventListener("input", () => {
            it[inp.dataset.k] = inp.dataset.k === "price" ? Number(inp.value) || 0 : inp.value;
          });
        });
        r.querySelector(".x").onclick = () => { cat.items.splice(ii, 1); draw(); };
        rows.appendChild(r);
      });

      const add = document.createElement("button");
      add.type = "button"; add.className = "b b-ghost b-add"; add.textContent = "Thêm dòng";
      add.onclick = () => { cat.items.push({ name: "", note: "", price: 0 }); draw(); };
      wrap.appendChild(add);
      box.appendChild(wrap);
    });
    $("contactLabel").value = data.contact?.label || "";
    $("contactLink").value = data.contact?.link || "";
  }

  function collect() {
    data.contact = { label: $("contactLabel").value, link: $("contactLink").value };
    data.updated = new Date().toISOString().slice(0, 10);
    return JSON.stringify(data, null, 2) + "\n";
  }

  $("btnPreview").onclick = () => {
    localStorage.setItem("prices-draft", collect());
    window.open("index.html?preview=1", "_blank");
    say("Đã lưu nháp trên trình duyệt này. Web thật chưa đổi cho đến khi bạn cập nhật lên GitHub.", true);
  };

  $("btnDownload").onclick = () => {
    const blob = new Blob([collect()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prices.json";
    a.click();
    say("Đã tải prices.json. Hãy thay file trong thư mục data/ của repo rồi commit.", true);
  };

  const b64 = (str) => {
    let bin = "";
    new TextEncoder().encode(str).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  $("btnPush").onclick = async () => {
    const owner = $("ghOwner").value.trim(), repo = $("ghRepo").value.trim();
    const branch = $("ghBranch").value.trim() || "main", token = $("ghToken").value.trim();
    if (!owner || !repo || !token) return say("Hãy nhập tài khoản, tên repo và token.", false);

    localStorage.setItem("ghOwner", owner);
    localStorage.setItem("ghRepo", repo);
    localStorage.setItem("ghBranch", branch);
    sessionStorage.setItem("ghToken", token);

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/data/prices.json`;
    const headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" };
    try {
      say("Đang cập nhật…", true);
      const cur = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
      const sha = cur.ok ? (await cur.json()).sha : undefined;
      if (!cur.ok && cur.status !== 404) throw new Error("Không đọc được repo (mã " + cur.status + ")");
      const res = await fetch(url, {
        method: "PUT", headers,
        body: JSON.stringify({ message: "Cập nhật bảng giá", content: b64(collect()), branch, sha })
      });
      if (!res.ok) throw new Error("GitHub từ chối (mã " + res.status + "). Kiểm tra token và quyền ghi.");
      localStorage.removeItem("prices-draft");
      say("Xong. Web sẽ hiện giá mới sau khoảng 1 phút.", true);
    } catch (e) { say(e.message, false); }
  };

  init().catch((e) => say("Không tải được dữ liệu: " + e.message, false));
})();
