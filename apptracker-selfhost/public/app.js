const state = {
  token: localStorage.getItem("sessionToken") || "",
  user: null,
  packs: [],
  selectedPackId: "",
  selectedVersionId: "",
  requests: []
};

const $ = (id) => document.getElementById(id);

const api = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (state.token) headers.set("authorization", `Bearer ${state.token}`);
  const res = await fetch(path, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data.error || data || res.statusText);
  return data;
};

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 1800);
}

async function boot() {
  bindEvents();
  $("baseUrl").textContent = `${location.origin}/`;
  if (state.token) {
    try {
      const data = await api("/api/me");
      state.user = data.user;
      await loadPacks();
    } catch {
      localStorage.removeItem("sessionToken");
      state.token = "";
    }
  }
  render();
}

function bindEvents() {
  $("registerBtn").onclick = async () => {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        email: $("email").value,
        name: $("name").value,
        password: $("password").value
      })
    });
    saveSession(data);
    await loadPacks();
    toast("注册成功");
  };

  $("loginBtn").onclick = async () => {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: $("email").value, password: $("password").value })
    });
    saveSession(data);
    await loadPacks();
    toast("登录成功");
  };

  $("logoutBtn").onclick = async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    state.token = "";
    state.user = null;
    state.packs = [];
    localStorage.removeItem("sessionToken");
    render();
  };

  $("createPackBtn").onclick = async () => {
    const name = $("packName").value.trim();
    if (!name) return toast("请输入图标包名称");
    const data = await api("/api/icon-packs", { method: "POST", body: JSON.stringify({ name }) });
    $("packName").value = "";
    state.packs.unshift(data.iconPack);
    state.selectedPackId = data.iconPack.id;
    state.selectedVersionId = data.iconPack.versions[0].id;
    await loadRequests();
    render();
  };

  $("createVersionBtn").onclick = async () => {
    const name = $("versionName").value.trim();
    if (!state.selectedPackId || !name) return toast("请选择图标包并填写版本名");
    const data = await api(`/api/icon-packs/${state.selectedPackId}/versions`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
    const pack = selectedPack();
    pack.versions.unshift(data.version);
    state.selectedVersionId = data.version.id;
    $("versionName").value = "";
    await loadRequests();
    render();
  };

  $("createTokenBtn").onclick = async () => {
    if (!state.selectedVersionId) return toast("请选择版本");
    const data = await api(`/api/versions/${state.selectedVersionId}/tokens`, {
      method: "POST",
      body: JSON.stringify({ label: "Android app" })
    });
    $("accessKey").textContent = data.token.token;
    toast("token 已生成，只显示这一次");
  };

  $("refreshBtn").onclick = async () => {
    await loadPacks();
    await loadRequests();
    render();
    toast("已刷新");
  };

  $("showAdapted").onchange = async () => {
    await loadRequests();
    renderRequests();
  };

  $("filter").oninput = renderRequests;

  $("importBtn").onclick = async () => {
    if (!state.selectedVersionId) return toast("请选择版本");
    const text = $("appfilterInput").value.trim();
    if (!text) return toast("请粘贴 appfilter.xml");
    const data = await api(`/api/versions/${state.selectedVersionId}/import-appfilter`, {
      method: "POST",
      headers: { "content-type": "application/xml" },
      body: text
    });
    $("appfilterInput").value = "";
    await loadRequests();
    renderRequests();
    toast(`导入 ${data.imported} 条`);
  };

  $("exportBtn").onclick = () => {
    if (!state.selectedVersionId) return toast("请选择版本");
    location.href = `/api/versions/${state.selectedVersionId}/export-appfilter`;
  };
}

function saveSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem("sessionToken", data.token);
}

async function loadPacks() {
  if (!state.token) return;
  const data = await api("/api/icon-packs");
  state.packs = data.iconPacks || [];
  if (!state.selectedPackId && state.packs[0]) {
    state.selectedPackId = state.packs[0].id;
    state.selectedVersionId = state.packs[0].versions[0]?.id || "";
  }
}

async function loadRequests() {
  if (!state.selectedVersionId) {
    state.requests = [];
    return;
  }
  const adapted = $("showAdapted").checked ? "" : "?adapted=0";
  const data = await api(`/api/versions/${state.selectedVersionId}/requests${adapted}`);
  state.requests = data.requests || [];
}

function selectedPack() {
  return state.packs.find((pack) => pack.id === state.selectedPackId);
}

function selectedVersion() {
  const pack = selectedPack();
  return pack?.versions.find((version) => version.id === state.selectedVersionId);
}

function render() {
  $("authPanel").hidden = !!state.user;
  $("accountPanel").hidden = !state.user;
  $("packPanel").hidden = !state.user;
  $("setupCard").hidden = !state.user || !state.selectedVersionId;
  $("requestsCard").hidden = !state.user || !state.selectedVersionId;

  if (state.user) $("userLine").textContent = `${state.user.name} · ${state.user.email}`;

  renderPacks();
  const pack = selectedPack();
  const version = selectedVersion();
  $("breadcrumb").textContent = pack ? `控制面板 › ${pack.name} › ${version?.name || ""}` : "控制面板";
  $("title").textContent = version ? "版本详情" : "欢迎";
  $("subtitle").textContent = version ? `管理版本：${version.id}` : "创建图标包后生成接入 token。";
  renderRequests();
}

function renderPacks() {
  $("packList").innerHTML = "";
  for (const pack of state.packs) {
    for (const version of pack.versions) {
      const div = document.createElement("div");
      div.className = "pack-item" + (version.id === state.selectedVersionId ? " active" : "");
      div.innerHTML = `<strong>${escapeHtml(pack.name)}</strong><span>${escapeHtml(version.name)}</span>`;
      div.onclick = async () => {
        state.selectedPackId = pack.id;
        state.selectedVersionId = version.id;
        await loadRequests();
        render();
      };
      $("packList").appendChild(div);
    }
  }
}

function renderRequests() {
  const q = $("filter").value.trim().toLowerCase();
  const rows = state.requests.filter((item) => {
    const blob = `${item.localized_name} ${item.default_name} ${item.package_name} ${item.main_activity}`.toLowerCase();
    return !q || blob.includes(q);
  });
  $("requestCount").textContent = `${rows.length} 个申请`;
  $("requestsBody").innerHTML = "";
  for (const item of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.localized_name || item.default_name)}${item.adapted ? ' <span class="adapted">已适配</span>' : ""}</td>
      <td class="mono">${escapeHtml(item.package_name)}</td>
      <td class="mono">${escapeHtml(item.main_activity)}</td>
      <td>${item.request_count}</td>
      <td>${escapeHtml((item.last_requested_at || "").slice(0, 10))}</td>
      <td><button class="secondary">${item.adapted ? "取消" : "标记已适配"}</button></td>
    `;
    tr.querySelector("button").onclick = async () => {
      await api(`/api/requests/${item.id}/adapted`, {
        method: "PATCH",
        body: JSON.stringify({ adapted: !item.adapted })
      });
      await loadRequests();
      renderRequests();
    };
    $("requestsBody").appendChild(tr);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

boot().catch((error) => toast(error.message));
