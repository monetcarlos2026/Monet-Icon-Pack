const state = {
  token: localStorage.getItem("sessionToken") || "",
  theme: localStorage.getItem("theme") || "dark",
  lang: localStorage.getItem("lang") || "zh",
  user: null,
  view: "database",
  adminToken: sessionStorage.getItem("adminToken") || "",
  adminCurrentIp: "-",
  adminUsers: [],
  packs: [],
  stats: null,
  recent: [],
  selectedPackId: "",
  selectedVersionId: "",
  selectedPackIds: new Set(),
  multiSelectPacks: false,
  sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "1",
  packsCollapsed: false,
  requests: [],
  databaseRows: [],
  databaseFilter: "appfilter",
  databaseQuery: "",
  databaseSortAsc: false,
  selectedDatabaseId: "",
  uploadFile: null,
  uploadPackId: "",
  uploadVersionId: ""
};

const $ = (id) => document.getElementById(id);

const I18N = {
  zh: {
    controlPanel: "控制面板",
    general: "常规",
    stats: "统计",
    adminService: "管理员服务",
    loginRegister: "登录 / 注册",
    email: "邮箱",
    namePlaceholder: "昵称，注册时使用",
    passwordPlaceholder: "密码，至少 8 位",
    login: "登录",
    register: "注册",
    iconPacks: "图标包",
    multiSelectPacks: "多选图标包",
    collapsePacks: "折叠图标包",
    selectedCount: (count) => `已选 ${count} 个`,
    selectAll: "全选",
    deselectAll: "取消全选",
    deleteSelected: "删除所选",
    cancel: "取消",
    newPackName: "新图标包名称",
    createPack: "创建图标包",
    home: "返回首页",
    theme: "切换主题",
    language: "English",
    logout: "退出",
    refresh: "刷新",
    upload: "上传",
    search: "搜索",
    searchHome: "输入搜索内容...",
    appfilterTab: "Appfilter",
    drawableTab: "Drawable",
    iconPackTab: "图标包",
    moreFilters: "更多",
    sort: "排序",
    overview: "概览",
    overviewDesc: "查看您的图标包统计数据和活动。",
    totalPacks: "图标包总数",
    packSub: (count) => `${count || 0} 个已拥有，0 个已共享`,
    totalRequests: "申请总数",
    requestSub: "被申请的独立应用数",
    supportedApps: "支持的应用数",
    supportedSub: "已覆盖应用总数",
    lastUpdated: "最后更新",
    daysAgo: "天前",
    recentActivity: "近期活动",
    recentActivityDesc: "您近期的图标包申请和更新。",
    activityEmpty: "API 就绪后将显示活动数据。",
    adminDesc: "查看当前注册用户状态。",
    currentIp: "当前访问 IP：",
    account: "账号",
    nickname: "昵称",
    password: "密码",
    iconPackCount: "图标包数",
    accessIp: "访问 IP",
    lastAccess: "最后访问",
    version: "版本",
    versionDesc: "管理此图标包的版本和访问令牌。",
    newVersion: "新版本",
    createdAt: "创建时间",
    actions: "操作",
    setup: "接入配置",
    setupDesc: "生成 token 后，把下面两项写进图标包的 `blueprint_setup.xml`。",
    createToken: "生成接入 token",
    noToken: "尚未生成",
    requests: "申请",
    requestCount: (count) => `此图标包有 ${count} 个申请。`,
    searchRequests: "搜索应用名 / package / activity",
    exportAppfilter: "导出 appfilter",
    pasteAppfilter: "粘贴现有 appfilter.xml 后点击导入，可把已有适配标记为已适配",
    importAppfilter: "导入 appfilter",
    appName: "应用名称",
    count: "次数",
    add: "添加",
    adaptedApps: "已适配应用",
    adaptedCount: (count) => `${count} 个已适配应用。`,
    import: "导入",
    export: "导出",
    autoFill: "自动补全",
    searchAdapted: "搜索已适配应用...",
    drawable: "Drawable",
    category: "分类",
    allIcons: "全部图标",
    system: "系统",
    remove: "移除",
    adminPasswordPrompt: "请输入管理员密码。",
    back: "返回",
    confirm: "确定",
    adminPasswordRequired: "请输入管理员密码",
    passwordTooShort: "密码需要至少 8 位",
    adminRefreshed: "已刷新管理员数据",
    registerSuccess: "注册成功",
    loginSuccess: "登录成功",
    enterPackName: "请输入图标包名称",
    choosePackVersion: "请选择图标包并填写版本名",
    chooseVersion: "请选择版本",
    tokenCreated: "token 已生成，只显示这一次",
    refreshed: "已刷新",
    pasteAppfilterFirst: "请粘贴 appfilter.xml",
    imported: (count) => `导入 ${count} 条`,
    deletedPack: "已删除图标包",
    choosePacksDelete: "请选择要删除的图标包",
    deletedSelectedPacks: "已删除所选图标包",
    passwordEncrypted: "已加密保存",
    permissionLevel: "权限级别",
    permissionUpdated: "权限级别已更新",
    today: "今天",
    view: "查看",
    createTokenShort: "创建访问令牌",
    deletePackConfirm: (name) => `删除「${name}」及其所有版本、申请和 token？`,
    deleteSelectedConfirm: (count, names) => `删除已选 ${count} 个图标包及其所有版本、申请和 token？\n${names}`,
    versionManaging: (name) => `管理版本：${name}`,
    recentItem: (packName, packageName, count) => `${packName} · ${packageName} · ${count || 1} 次`
  },
  en: {
    controlPanel: "Dashboard",
    general: "General",
    stats: "Stats",
    adminService: "Admin Service",
    loginRegister: "Sign in / Sign up",
    email: "Email",
    namePlaceholder: "Nickname for registration",
    passwordPlaceholder: "Password, at least 8 characters",
    login: "Sign in",
    register: "Sign up",
    iconPacks: "Icon Packs",
    multiSelectPacks: "Select icon packs",
    collapsePacks: "Collapse icon packs",
    selectedCount: (count) => `${count} selected`,
    selectAll: "Select all",
    deselectAll: "Clear all",
    deleteSelected: "Delete selected",
    cancel: "Cancel",
    newPackName: "New icon pack name",
    createPack: "Create icon pack",
    home: "Home",
    theme: "Toggle theme",
    language: "中文",
    logout: "Log out",
    refresh: "Refresh",
    upload: "Upload",
    search: "Search",
    searchHome: "Search apps...",
    appfilterTab: "Appfilter",
    drawableTab: "Drawable",
    iconPackTab: "IconPack",
    moreFilters: "More",
    sort: "Sort",
    overview: "Overview",
    overviewDesc: "View your icon pack statistics and activity.",
    totalPacks: "Icon packs",
    packSub: (count) => `${count || 0} owned, 0 shared`,
    totalRequests: "Requests",
    requestSub: "Unique requested apps",
    supportedApps: "Supported apps",
    supportedSub: "Total covered apps",
    lastUpdated: "Last updated",
    daysAgo: "days ago",
    recentActivity: "Recent activity",
    recentActivityDesc: "Recent icon pack requests and updates.",
    activityEmpty: "Activity data will appear after the API is ready.",
    adminDesc: "View current registered user status.",
    currentIp: "Current IP: ",
    account: "Account",
    nickname: "Name",
    password: "Password",
    iconPackCount: "Icon packs",
    accessIp: "Access IP",
    lastAccess: "Last access",
    version: "Versions",
    versionDesc: "Manage versions and access tokens for this icon pack.",
    newVersion: "New version",
    createdAt: "Created",
    actions: "Actions",
    setup: "Integration setup",
    setupDesc: "After generating a token, write these values to `blueprint_setup.xml`.",
    createToken: "Generate token",
    noToken: "Not generated yet",
    requests: "Requests",
    requestCount: (count) => `${count} requests in this icon pack.`,
    searchRequests: "Search app name / package / activity",
    exportAppfilter: "Export appfilter",
    pasteAppfilter: "Paste an existing appfilter.xml, then import to mark adapted apps",
    importAppfilter: "Import appfilter",
    appName: "App name",
    count: "Count",
    add: "Add",
    adaptedApps: "Adapted apps",
    adaptedCount: (count) => `${count} adapted apps.`,
    import: "Import",
    export: "Export",
    autoFill: "Auto fill",
    searchAdapted: "Search adapted apps...",
    drawable: "Drawable",
    category: "Category",
    allIcons: "All icons",
    system: "System",
    remove: "Remove",
    adminPasswordPrompt: "Enter the admin password.",
    back: "Back",
    confirm: "Confirm",
    adminPasswordRequired: "Enter the admin password",
    passwordTooShort: "Password must be at least 8 characters",
    adminRefreshed: "Admin data refreshed",
    registerSuccess: "Registered",
    loginSuccess: "Signed in",
    enterPackName: "Enter an icon pack name",
    choosePackVersion: "Select an icon pack and enter a version name",
    chooseVersion: "Select a version",
    tokenCreated: "Token generated. It is shown only once.",
    refreshed: "Refreshed",
    pasteAppfilterFirst: "Paste appfilter.xml first",
    imported: (count) => `Imported ${count} items`,
    deletedPack: "Icon pack deleted",
    choosePacksDelete: "Select icon packs to delete",
    deletedSelectedPacks: "Selected icon packs deleted",
    passwordEncrypted: "Encrypted",
    permissionLevel: "Permission",
    permissionUpdated: "Permission updated",
    today: "Today",
    view: "View",
    createTokenShort: "Create access token",
    deletePackConfirm: (name) => `Delete "${name}" and all versions, requests, and tokens?`,
    deleteSelectedConfirm: (count, names) => `Delete ${count} selected icon packs and all versions, requests, and tokens?\n${names}`,
    versionManaging: (name) => `Managing version: ${name}`,
    recentItem: (packName, packageName, count) => `${packName} · ${packageName} · ${count || 1} times`
  }
};

const t = (key, ...args) => {
  const value = I18N[state.lang][key] ?? I18N.zh[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
};

const ROOT_EMAILS = new Set(["2841139293@qq.com", "1075210552@qq.com"]);
const OWNER_EMAIL = "2841139293@qq.com";
const passwordWarningHits = [];

function displayAccount(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return ROOT_EMAILS.has(normalized) ? "[root]" : String(email || "");
}

function isRootAccount(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return ROOT_EMAILS.has(normalized);
}

function displayIpForUser(user) {
  if (isRootAccount(user?.email)) return "********";
  if (user?.permissionLevel === "高级会员" && String(state.user?.email || "").trim().toLowerCase() !== OWNER_EMAIL) {
    return maskIpTail(user.lastIp);
  }
  return String(user?.lastIp || "-");
}

function maskIpTail(ip) {
  const value = String(ip || "-");
  if (value === "-" || !value.includes(".")) return value;
  return `${value.slice(0, value.lastIndexOf(".") + 1)}*`;
}

function canEditPermission() {
  return String(state.user?.email || "").trim().toLowerCase() === OWNER_EMAIL && !!state.adminToken;
}

function setAuthLoading(isLoading) {
  $("authLoading").hidden = !isLoading;
  $("loginBtn").disabled = isLoading;
  $("registerBtn").disabled = isLoading;
}

function warnPasswordTooShort() {
  if ($("password").value.length >= 8) return false;
  const now = Date.now();
  while (passwordWarningHits.length && now - passwordWarningHits[0] > 60000) {
    passwordWarningHits.shift();
  }
  if (passwordWarningHits.length < 8) {
    passwordWarningHits.push(now);
    toast(t("passwordTooShort"));
  }
  return true;
}

const api = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (state.token && !headers.has("authorization")) headers.set("authorization", `Bearer ${state.token}`);
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
  applyTheme();
  bindEvents();
  hydrateIcons();
  $("baseUrl").textContent = `${location.origin}/`;
  if (state.token) {
    try {
      const data = await api("/api/me");
      state.user = data.user;
      await loadPacks();
      await loadStats();
      await openDatabasePage(false);
    } catch {
      localStorage.removeItem("sessionToken");
      state.token = "";
    }
  }
  render();
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.querySelector(".brand span").textContent = t("controlPanel");
  document.querySelector(".nav-label").textContent = t("general");
  $("statsBtn").querySelector("span:last-child").textContent = t("stats");
  $("adminServiceBtn").querySelector("span:last-child").textContent = t("adminService");
  $("authPanel").querySelector("h2").textContent = t("loginRegister");
  $("email").placeholder = t("email");
  $("name").placeholder = t("namePlaceholder");
  $("password").placeholder = t("passwordPlaceholder");
  $("loginBtn").textContent = t("login");
  $("registerBtn").textContent = t("register");
  document.querySelector(".section-title h2").textContent = t("iconPacks");
  $("multiSelectBtn").title = t("multiSelectPacks");
  $("packCollapseBtn").title = t("collapsePacks");
  $("packName").placeholder = t("newPackName");
  $("createPackBtn").querySelector("span:last-child").textContent = t("createPack");
  $("homeBtn").querySelector("span:last-child").textContent = t("home");
  $("themeLabel").textContent = t("theme");
  $("languageLabel").textContent = t("language");
  $("logoutBtn").title = t("logout");
  $("refreshBtn").textContent = t("refresh");
  $("openUploadBtn").querySelector("span:last-child").textContent = t("upload");
  $("uploadTopBtn").querySelector("span:last-child").textContent = t("upload");
  $("databaseSearch").placeholder = t("searchHome");
  $("databaseSearchBtn").querySelector("span:last-child").textContent = t("search");
  $("filterAppfilterBtn").textContent = t("appfilterTab");
  $("filterDrawableBtn").textContent = t("drawableTab");
  $("filterIconPackBtn").textContent = t("iconPackTab");
  $("filterMoreBtn").title = t("moreFilters");
  $("databaseSortBtn").querySelector("span:last-child").textContent = t("sort");
  document.querySelector("#statsCard .page-intro h2").textContent = t("overview");
  document.querySelector("#statsCard .page-intro p").textContent = t("overviewDesc");
  document.querySelectorAll(".stat-card h3")[0].textContent = t("totalPacks");
  document.querySelectorAll(".stat-card h3")[1].textContent = t("totalRequests");
  document.querySelectorAll(".stat-card h3")[2].textContent = t("supportedApps");
  document.querySelectorAll(".stat-card h3")[3].textContent = t("lastUpdated");
  document.querySelectorAll(".stat-card p")[1].textContent = t("requestSub");
  document.querySelectorAll(".stat-card p")[2].textContent = t("supportedSub");
  document.querySelectorAll(".stat-card p")[3].textContent = t("daysAgo");
  document.querySelector(".activity-card h2").textContent = t("recentActivity");
  document.querySelector(".activity-card > p").textContent = t("recentActivityDesc");
  document.querySelector("#adminCard h2").textContent = t("adminService");
  document.querySelector("#adminCard .card-head p").textContent = t("adminDesc");
  $("adminIpLabel").textContent = t("currentIp");
  $("refreshAdminBtn").textContent = t("refresh");
  document.querySelector("#versionsCard h2").textContent = t("version");
  document.querySelector("#versionsCard .card-head p").textContent = t("versionDesc");
  $("versionName").placeholder = "1.1";
  $("createVersionBtn").textContent = t("newVersion");
  document.querySelector("#setupCard h2").textContent = t("setup");
  document.querySelector("#setupCard .card-head p").textContent = t("setupDesc");
  $("createTokenBtn").textContent = t("createToken");
  if ($("accessKey").textContent === "尚未生成" || $("accessKey").textContent === "Not generated yet") $("accessKey").textContent = t("noToken");
  document.querySelector("#requestsCard h2").textContent = t("requests");
  $("filter").placeholder = t("searchRequests");
  $("exportBtn").textContent = t("exportAppfilter");
  $("appfilterInput").placeholder = t("pasteAppfilter");
  $("importBtn").textContent = t("importAppfilter");
  document.querySelector("#adaptedCard h2").textContent = t("adaptedApps");
  $("importBtnTop").textContent = t("import");
  $("exportBtnTop").textContent = t("export");
  $("autoFillBtn").textContent = t("autoFill");
  $("adaptedFilter").placeholder = t("searchAdapted");
  document.querySelector("#adminForm h2").textContent = t("adminService");
  document.querySelector("#adminForm p").textContent = t("adminPasswordPrompt");
  $("adminPassword").placeholder = t("password");
  $("adminBackBtn").textContent = t("back");
  $("adminConfirmBtn").textContent = t("confirm");
  updateTableHeaders();
}

function updateTableHeaders() {
  setHeaders("#adminCard thead th", [t("account"), t("nickname"), t("password"), t("permissionLevel"), t("iconPackCount"), t("accessIp"), t("lastAccess")]);
  setHeaders("#versionsCard thead th", ["Version", t("createdAt"), t("actions")]);
  setHeaders("#requestsCard thead th", [t("appName"), "Package", "Activity", t("count"), ""]);
  setHeaders("#adaptedCard thead th", [t("appName"), "Package", "Activity", t("drawable"), t("category"), ""]);
}

function setHeaders(selector, labels) {
  document.querySelectorAll(selector).forEach((node, index) => {
    node.textContent = labels[index] ?? "";
  });
}

function bindEvents() {
  $("themeBtn").onclick = toggleTheme;

  $("languageBtn").onclick = () => {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem("lang", state.lang);
    render();
  };

  $("sidebarBtn").onclick = () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem("sidebarCollapsed", state.sidebarCollapsed ? "1" : "0");
    applySidebarState();
  };

  $("statsBtn").onclick = async () => {
    state.view = "stats";
    await loadStats();
    render();
  };

  $("adminServiceBtn").onclick = () => {
    if (state.adminToken) {
      openAdminPage();
    } else {
      openAdminModal();
    }
  };

  $("adminBackBtn").onclick = closeAdminModal;
  $("adminModal").onclick = (event) => {
    if (event.target === $("adminModal")) event.preventDefault();
  };
  $("adminForm").onsubmit = async (event) => {
    event.preventDefault();
    await submitAdminPassword();
  };

  $("refreshAdminBtn").onclick = async () => {
    await loadAdminUsers();
    render();
    toast(t("adminRefreshed"));
  };

  $("homeBtn").onclick = () => openDatabasePage();
  $("homeBrandBtn").onclick = () => openDatabasePage();
  $("uploadBrandBtn").onclick = () => openDatabasePage();
  $("openUploadBtn").onclick = () => openUploadPage();
  $("uploadTopBtn").onclick = () => openUploadPage();
  $("homeAvatar").onclick = () => {
    if (!state.user) openAuthPage();
  };
  $("uploadAvatar").onclick = () => {
    if (!state.user) openAuthPage();
  };
  $("databaseSearchBtn").onclick = () => {
    state.databaseQuery = $("databaseSearch").value.trim();
    loadDatabase().then(render);
  };
  $("databaseSearch").onkeydown = (event) => {
    if (event.key === "Enter") {
      state.databaseQuery = $("databaseSearch").value.trim();
      loadDatabase().then(render);
    }
  };
  $("databaseSearch").oninput = () => {
    state.databaseQuery = $("databaseSearch").value.trim();
    renderDatabase();
  };
  $("filterAppfilterBtn").onclick = () => setDatabaseFilter("appfilter");
  $("filterDrawableBtn").onclick = () => setDatabaseFilter("drawable");
  $("filterIconPackBtn").onclick = () => setDatabaseFilter("iconpack");
  $("filterMoreBtn").onclick = () => toast(t("moreFilters"));
  $("databaseSortBtn").onclick = async () => {
    state.databaseSortAsc = !state.databaseSortAsc;
    await loadDatabase();
    render();
  };
  bindUploadEvents();

  $("packCollapseBtn").onclick = () => {
    state.packsCollapsed = !state.packsCollapsed;
    renderPacks();
  };

  $("multiSelectBtn").onclick = () => {
    state.multiSelectPacks = !state.multiSelectPacks;
    if (!state.multiSelectPacks) state.selectedPackIds.clear();
    renderPacks();
  };

  $("selectAllPacksBtn").onclick = () => {
    const allSelected = state.selectedPackIds.size === state.packs.length;
    state.selectedPackIds = allSelected ? new Set() : new Set(state.packs.map((pack) => pack.id));
    renderPacks();
  };

  $("deleteSelectedPacksBtn").onclick = deleteSelectedPacks;

  $("clearPackSelectionBtn").onclick = () => {
    state.multiSelectPacks = false;
    state.selectedPackIds.clear();
    renderPacks();
  };

  $("registerBtn").onclick = async () => {
    if (warnPasswordTooShort()) return;
    setAuthLoading(true);
    try {
      const data = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: $("email").value,
          name: $("name").value,
          password: $("password").value
        })
      });
      saveSession(data);
      state.view = "database";
      await loadPacks();
      await loadStats();
      await loadDatabase();
      render();
      toast(t("registerSuccess"));
    } catch (error) {
      toast(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  $("loginBtn").onclick = async () => {
    if (warnPasswordTooShort()) return;
    setAuthLoading(true);
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: $("email").value, password: $("password").value })
      });
      saveSession(data);
      state.view = "database";
      await loadPacks();
      await loadStats();
      await loadDatabase();
      render();
      toast(t("loginSuccess"));
    } catch (error) {
      toast(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  $("logoutBtn").onclick = async () => {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    state.token = "";
    state.user = null;
    state.view = "database";
    state.packs = [];
    state.stats = null;
    state.recent = [];
    state.selectedPackId = "";
    state.selectedVersionId = "";
    state.selectedPackIds.clear();
    state.databaseRows = [];
    state.selectedDatabaseId = "";
    state.uploadFile = null;
    state.uploadPackId = "";
    state.uploadVersionId = "";
    state.adminToken = "";
    state.adminUsers = [];
    sessionStorage.removeItem("adminToken");
    localStorage.removeItem("sessionToken");
    render();
  };

  $("createPackBtn").onclick = async () => {
    const name = $("packName").value.trim();
    if (!name) return toast(t("enterPackName"));
    const data = await api("/api/icon-packs", { method: "POST", body: JSON.stringify({ name }) });
    $("packName").value = "";
    state.view = "pack";
    state.selectedPackId = data.iconPack.id;
    state.selectedVersionId = data.iconPack.versions[0].id;
    await loadPacks();
    await loadStats();
    await loadRequests();
    render();
  };

  $("createVersionBtn").onclick = async () => {
    const name = $("versionName").value.trim();
    if (!state.selectedPackId || !name) return toast(t("choosePackVersion"));
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
    if (!state.selectedVersionId) return toast(t("chooseVersion"));
    const data = await api(`/api/versions/${state.selectedVersionId}/tokens`, {
      method: "POST",
      body: JSON.stringify({ label: "Android app" })
    });
    $("accessKey").textContent = data.token.token;
    toast(t("tokenCreated"));
  };

  $("refreshBtn").onclick = async () => {
    await loadPacks();
    await loadStats();
    if (state.view === "pack") await loadRequests();
    if (state.view === "database") await loadDatabase();
    render();
    toast(t("refreshed"));
  };

  $("showAdapted").onchange = async () => {
    await loadRequests();
    renderRequests();
  };

  $("filter").oninput = renderRequests;
  $("adaptedFilter").oninput = renderRequests;

  $("importBtn").onclick = async () => {
    if (!state.selectedVersionId) return toast(t("chooseVersion"));
    const text = $("appfilterInput").value.trim();
    if (!text) return toast(t("pasteAppfilterFirst"));
    const data = await api(`/api/versions/${state.selectedVersionId}/import-appfilter`, {
      method: "POST",
      headers: { "content-type": "application/xml" },
      body: text
    });
    $("appfilterInput").value = "";
    await loadRequests();
    renderRequests();
    toast(t("imported", data.imported));
  };

  $("exportBtn").onclick = () => {
    if (!state.selectedVersionId) return toast(t("chooseVersion"));
    location.href = `/api/versions/${state.selectedVersionId}/export-appfilter`;
  };

  $("importBtnTop").onclick = () => $("appfilterInput").focus();
  $("exportBtnTop").onclick = $("exportBtn").onclick;
  $("autoFillBtn").onclick = () => toast(t("autoFill"));
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("themeLabel").textContent = t("theme");
  const icon = $("themeBtn").querySelector(".nav-icon");
  icon.dataset.icon = state.theme === "dark" ? "moon" : "sun";
  icon.innerHTML = iconSvg(icon.dataset.icon);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
  applyTheme();
}

function bindUploadEvents() {
  const dropZone = $("uploadDropZone");
  const input = $("uploadZipInput");
  input.onchange = () => setUploadFile(input.files?.[0] || null);
  dropZone.ondragover = (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  };
  dropZone.ondragleave = () => dropZone.classList.remove("dragging");
  dropZone.ondrop = (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
    setUploadFile(event.dataTransfer.files?.[0] || null);
  };
  $("uploadPackSelect").onchange = () => {
    state.uploadPackId = $("uploadPackSelect").value;
    state.uploadVersionId = selectedUploadPack()?.versions[0]?.id || "";
    renderUploadPage();
  };
  $("uploadVersionSelect").onchange = () => {
    state.uploadVersionId = $("uploadVersionSelect").value;
    renderUploadPage();
  };
  $("submitUploadBtn").onclick = submitUpload;
}

function setUploadFile(file) {
  if (file && !file.name.toLowerCase().endsWith(".zip")) {
    toast("请选择 ZIP 文件");
    return;
  }
  state.uploadFile = file;
  renderUploadPage();
}

function applySidebarState() {
  document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  $("sidebarBtn").setAttribute("aria-pressed", state.sidebarCollapsed ? "true" : "false");
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
  if (state.selectedPackId && !state.packs.some((pack) => pack.id === state.selectedPackId)) {
    state.selectedPackId = "";
    state.selectedVersionId = "";
  }
  state.selectedPackIds = new Set([...state.selectedPackIds].filter((id) => state.packs.some((pack) => pack.id === id)));
  if (!state.selectedPackId && state.packs[0]) {
    state.selectedPackId = state.packs[0].id;
    state.selectedVersionId = state.packs[0].versions[0]?.id || "";
  } else if (state.selectedPackId) {
    const pack = selectedPack();
    if (pack && !pack.versions.some((version) => version.id === state.selectedVersionId)) {
      state.selectedVersionId = pack.versions[0]?.id || "";
    }
  }
}

async function loadStats() {
  if (!state.token) return;
  const data = await api("/api/stats");
  state.stats = data.stats || null;
  state.recent = data.recent || [];
}

async function loadRequests() {
  if (!state.selectedVersionId) {
    state.requests = [];
    return;
  }
  const data = await api(`/api/versions/${state.selectedVersionId}/requests`);
  state.requests = data.requests || [];
}

async function openDatabasePage(shouldRender = true) {
  state.view = "database";
  if (state.user) await loadDatabase();
  if (shouldRender) render();
}

async function openUploadPage() {
  if (!state.user) {
    openAuthPage();
    return;
  }
  state.view = "upload";
  if (!state.packs.length) await loadPacks();
  state.uploadPackId = state.uploadPackId || state.selectedPackId || state.packs[0]?.id || "";
  state.uploadVersionId = state.uploadVersionId || selectedUploadPack()?.versions[0]?.id || "";
  render();
}

async function loadDatabase() {
  if (!state.token) {
    state.databaseRows = [];
    state.selectedDatabaseId = "";
    return;
  }
  const params = new URLSearchParams({
    type: state.databaseFilter,
    q: state.databaseQuery,
    sort: state.databaseSortAsc ? "asc" : "desc"
  });
  const data = await api(`/api/database?${params.toString()}`);
  state.databaseRows = data.items || [];
  if (state.selectedDatabaseId && !state.databaseRows.some((item) => item.id === state.selectedDatabaseId)) {
    state.selectedDatabaseId = "";
  }
}

function openAuthPage() {
  state.view = "auth";
  render();
  setTimeout(() => $("email").focus(), 0);
}

function setDatabaseFilter(filter) {
  state.databaseFilter = filter;
  loadDatabase().then(render);
}

async function loadAdminUsers() {
  if (!state.adminToken) return;
  const data = await api("/api/admin/users", {
    headers: { "x-admin-token": state.adminToken }
  });
  state.adminUsers = data.users || [];
  state.adminCurrentIp = data.currentIp || "-";
}

function openAdminModal() {
  $("adminPassword").value = "";
  $("adminModal").hidden = false;
  setTimeout(() => $("adminPassword").focus(), 0);
}

function closeAdminModal() {
  $("adminModal").hidden = true;
  $("adminPassword").value = "";
}

async function submitAdminPassword() {
  const password = $("adminPassword").value;
  if (!password) return toast(t("adminPasswordRequired"));
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
  state.adminToken = data.token;
  state.adminCurrentIp = data.currentIp || "-";
  sessionStorage.setItem("adminToken", data.token);
  closeAdminModal();
  await openAdminPage();
}

async function openAdminPage() {
  try {
    await loadAdminUsers();
    state.view = "admin";
    render();
  } catch (error) {
    state.adminToken = "";
    sessionStorage.removeItem("adminToken");
    openAdminModal();
    toast(error.message);
  }
}

function selectedPack() {
  return state.packs.find((pack) => pack.id === state.selectedPackId);
}

function selectedVersion() {
  const pack = selectedPack();
  return pack?.versions.find((version) => version.id === state.selectedVersionId);
}

function render() {
  applyLanguage();
  applySidebarState();
  document.body.classList.toggle("is-authenticated", !!state.user);
  document.body.classList.toggle("is-auth-page", !state.user && state.view === "auth");
  document.body.classList.toggle("is-public-home", !state.user && state.view !== "auth");
  $("authPanel").hidden = !!state.user || state.view !== "auth";
  $("primaryNav").hidden = !state.user;
  $("packPanel").hidden = !state.user;
  $("topbar").hidden = ["database", "upload"].includes(state.view) || (!state.user && state.view === "auth");
  $("databasePage").hidden = state.view !== "database";
  $("uploadPage").hidden = !state.user || state.view !== "upload";
  $("statsCard").hidden = !state.user || state.view !== "stats";
  $("adminCard").hidden = !state.user || state.view !== "admin";
  $("versionsCard").hidden = !state.user || state.view !== "pack" || !state.selectedPackId;
  $("setupCard").hidden = !state.user || state.view !== "pack" || !state.selectedVersionId;
  $("requestsCard").hidden = !state.user || state.view !== "pack" || !state.selectedVersionId;
  $("adaptedCard").hidden = !state.user || state.view !== "pack" || !state.selectedVersionId;

  if (state.user) {
    $("userBadge").hidden = false;
    $("userName").textContent = state.user.name;
    $("userEmail").textContent = displayAccount(state.user.email);
    $("userInitial").textContent = (state.user.name || state.user.email || "A").trim().slice(0, 1).toUpperCase();
    $("homeAvatar").hidden = true;
    $("uploadAvatar").hidden = true;
  } else {
    $("userBadge").hidden = true;
    $("homeAvatar").hidden = false;
    $("homeAvatar").textContent = "登";
    $("uploadAvatar").hidden = true;
  }

  renderPacks();
  renderVersions();
  renderStats();
  const pack = selectedPack();
  const version = selectedVersion();
  $("statsBtn").classList.toggle("active", state.view === "stats");
  $("adminServiceBtn").classList.toggle("active", state.view === "admin");
  $("breadcrumb").textContent = state.view === "pack" && pack ? `${t("controlPanel")} › ${pack.id}` : t("controlPanel");
  $("title").textContent = state.view === "pack" && pack ? pack.name : state.view === "admin" ? t("adminService") : t("controlPanel");
  $("subtitle").textContent = state.view === "pack" && version ? t("versionManaging", version.name) : "";
  renderAdminUsers();
  renderRequests();
  renderDatabase();
  renderUploadPage();
}

function renderPacks() {
  $("packList").innerHTML = "";
  $("packList").hidden = state.packsCollapsed;
  $("packBulkBar").hidden = state.packsCollapsed || !state.multiSelectPacks;
  $("multiSelectBtn").classList.toggle("active", state.multiSelectPacks);
  $("packCollapseBtn").textContent = state.packsCollapsed ? "›" : "⌄";
  $("selectedPackCount").textContent = `已选 ${state.selectedPackIds.size} 个`;
  $("selectedPackCount").textContent = t("selectedCount", state.selectedPackIds.size);
  $("selectAllPacksBtn").textContent = state.selectedPackIds.size === state.packs.length && state.packs.length
    ? t("deselectAll")
    : t("selectAll");
  $("deleteSelectedPacksBtn").textContent = t("deleteSelected");
  $("clearPackSelectionBtn").textContent = t("cancel");
  $("deleteSelectedPacksBtn").disabled = state.selectedPackIds.size === 0;
  if (state.packsCollapsed) return;

  state.packs.forEach((pack, index) => {
    const selected = state.selectedPackIds.has(pack.id);
    const div = document.createElement("div");
    div.className = [
      "pack-item",
      state.view === "pack" && pack.id === state.selectedPackId ? "active" : "",
      state.multiSelectPacks ? "selecting" : "",
      selected ? "checked" : ""
    ].filter(Boolean).join(" ");
    div.innerHTML = `
      <button class="pack-main" type="button" title="${escapeHtml(pack.name)}">
        ${state.multiSelectPacks ? `<span class="pack-check" aria-hidden="true">${selected ? "✓" : ""}</span>` : ""}
        <span class="pack-icon">${iconSvg("cube")}</span>
        <span><strong>${escapeHtml(pack.name)}</strong><small>${escapeHtml(pack.versions[0]?.name || "-")}</small></span>
      </button>
      <div class="pack-actions">
        <button class="icon-btn move-up" type="button" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn move-down" type="button" title="下移" ${index === state.packs.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn danger delete-pack" type="button" title="删除">×</button>
      </div>
    `;
    div.querySelector(".pack-main").onclick = async () => {
      if (state.multiSelectPacks) {
        togglePackSelection(pack.id);
        return;
      }
      state.view = "pack";
      state.selectedPackId = pack.id;
      state.selectedVersionId = pack.versions[0]?.id || "";
      await loadRequests();
      render();
    };
    div.querySelector(".move-up").onclick = () => movePack(pack.id, "up");
    div.querySelector(".move-down").onclick = () => movePack(pack.id, "down");
    div.querySelector(".delete-pack").onclick = () => deletePack(pack);
    $("packList").appendChild(div);
  });
}

function togglePackSelection(packId) {
  if (state.selectedPackIds.has(packId)) {
    state.selectedPackIds.delete(packId);
  } else {
    state.selectedPackIds.add(packId);
  }
  renderPacks();
}

function renderVersions() {
  $("versionsBody").innerHTML = "";
  const pack = selectedPack();
  if (!pack) return;

  for (const version of pack.versions) {
    const tr = document.createElement("tr");
    tr.className = version.id === state.selectedVersionId ? "selected-row" : "";
    tr.innerHTML = `
      <td><strong>${escapeHtml(version.name)}</strong></td>
      <td>${formatDate(version.createdAt)}</td>
      <td class="actions-cell">
        <button class="secondary view-version" type="button">${t("view")}</button>
        <button class="secondary token-version" type="button">${t("createTokenShort")}</button>
      </td>
    `;
    tr.querySelector(".view-version").onclick = async () => {
      state.selectedVersionId = version.id;
      await loadRequests();
      render();
    };
    tr.querySelector(".token-version").onclick = async () => {
      state.selectedVersionId = version.id;
      await loadRequests();
      render();
      await createToken();
    };
    $("versionsBody").appendChild(tr);
  }
}

async function movePack(packId, direction) {
  const data = await api(`/api/icon-packs/${packId}/move`, {
    method: "PATCH",
    body: JSON.stringify({ direction })
  });
  state.packs = data.iconPacks || [];
  render();
}

async function deletePack(pack) {
  if (!confirm(t("deletePackConfirm", pack.name))) return;
  const data = await api(`/api/icon-packs/${pack.id}`, { method: "DELETE" });
  state.packs = data.iconPacks || [];
  state.selectedPackIds.delete(pack.id);
  if (pack.id === state.selectedPackId) {
    state.selectedPackId = state.packs[0]?.id || "";
    state.selectedVersionId = state.packs[0]?.versions[0]?.id || "";
    state.view = state.selectedPackId ? "pack" : "stats";
  }
  await loadStats();
  await loadRequests();
  render();
  toast(t("deletedPack"));
}

async function deleteSelectedPacks() {
  const ids = [...state.selectedPackIds];
  if (!ids.length) return toast(t("choosePacksDelete"));
  const names = state.packs.filter((pack) => state.selectedPackIds.has(pack.id)).map((pack) => pack.name);
  if (!confirm(t("deleteSelectedConfirm", ids.length, names.join(state.lang === "zh" ? "、" : ", ")))) return;

  for (const id of ids) {
    await api(`/api/icon-packs/${id}`, { method: "DELETE" });
  }

  state.selectedPackIds.clear();
  state.multiSelectPacks = false;
  await loadPacks();
  await loadStats();
  if (!state.packs.some((pack) => pack.id === state.selectedPackId)) {
    state.selectedPackId = state.packs[0]?.id || "";
    state.selectedVersionId = state.packs[0]?.versions[0]?.id || "";
  }
  state.view = state.selectedPackId ? "pack" : "stats";
  if (state.view === "pack") await loadRequests();
  render();
  toast(t("deletedSelectedPacks"));
}

async function createToken() {
  if (!state.selectedVersionId) return toast(t("chooseVersion"));
  const data = await api(`/api/versions/${state.selectedVersionId}/tokens`, {
    method: "POST",
    body: JSON.stringify({ label: "Android app" })
  });
  $("accessKey").textContent = data.token.token;
  toast(t("tokenCreated"));
}

function renderRequests() {
  const q = $("filter").value.trim().toLowerCase();
  const pendingRows = state.requests.filter((item) => !item.adapted).filter((item) => {
    const blob = `${item.localized_name} ${item.default_name} ${item.package_name} ${item.main_activity}`.toLowerCase();
    return !q || blob.includes(q);
  });
  $("requestCount").textContent = t("requestCount", pendingRows.length);
  $("requestsBody").innerHTML = "";
  for (const item of pendingRows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="app-cell">${appAvatar(item)}<strong>${escapeHtml(item.localized_name || item.default_name)}</strong></td>
      <td class="mono">${escapeHtml(item.package_name)}</td>
      <td class="mono">${escapeHtml(item.main_activity)}</td>
      <td>${item.request_count}</td>
      <td><button class="secondary split-action" type="button"><span>＋ ${t("add")}</span><span>⌄</span></button></td>
    `;
    tr.querySelector("button").onclick = async () => {
      await api(`/api/requests/${item.id}/adapted`, {
        method: "PATCH",
        body: JSON.stringify({ adapted: true })
      });
      await loadRequests();
      await loadStats();
      renderRequests();
      renderStats();
    };
    $("requestsBody").appendChild(tr);
  }

  const adaptedQuery = $("adaptedFilter").value.trim().toLowerCase();
  const adaptedRows = state.requests.filter((item) => item.adapted).filter((item) => {
    const blob = `${item.localized_name} ${item.default_name} ${item.package_name} ${item.main_activity} ${drawableName(item)}`.toLowerCase();
    return !adaptedQuery || blob.includes(adaptedQuery);
  });
  $("adaptedCount").textContent = t("adaptedCount", adaptedRows.length);
  $("adaptedBody").innerHTML = "";
  for (const item of adaptedRows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="app-cell">${appAvatar(item)}<strong>${escapeHtml(item.localized_name || item.default_name)}</strong></td>
      <td class="mono">${escapeHtml(item.package_name)}</td>
      <td class="mono">${escapeHtml(item.main_activity)}</td>
      <td class="mono">${escapeHtml(drawableName(item))}</td>
      <td><span class="pill">${t("allIcons")}</span>${item.system_app ? ` <span class="pill">${t("system")}</span>` : ""}</td>
      <td><button class="remove-action" type="button"><span>− ${t("remove")}</span><span>⌄</span></button></td>
    `;
    tr.querySelector("button").onclick = async () => {
      await api(`/api/requests/${item.id}/adapted`, {
        method: "PATCH",
        body: JSON.stringify({ adapted: false })
      });
      await loadRequests();
      await loadStats();
      renderRequests();
      renderStats();
    };
    $("adaptedBody").appendChild(tr);
  }
}

function drawableName(item) {
  return sanitizeDrawable(item.default_name || item.localized_name || item.package_name || "icon");
}

function sanitizeDrawable(value) {
  return String(value || "icon")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_") || "icon";
}

function appAvatar(item) {
  const letter = (item.localized_name || item.default_name || item.package_name || "?").trim().slice(0, 1).toUpperCase();
  return `<span class="app-avatar">${escapeHtml(letter)}</span>`;
}

function databaseAvatar(item, size = "small") {
  const name = item.localizedName || item.defaultName || item.packageName || "?";
  const letter = name.trim().slice(0, 1).toUpperCase();
  const seed = [...String(item.packageName || name)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colors = [
    ["#39afe8", "#7ed6f7"],
    ["#1d1d1f", "#53d8cb"],
    ["#2878ff", "#34d399"],
    ["#f45757", "#f5c542"],
    ["#7357ff", "#ff71c6"],
    ["#10a37f", "#8ee9c1"]
  ][seed % 6];
  return `<span class="database-avatar ${size}" style="--avatar-a:${colors[0]};--avatar-b:${colors[1]}">${escapeHtml(letter)}</span>`;
}

function renderDatabase() {
  if (!state.user) return;
  $("databaseSearch").value = state.databaseQuery;
  $("filterAppfilterBtn").classList.toggle("active", state.databaseFilter === "appfilter");
  $("filterDrawableBtn").classList.toggle("active", state.databaseFilter === "drawable");
  $("filterIconPackBtn").classList.toggle("active", state.databaseFilter === "iconpack");
  $("databaseSortBtn").classList.toggle("active", state.databaseSortAsc);

  const query = state.databaseQuery.toLowerCase();
  const rows = state.databaseRows.filter((item) => {
    const blob = `${item.localizedName} ${item.defaultName} ${item.packageName} ${item.mainActivity} ${item.drawable} ${item.iconPackName}`.toLowerCase();
    return !query || blob.includes(query);
  });

  $("databaseList").innerHTML = "";
  if (!rows.length) {
    $("databaseList").innerHTML = `<div class="database-empty">暂无应用数据</div>`;
  }
  for (const item of rows) {
    const active = item.id === state.selectedDatabaseId;
    const div = document.createElement("article");
    div.className = `database-card${active ? " active" : ""}`;
    div.innerHTML = `
      <span class="database-check" aria-hidden="true"></span>
      ${databaseAvatar(item)}
      <button class="database-main" type="button">
        <strong>${escapeHtml(item.localizedName || item.defaultName || item.packageName)}</strong>
        <span class="database-meta">${escapeHtml(item.packageName)}<br>${escapeHtml(item.mainActivity)}</span>
      </button>
    `;
    div.querySelector(".database-main").onclick = () => {
      state.selectedDatabaseId = item.id;
      renderDatabase();
    };
    $("databaseList").appendChild(div);
  }

  const selected = rows.find((item) => item.id === state.selectedDatabaseId);
  $("databaseList").parentElement.classList.toggle("has-detail", !!selected);
  $("databaseDetail").hidden = !selected;
  $("databaseDetail").innerHTML = selected ? databaseDetailHtml(selected) : "";
  const closeButton = $("databaseDetail").querySelector(".detail-close");
  if (closeButton) {
    closeButton.onclick = () => {
      state.selectedDatabaseId = "";
      renderDatabase();
    };
  }
}

function databaseDetailHtml(item) {
  const name = item.localizedName || item.defaultName || item.packageName;
  return `
    <div class="detail-head">
      <h2>${escapeHtml(name)}</h2>
      <button class="detail-close" type="button" title="关闭">×</button>
    </div>
    ${databaseAvatar(item, "large")}
    <button class="adapted-select" type="button">
      <span>${item.adapted ? "标记为已适配" : "标记为未适配"}</span>
      <span>⌄</span>
    </button>
    <dl class="detail-list">
      <dt>Package</dt>
      <dd>${escapeHtml(item.packageName)}</dd>
      <dt>Activity</dt>
      <dd>${escapeHtml(item.mainActivity)}</dd>
      <dt>请求次数</dt>
      <dd>${item.requestCount || 0}</dd>
      <dt>标签</dt>
      <dd><span class="tag-add">+</span></dd>
    </dl>
    <div class="detail-divider"></div>
    <section class="localized-box">
      <h3>本地化名称</h3>
      <p><span>zh</span>${escapeHtml(item.localizedName || name)}</p>
      <p><span>en</span>${escapeHtml(item.defaultName || name)}</p>
    </section>
  `;
}

function renderUploadPage() {
  if (!state.user) return;
  const packSelect = $("uploadPackSelect");
  const versionSelect = $("uploadVersionSelect");
  packSelect.innerHTML = `<option value="">选择图标包</option>${state.packs.map((pack) => (
    `<option value="${escapeHtml(pack.id)}"${pack.id === state.uploadPackId ? " selected" : ""}>${escapeHtml(pack.name)}</option>`
  )).join("")}`;

  const pack = selectedUploadPack();
  versionSelect.disabled = !pack;
  versionSelect.innerHTML = pack
    ? pack.versions.map((version) => `<option value="${escapeHtml(version.id)}"${version.id === state.uploadVersionId ? " selected" : ""}>${escapeHtml(version.name)}</option>`).join("")
    : `<option value="">请先选择图标包</option>`;

  $("uploadFileName").textContent = state.uploadFile ? state.uploadFile.name : "将 ZIP 文件拖放到此处";
  $("uploadFileHint").textContent = state.uploadFile ? `${formatFileSize(state.uploadFile.size)} · 可点击重新选择` : "或点击选择文件";
  $("submitUploadBtn").disabled = !state.uploadFile || !state.uploadVersionId;
}

function selectedUploadPack() {
  return state.packs.find((pack) => pack.id === state.uploadPackId);
}

async function submitUpload() {
  if (!state.uploadFile || !state.uploadVersionId) return;
  const form = new FormData();
  form.set("file", state.uploadFile);
  form.set("iconPackId", state.uploadPackId);
  form.set("versionId", state.uploadVersionId);
  const headers = {};
  if (state.adminToken) headers["x-admin-token"] = state.adminToken;
  try {
    $("submitUploadBtn").disabled = true;
    const data = await api("/api/upload-app-info", { method: "POST", headers, body: form });
    toast(data.message || "上传成功");
    state.uploadFile = null;
    $("uploadZipInput").value = "";
    await loadDatabase();
    render();
  } catch (error) {
    toast(error.message);
  } finally {
    renderUploadPage();
  }
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderStats() {
  const stats = state.stats || {};
  $("statPackCount").textContent = stats.packCount ?? "--";
  $("statPackSub").textContent = t("packSub", stats.packCount);
  $("statRequestCount").textContent = stats.requestCount ?? "--";
  $("statAdaptedCount").textContent = stats.adaptedCount ?? "--";
  $("statLastUpdated").textContent = formatDaysAgo(stats.lastUpdatedAt);

  if (!state.recent.length) {
    $("recentActivity").className = "empty-activity";
    $("recentActivity").textContent = t("activityEmpty");
    return;
  }

  $("recentActivity").className = "activity-list";
  $("recentActivity").innerHTML = state.recent.map((item) => `
    <div class="activity-item">
      <span class="pack-icon">${iconSvg(item.adapted ? "check" : "plus")}</span>
      <span>
        <strong>${escapeHtml(item.localizedName || item.defaultName || item.packageName)}</strong>
        <small>${escapeHtml(t("recentItem", item.packName, item.packageName, item.requestCount))}</small>
      </span>
    </div>
  `).join("");
}

function renderAdminUsers() {
  $("adminCurrentIp").textContent = state.adminCurrentIp || "-";
  $("adminUsersBody").innerHTML = "";
  for (const user of state.adminUsers) {
    const editablePermission = canEditPermission() && String(user.email || "").toLowerCase() !== OWNER_EMAIL;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${escapeHtml(displayAccount(user.email))}</td>
      <td>${escapeHtml(user.name)}</td>
      <td>${t("passwordEncrypted")}</td>
      <td>${editablePermission
        ? `<input class="permission-input" data-user-id="${escapeHtml(user.id)}" value="${escapeHtml(user.permissionLevel || "普通会员")}" aria-label="权限级别">`
        : `<span class="permission-pill">${escapeHtml(user.permissionLevel || "普通会员")}</span>`}</td>
      <td>${user.iconPackCount}</td>
      <td class="mono">${escapeHtml(displayIpForUser(user))}</td>
      <td>${escapeHtml(formatDateTime(user.lastSeenAt))}</td>
    `;
    $("adminUsersBody").appendChild(tr);
  }
  document.querySelectorAll(".permission-input").forEach((input) => {
    input.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    };
    input.onblur = () => updatePermission(input.dataset.userId, input.value.trim());
  });
}

async function updatePermission(userId, permissionLevel) {
  const user = state.adminUsers.find((item) => item.id === userId);
  if (!user || user.permissionLevel === permissionLevel) return;
  if (!permissionLevel) {
    renderAdminUsers();
    return toast("权限级别不能为空");
  }
  try {
    await api(`/api/admin/users/${userId}/permission`, {
      method: "PATCH",
      headers: { "x-admin-token": state.adminToken },
      body: JSON.stringify({ permissionLevel })
    });
    user.permissionLevel = permissionLevel;
    toast(t("permissionUpdated"));
  } catch (error) {
    toast(error.message);
    renderAdminUsers();
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

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(state.lang === "zh" ? "zh-CN" : "en-US");
}

function formatDateTime(value) {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US");
}

function formatDaysAgo(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  return days === 0 ? t("today") : String(days);
}

function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = iconSvg(node.dataset.icon);
  });
}

function iconSvg(name) {
  const attrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = {
    cube: '<path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.3 7.6 8.7 4.9 8.7-4.9"/><path d="M12 22v-9.5"/>',
    stats: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M13 16V8"/><path d="M18 16v-9"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    moon: '<path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    panel: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M10 4v16"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v4H4v-4"/>',
    sort: '<path d="M8 4v16"/><path d="m4 8 4-4 4 4"/><path d="M16 20V4"/><path d="m12 16 4 4 4-4"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>'
  };
  return `<svg ${attrs}>${paths[name] || paths.cube}</svg>`;
}

boot().catch((error) => toast(error.message));
