const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SESSION_DAYS = 14;
const REGISTER_LIMIT_PER_DEVICE_DAY = 3;
const LOGIN_FAILURE_LIMIT_PER_ACCOUNT_DAY = 10;
const ADMIN_SESSION_HOURS = 6;
const ADMIN_PASSWORD_HASH = "f1e978b9b267e4445a3f01b80e1d2cb3d3d9a0cd044577c943aa9bd6718d7a05";
const OWNER_EMAIL = "2841139293@qq.com";
const DEFAULT_PERMISSION_LEVEL = "普通会员";
const OWNER_PERMISSION_LEVEL = "超级管理员";
const UPLOAD_LIMIT_PER_MINUTE = 10;
const DATABASE_READ_LIMIT_PER_MINUTE = 60;
const EXPORT_LIMIT_PER_MINUTE = 12;
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const ICON_MAX_BYTES = 256 * 1024;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));

  try {
    if (url.pathname.startsWith("/api/")) {
      return withCors(await handleApi(request, env, url));
    }
    if (request.method === "PUT" && url.pathname.startsWith("/upload/")) {
      return withCors(await handleIconUpload(request, env, url));
    }
    if (url.pathname === "/app-info/create" && request.method === "POST") {
      return withCors(await handleCreateAppInfo(request, env));
    }
    if (url.pathname === "/app-icon/generate-upload-url" && request.method === "GET") {
      return withCors(await handleGenerateUploadUrl(request, env, url));
    }
    return next();
  } catch (error) {
    return withCors(json({ error: error.message || "Internal error" }, error.status || 500));
  }
}

async function handleApi(request, env, url) {
  if (url.pathname === "/api/register" && request.method === "POST") return register(request, env);
  if (url.pathname === "/api/login" && request.method === "POST") return login(request, env);
  if (url.pathname === "/api/logout" && request.method === "POST") return logout(request, env);
  if (url.pathname === "/api/password-recovery" && request.method === "POST") return submitPasswordRecovery(request, env);
  if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
  if (url.pathname === "/api/admin/users" && request.method === "GET") return listAdminUsers(request, env);

  const user = await requireUser(request, env);

  if (url.pathname === "/api/me" && request.method === "GET") return json({ user });
  if (url.pathname === "/api/database" && request.method === "GET") return listDatabase(request, env, user.id, url.searchParams);
  if (url.pathname === "/api/upload-app-info" && request.method === "POST") return uploadAppInfo(request, env, user);
  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/permission$/) && request.method === "PATCH") {
    return updateUserPermission(request, env, user, url.pathname.split("/")[4]);
  }
  if (url.pathname.match(/^\/api\/admin\/users\/[^/]+\/password$/) && request.method === "PATCH") {
    return updateUserPassword(request, env, user, url.pathname.split("/")[4]);
  }
  if (url.pathname === "/api/stats" && request.method === "GET") return getStats(env, user.id);
  if (url.pathname === "/api/icon-packs" && request.method === "GET") return listIconPacks(env, user.id);
  if (url.pathname === "/api/icon-packs" && request.method === "POST") return createIconPack(request, env, user.id);
  if (url.pathname.match(/^\/api\/icon-packs\/[^/]+$/) && request.method === "DELETE") {
    return deleteIconPack(env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/icon-packs\/[^/]+\/move$/) && request.method === "PATCH") {
    return moveIconPack(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/icon-packs\/[^/]+\/versions$/) && request.method === "POST") {
    return createVersion(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+$/) && request.method === "DELETE") {
    return deleteVersion(env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/tokens$/) && request.method === "POST") {
    return createAccessToken(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/requests$/) && request.method === "GET") {
    return listRequests(env, user.id, url.pathname.split("/")[3], url.searchParams);
  }
  if (url.pathname.match(/^\/api\/requests\/[^/]+\/adapted$/) && request.method === "PATCH") {
    return setAdapted(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/requests\/[^/]+\/category$/) && request.method === "PATCH") {
    return setRequestCategory(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/import-appfilter$/) && request.method === "POST") {
    return importAppfilter(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/export-appfilter$/) && request.method === "GET") {
    return exportAppfilter(request, env, user.id, url.pathname.split("/")[3]);
  }

  return json({ error: "Not found" }, 404);
}

async function register(request, env) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || email.split("@")[0];
  const password = String(body.password || "");
  if (!email.includes("@") || password.length < 8) throw httpError("Email or password is invalid", 400);

  const device = await deviceKeys(request);
  const registerAttempts = await Promise.all(device.keys.map((key) => rateLimitCount(env, "register_device", key)));
  if (registerAttempts.some((count) => count >= REGISTER_LIMIT_PER_DEVICE_DAY)) {
    throw httpError("This device can only register 3 accounts per day. Please try again tomorrow.", 429);
  }

  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) throw httpError("Email already registered", 409);

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, email, name, password_hash, permission_level) VALUES (?, ?, ?, ?, ?)")
      .bind(id, email, name, await passwordHash(password), defaultPermissionForEmail(email)),
    ...device.keys.map((key) => rateLimitIncrementStatement(env, "register_device", key))
  ]);
  await recordUserAccess(env, id, request);
  return createSession(env, { id, email, name }, device.cookieToken);
}

async function login(request, env) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const adminPassword = String(body.adminPassword || "");
  const failures = await rateLimitCount(env, "login_fail", email);
  if (failures >= LOGIN_FAILURE_LIMIT_PER_ACCOUNT_DAY) {
    throw httpError("This account has failed to log in 10 times today. Please try again tomorrow.", 429);
  }
  const user = await env.DB.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await rateLimitIncrement(env, "login_fail", email);
    throw httpError("Email or password is wrong", 401);
  }
  if (email === OWNER_EMAIL && await sha256Hex(adminPassword) !== ADMIN_PASSWORD_HASH) {
    await rateLimitIncrement(env, "login_fail", email);
    throw httpError("Super admin verification is required", 403);
  }
  await recordUserAccess(env, user.id, request);
  return createSession(env, user);
}

async function logout(request, env) {
  const token = bearerToken(request) || cookieToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function createSession(env, user, deviceToken = "") {
  const token = randomToken(32);
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expires)
    .run();
  const cookies = [sessionCookie(token, expires)];
  if (deviceToken) cookies.push(deviceCookie(deviceToken));
  return json({ user: publicUser(user), token }, 200, { "set-cookie": cookies });
}

async function adminLogin(request, env) {
  const body = await readJson(request);
  const password = String(body.password || "");
  const hash = await sha256Hex(password);
  if (hash !== ADMIN_PASSWORD_HASH) throw httpError("Admin password is wrong", 401);

  const token = randomToken(32);
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_HOURS * 3600;
  await env.DB.prepare("INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)")
    .bind(token, expires)
    .run();
  return json({ token, expiresAt: expires, currentIp: clientIp(request) });
}

async function submitPasswordRecovery(request, env) {
  const body = await readJson(request);
  const accountName = String(body.accountName || "").trim();
  const phone = String(body.phone || "").trim();
  if (!accountName || !phone) throw httpError("Phone and account are required", 400);
  if (accountName.length > 120 || phone.length > 40) throw httpError("Recovery info is too long", 400);

  const normalized = accountName.toLowerCase();
  const matched = await env.DB.prepare(`
    SELECT id
    FROM users
    WHERE lower(email) = ? OR lower(name) = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(normalized, normalized).first();

  await env.DB.prepare(`
    INSERT INTO password_recovery_requests (id, account_name, phone, matched_user_id, requester_ip, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(crypto.randomUUID(), accountName, phone, matched?.id || null, clientIp(request), new Date().toISOString()).run();
  return json({ ok: true });
}

async function listAdminUsers(request, env) {
  await requireAdmin(request, env, request.headers.get("x-admin-token") ? "x-admin-token" : "authorization");
  const viewer = await optionalUser(request, env);
  const canViewSensitiveIp = String(viewer?.email || "").toLowerCase() === OWNER_EMAIL;
  const canViewRecovery = String(viewer?.email || "").toLowerCase() === OWNER_EMAIL;
  const rows = await env.DB.prepare(`
    SELECT
      users.id,
      users.email,
      users.name,
      users.password_hash,
      COALESCE(users.permission_level, '${DEFAULT_PERMISSION_LEVEL}') AS permissionLevel,
      users.created_at AS createdAt,
      user_access.last_ip AS lastIp,
      user_access.last_seen_at AS lastSeenAt,
      COUNT(DISTINCT icon_packs.id) AS iconPackCount,
      recovery.account_name AS recoveryAccountName,
      recovery.phone AS recoveryPhone,
      recovery.requester_ip AS recoveryIp,
      recovery.created_at AS recoveryCreatedAt
    FROM users
    LEFT JOIN icon_packs ON icon_packs.user_id = users.id
    LEFT JOIN user_access ON user_access.user_id = users.id
    LEFT JOIN (
      SELECT matched_user_id, account_name, phone, requester_ip, created_at
      FROM (
        SELECT
          password_recovery_requests.*,
          ROW_NUMBER() OVER (PARTITION BY matched_user_id ORDER BY created_at DESC) AS row_number
        FROM password_recovery_requests
        WHERE matched_user_id IS NOT NULL
      )
      WHERE row_number = 1
    ) AS recovery ON recovery.matched_user_id = users.id
    GROUP BY users.id
    ORDER BY users.created_at DESC
  `).all();
  return json({
    currentIp: clientIp(request),
    users: (rows.results || []).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      permissionLevel: user.permissionLevel || DEFAULT_PERMISSION_LEVEL,
      createdAt: user.createdAt,
      lastIp: displayAdminIp(user, canViewSensitiveIp),
      lastSeenAt: user.lastSeenAt || "-",
      iconPackCount: user.iconPackCount || 0,
      passwordStatus: "已加密保存",
      passwordDigest: canViewRecovery ? String(user.password_hash || "").split(":").at(-1)?.slice(0, 12) || "" : "",
      recovery: canViewRecovery && user.recoveryPhone ? {
        accountName: user.recoveryAccountName,
        phone: user.recoveryPhone,
        ip: user.recoveryIp,
        createdAt: user.recoveryCreatedAt
      } : null
    }))
  });
}

async function updateUserPermission(request, env, actor, targetUserId) {
  if (String(actor.email || "").toLowerCase() !== OWNER_EMAIL) throw httpError("Permission denied", 403);
  await requireAdmin(request, env, "x-admin-token");
  const body = await readJson(request);
  const permissionLevel = String(body.permissionLevel || "").trim();
  if (!permissionLevel || permissionLevel.length > 24) throw httpError("Permission level is invalid", 400);
  await env.DB.prepare("UPDATE users SET permission_level = ? WHERE id = ?")
    .bind(permissionLevel, targetUserId)
    .run();
  return json({ ok: true, permissionLevel });
}

async function updateUserPassword(request, env, actor, targetUserId) {
  if (String(actor.email || "").toLowerCase() !== OWNER_EMAIL) throw httpError("Permission denied", 403);
  await requireAdmin(request, env, "x-admin-token");
  const body = await readJson(request);
  const password = String(body.password || "");
  if (password.length < 8) throw httpError("Password must be at least 8 characters", 400);
  const target = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(targetUserId).first();
  if (!target) throw httpError("User not found", 404);
  await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(await passwordHash(password), targetUserId)
    .run();
  return json({ ok: true, passwordStatus: "已加密保存" });
}

async function requireUser(request, env) {
  const token = bearerToken(request) || cookieToken(request);
  if (!token) throw httpError("Unauthorized", 401);
  const row = await env.DB.prepare(`
    SELECT users.id, users.email, users.name, COALESCE(users.permission_level, '${DEFAULT_PERMISSION_LEVEL}') AS permissionLevel
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ?
  `).bind(token, Math.floor(Date.now() / 1000)).first();
  if (!row) throw httpError("Unauthorized", 401);
  return publicUser(row);
}

async function optionalUser(request, env) {
  try {
    return await requireUser(request, env);
  } catch {
    return null;
  }
}

async function requireAdmin(request, env, headerName = "authorization") {
  const token = headerName === "authorization" ? bearerToken(request) : (request.headers.get(headerName) || "");
  if (!token) throw httpError("Admin unauthorized", 401);
  const row = await env.DB.prepare("SELECT token FROM admin_sessions WHERE token = ? AND expires_at > ?")
    .bind(token, Math.floor(Date.now() / 1000))
    .first();
  if (!row) throw httpError("Admin unauthorized", 401);
}

async function hasAdminSession(request, env, headerName = "authorization") {
  try {
    await requireAdmin(request, env, headerName);
    return true;
  } catch {
    return false;
  }
}

async function listIconPacks(env, userId) {
  const rows = await env.DB.prepare(`
    SELECT
      icon_packs.id AS iconPackId,
      icon_packs.name AS iconPackName,
      versions.id AS versionId,
      versions.name AS versionName,
      versions.created_at AS versionCreatedAt
    FROM icon_packs
    LEFT JOIN versions ON versions.icon_pack_id = icon_packs.id
    WHERE icon_packs.user_id = ?
    ORDER BY icon_packs.created_at DESC, icon_packs.id DESC, versions.created_at DESC
  `).bind(userId).all();

  const packs = [];
  const byId = new Map();
  for (const row of rows.results || []) {
    if (!byId.has(row.iconPackId)) {
      const pack = { id: row.iconPackId, name: row.iconPackName, versions: [] };
      byId.set(row.iconPackId, pack);
      packs.push(pack);
    }
    if (row.versionId) {
      byId.get(row.iconPackId).versions.push({
        id: row.versionId,
        name: row.versionName,
        createdAt: row.versionCreatedAt
      });
    }
  }
  return json({ iconPacks: packs });
}

async function getStats(env, userId) {
  const summary = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT icon_packs.id) AS packCount,
      COUNT(DISTINCT app_requests.package_name || '/' || app_requests.main_activity) AS requestCount,
      COUNT(DISTINCT CASE WHEN app_requests.adapted = 1 THEN app_requests.package_name || '/' || app_requests.main_activity END) AS adaptedCount,
      MAX(COALESCE(app_requests.last_requested_at, versions.created_at, icon_packs.created_at)) AS lastUpdatedAt
    FROM icon_packs
    LEFT JOIN versions ON versions.icon_pack_id = icon_packs.id
    LEFT JOIN app_requests ON app_requests.version_id = versions.id
    WHERE icon_packs.user_id = ?
  `).bind(userId).first();

  const recentRows = await env.DB.prepare(`
    SELECT
      icon_packs.name AS packName,
      app_requests.localized_name AS localizedName,
      app_requests.default_name AS defaultName,
      app_requests.package_name AS packageName,
      app_requests.request_count AS requestCount,
      app_requests.adapted AS adapted,
      app_requests.last_requested_at AS lastRequestedAt
    FROM app_requests
    JOIN versions ON versions.id = app_requests.version_id
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE icon_packs.user_id = ?
    ORDER BY app_requests.last_requested_at DESC, app_requests.request_count DESC
    LIMIT 6
  `).bind(userId).all();

  return json({
    stats: {
      packCount: summary?.packCount || 0,
      requestCount: summary?.requestCount || 0,
      adaptedCount: summary?.adaptedCount || 0,
      lastUpdatedAt: summary?.lastUpdatedAt || null
    },
    recent: recentRows.results || []
  });
}

async function createIconPack(request, env, userId) {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) throw httpError("Name is required", 400);
  const id = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO icon_packs (id, user_id, name, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, userId, name, now),
    env.DB.prepare("INSERT INTO versions (id, icon_pack_id, name, created_at) VALUES (?, ?, ?, ?)")
      .bind(versionId, id, "1.0", now)
  ]);
  return json({ iconPack: { id, name, versions: [{ id: versionId, name: "1.0" }] } });
}

async function deleteIconPack(env, userId, iconPackId) {
  await assertIconPackOwner(env, userId, iconPackId);
  await env.DB.batch([
    env.DB.prepare(`
      DELETE FROM access_tokens
      WHERE version_id IN (SELECT id FROM versions WHERE icon_pack_id = ?)
    `).bind(iconPackId),
    env.DB.prepare(`
      DELETE FROM app_requests
      WHERE version_id IN (SELECT id FROM versions WHERE icon_pack_id = ?)
    `).bind(iconPackId),
    env.DB.prepare("DELETE FROM versions WHERE icon_pack_id = ?").bind(iconPackId),
    env.DB.prepare("DELETE FROM icon_packs WHERE id = ? AND user_id = ?").bind(iconPackId, userId)
  ]);
  return listIconPacks(env, userId);
}

async function moveIconPack(request, env, userId, iconPackId) {
  const body = await readJson(request);
  const direction = String(body.direction || "");
  if (!["up", "down"].includes(direction)) throw httpError("Direction is invalid", 400);

  await assertIconPackOwner(env, userId, iconPackId);
  const rows = await env.DB.prepare(`
    SELECT id
    FROM icon_packs
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
  `).bind(userId).all();
  const packs = rows.results || [];
  const index = packs.findIndex((pack) => pack.id === iconPackId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= packs.length) return listIconPacks(env, userId);

  [packs[index], packs[swapIndex]] = [packs[swapIndex], packs[index]];
  const base = Date.now();
  const updates = packs.map((pack, order) => env.DB.prepare("UPDATE icon_packs SET created_at = ? WHERE id = ? AND user_id = ?")
    .bind(new Date(base - order * 1000).toISOString(), pack.id, userId));
  await env.DB.batch(updates);
  return listIconPacks(env, userId);
}

async function createVersion(request, env, userId, iconPackId) {
  await assertIconPackOwner(env, userId, iconPackId);
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) throw httpError("Version name is required", 400);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO versions (id, icon_pack_id, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, iconPackId, name, now)
    .run();
  return json({ version: { id, iconPackId, name, createdAt: now } });
}

async function deleteVersion(env, userId, versionId) {
  const row = await env.DB.prepare(`
    SELECT versions.id, versions.icon_pack_id AS iconPackId
    FROM versions
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE versions.id = ? AND icon_packs.user_id = ?
  `).bind(versionId, userId).first();
  if (!row) throw httpError("Version not found", 404);

  const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM versions WHERE icon_pack_id = ?")
    .bind(row.iconPackId)
    .first();
  if ((countRow?.count || 0) <= 1) throw httpError("Keep at least one version", 400);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM access_tokens WHERE version_id = ?").bind(versionId),
    env.DB.prepare("DELETE FROM app_requests WHERE version_id = ?").bind(versionId),
    env.DB.prepare("DELETE FROM versions WHERE id = ?").bind(versionId)
  ]);
  return listIconPacks(env, userId);
}

async function createAccessToken(request, env, userId, versionId) {
  await assertVersionOwner(env, userId, versionId);
  const body = await readJson(request);
  const label = String(body.label || "App token").trim();
  const token = `mat_${randomToken(36)}`;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO access_tokens (id, version_id, token_hash, label) VALUES (?, ?, ?, ?)")
    .bind(id, versionId, await sha256Hex(token), label)
    .run();
  return json({ token: { id, label, token } });
}

async function listRequests(env, userId, versionId, params) {
  await assertVersionOwner(env, userId, versionId);
  const adapted = params.get("adapted");
  const where = adapted === "1" ? "AND adapted = 1" : adapted === "0" ? "AND adapted = 0" : "";
  const rows = await env.DB.prepare(`
    SELECT *
    FROM app_requests
    WHERE version_id = ? ${where}
    ORDER BY adapted ASC, request_count DESC, last_requested_at DESC
  `).bind(versionId).all();
  return json({ requests: rows.results || [] });
}

async function setAdapted(request, env, userId, requestId) {
  const body = await readJson(request);
  const row = await env.DB.prepare(`
    SELECT app_requests.id
    FROM app_requests
    JOIN versions ON versions.id = app_requests.version_id
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE app_requests.id = ? AND icon_packs.user_id = ?
  `).bind(requestId, userId).first();
  if (!row) throw httpError("Request not found", 404);
  await env.DB.prepare("UPDATE app_requests SET adapted = ? WHERE id = ?")
    .bind(body.adapted ? 1 : 0, requestId)
    .run();
  return json({ ok: true });
}

async function setRequestCategory(request, env, userId, requestId) {
  const body = await readJson(request);
  const category = String(body.category || "无分类").trim().slice(0, 40) || "无分类";
  const row = await env.DB.prepare(`
    SELECT app_requests.id
    FROM app_requests
    JOIN versions ON versions.id = app_requests.version_id
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE app_requests.id = ? AND icon_packs.user_id = ?
  `).bind(requestId, userId).first();
  if (!row) throw httpError("Request not found", 404);
  await env.DB.prepare("UPDATE app_requests SET category = ? WHERE id = ?")
    .bind(category, requestId)
    .run();
  return json({ ok: true, category });
}

async function importAppfilter(request, env, userId, versionId) {
  await assertVersionOwner(env, userId, versionId);
  const text = await request.text();
  const components = [...text.matchAll(/ComponentInfo\{([^/{}]+)\/([^{}]+)\}[^>]*drawable="([^"]+)"/g)]
    .map((match) => ({ packageName: match[1], mainActivity: match[2], drawable: match[3] }));
  const statements = components.map((item) => env.DB.prepare(`
    INSERT INTO app_requests (
      id, version_id, language_code, localized_name, default_name, package_name,
      main_activity, system_app, request_count, adapted
    ) VALUES (?, ?, 'import', ?, ?, ?, ?, 0, 0, 1)
    ON CONFLICT(version_id, package_name, main_activity) DO UPDATE SET adapted = 1
  `).bind(crypto.randomUUID(), versionId, item.drawable, item.drawable, item.packageName, item.mainActivity));
  if (statements.length) await env.DB.batch(statements);
  return json({ imported: components.length });
}

async function exportAppfilter(request, env, userId, versionId) {
  await enforceReadLimit(request, env, userId, "export", EXPORT_LIMIT_PER_MINUTE);
  await assertVersionOwner(env, userId, versionId);
  const rows = await env.DB.prepare(`
    SELECT package_name, main_activity, default_name
    FROM app_requests
    WHERE version_id = ? AND adapted = 1
    ORDER BY package_name, main_activity
  `).bind(versionId).all();
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"];
  for (const row of rows.results || []) {
    const drawable = sanitizeDrawable(row.default_name);
    lines.push(`  <item component="ComponentInfo{${escapeXml(row.package_name)}/${escapeXml(row.main_activity)}}" drawable="${escapeXml(drawable)}" />`);
  }
  lines.push("</resources>", "");
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": "attachment; filename=appfilter.xml"
    }
  });
}

async function listDatabase(request, env, userId, params) {
  await enforceReadLimit(request, env, userId, "database", DATABASE_READ_LIMIT_PER_MINUTE);
  const q = `%${String(params.get("q") || "").trim()}%`;
  const type = String(params.get("type") || "appfilter").toLowerCase();
  const sortDirection = params.get("sort") === "asc" ? "ASC" : "DESC";
  const typeWhere = type === "drawable"
    ? "AND app_requests.adapted = 1"
    : type === "iconpack"
      ? "AND app_requests.system_app = 0"
      : "";
  const rows = await env.DB.prepare(`
    WITH visible_requests AS (
      SELECT
        app_requests.*,
        icon_packs.name AS icon_pack_name,
        versions.name AS version_name,
        ROW_NUMBER() OVER (
          PARTITION BY app_requests.package_name, app_requests.main_activity
          ORDER BY app_requests.last_requested_at DESC, app_requests.request_count DESC
        ) AS row_number,
        MAX(app_requests.request_count) OVER (
          PARTITION BY app_requests.package_name, app_requests.main_activity
        ) AS grouped_request_count,
        MAX(app_requests.icon_uploaded) OVER (
          PARTITION BY app_requests.package_name, app_requests.main_activity
        ) AS grouped_icon_uploaded,
        MAX(app_requests.icon_data_url) OVER (
          PARTITION BY app_requests.package_name, app_requests.main_activity
        ) AS grouped_icon_data_url
      FROM app_requests
      JOIN versions ON versions.id = app_requests.version_id
      JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
      WHERE icon_packs.user_id = ?
        AND (
          app_requests.localized_name LIKE ?
          OR app_requests.default_name LIKE ?
          OR app_requests.package_name LIKE ?
          OR app_requests.main_activity LIKE ?
          OR icon_packs.name LIKE ?
        )
        ${typeWhere}
    )
    SELECT
      id,
      localized_name AS localizedName,
      default_name AS defaultName,
      package_name AS packageName,
      main_activity AS mainActivity,
      grouped_request_count AS requestCount,
      adapted,
      COALESCE(category, '无分类') AS category,
      grouped_icon_uploaded AS iconUploaded,
      grouped_icon_data_url AS iconDataUrl,
      system_app AS systemApp,
      icon_pack_name AS iconPackName,
      version_name AS versionName
    FROM visible_requests
    WHERE row_number = 1
    ORDER BY requestCount ${sortDirection}, last_requested_at ${sortDirection}
    LIMIT 120
  `).bind(userId, q, q, q, q, q).all();
  return json({
    items: (rows.results || []).map((item) => ({
      ...item,
      drawable: sanitizeDrawable(item.defaultName || item.localizedName || item.packageName),
      adapted: !!item.adapted,
      iconUploaded: !!item.iconUploaded,
      iconDataUrl: item.iconDataUrl || "",
      systemApp: !!item.systemApp
    }))
  });
}

async function uploadAppInfo(request, env, user) {
  const adminBypass = await hasAdminSession(request, env, "x-admin-token");
  if (!adminBypass) {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > UPLOAD_MAX_BYTES) throw httpError("ZIP 文件不能超过 8 MB", 413);
    await enforceUploadLimit(request, env, user.id);
  }

  const form = await request.formData();
  const file = form.get("file");
  const versionId = String(form.get("versionId") || "");
  if (!file || typeof file === "string") throw httpError("请选择 ZIP 文件", 400);
  if (!file.name.toLowerCase().endsWith(".zip")) throw httpError("Only ZIP files are allowed", 400);
  if (!adminBypass && file.size > UPLOAD_MAX_BYTES) throw httpError("ZIP 文件不能超过 8 MB", 413);
  await assertVersionOwner(env, user.id, versionId);
  await file.arrayBuffer();
  return json({
    ok: true,
    bypassedLimit: adminBypass,
    message: adminBypass ? "管理员上传已接收" : "上传已接收"
  });
}

async function enforceUploadLimit(request, env, userId) {
  const minute = new Date().toISOString().slice(0, 16);
  const ip = clientIp(request);
  const ipKey = await sha256Hex(`upload-ip:${ip}`);
  const userKey = `upload-user:${userId}`;
  const [ipCount, userCount] = await Promise.all([
    rateLimitCount(env, "upload", ipKey, minute),
    rateLimitCount(env, "upload", userKey, minute)
  ]);
  if (ipCount >= UPLOAD_LIMIT_PER_MINUTE || userCount >= UPLOAD_LIMIT_PER_MINUTE) {
    throw httpError("上传过于频繁，请稍后再试", 429);
  }
  await env.DB.batch([
    rateLimitIncrementStatement(env, "upload", ipKey, minute),
    rateLimitIncrementStatement(env, "upload", userKey, minute)
  ]);
}

async function enforceReadLimit(request, env, userId, kind, limit) {
  const minute = new Date().toISOString().slice(0, 16);
  const ipKey = await sha256Hex(`${kind}-ip:${clientIp(request)}`);
  const userKey = `${kind}-user:${userId}`;
  const [ipCount, userCount] = await Promise.all([
    rateLimitCount(env, kind, ipKey, minute),
    rateLimitCount(env, kind, userKey, minute)
  ]);
  if (ipCount >= limit || userCount >= limit) {
    throw httpError("请求过于频繁，请稍后再试", 429);
  }
  await env.DB.batch([
    rateLimitIncrementStatement(env, kind, ipKey, minute),
    rateLimitIncrementStatement(env, kind, userKey, minute)
  ]);
}

async function handleCreateAppInfo(request, env) {
  const tokenInfo = await requireAppToken(request, env);
  const apps = await readJson(request);
  if (!Array.isArray(apps)) throw httpError("Expected an array", 400);
  const now = new Date().toISOString();
  const statements = apps.map((app) => {
    const packageName = String(app.packageName || "").trim();
    const mainActivity = String(app.mainActivity || "").trim();
    if (!packageName || !mainActivity) throw httpError("packageName and mainActivity are required", 400);
    return env.DB.prepare(`
      INSERT INTO app_requests (
        id, version_id, language_code, localized_name, default_name, package_name,
        main_activity, system_app, request_count, last_requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(version_id, package_name, main_activity) DO UPDATE SET
        localized_name = excluded.localized_name,
        default_name = excluded.default_name,
        language_code = excluded.language_code,
        system_app = excluded.system_app,
        last_requested_at = excluded.last_requested_at
    `).bind(
      crypto.randomUUID(),
      tokenInfo.versionId,
      String(app.languageCode || "und"),
      String(app.localizedName || app.defaultName || packageName),
      String(app.defaultName || app.localizedName || packageName),
      packageName,
      mainActivity,
      app.systemApp ? 1 : 0,
      now
    );
  });
  if (statements.length) await env.DB.batch(statements);
  return json(apps.map((app) => ({
    defaultName: String(app.defaultName || app.localizedName || app.packageName || ""),
    packageName: String(app.packageName || ""),
    mainActivity: String(app.mainActivity || ""),
    id: `${tokenInfo.versionId}:${app.packageName}:${app.mainActivity}`,
    createdAt: now
  })));
}

async function handleGenerateUploadUrl(request, env, url) {
  const tokenInfo = await requireAppToken(request, env);
  const packageName = url.searchParams.get("packageName") || "icon";
  const mainActivity = url.searchParams.get("mainActivity") || "";
  const sig = await uploadSignature(tokenInfo.versionId, packageName, mainActivity);
  const params = new URLSearchParams({ sig });
  if (mainActivity) params.set("mainActivity", mainActivity);
  return json({ uploadURL: `${url.origin}/upload/${encodeURIComponent(tokenInfo.versionId)}/${encodeURIComponent(packageName)}.png?${params}` });
}

async function handleIconUpload(request, env, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const rawFileName = parts.length >= 3 ? parts[2] : parts[1];
  const versionId = parts.length >= 3 ? decodeURIComponent(parts[1]) : "";
  const packageName = decodeURIComponent(rawFileName || "").replace(/\.png$/, "");
  const mainActivity = url.searchParams.get("mainActivity") || "";
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > ICON_MAX_BYTES) throw httpError("Icon PNG cannot exceed 256 KB", 413);

  if (versionId) {
    const sig = url.searchParams.get("sig") || "";
    const expectedSig = await uploadSignature(versionId, packageName, mainActivity);
    if (sig !== expectedSig) throw httpError("Icon upload signature is invalid", 401);
    const dataUrl = iconDataUrl(bytes, request.headers.get("content-type") || "image/png");
    const result = mainActivity
      ? await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1, icon_data_url = ? WHERE package_name = ? AND main_activity = ? AND (icon_data_url IS NULL OR icon_data_url = '')")
        .bind(dataUrl, packageName, mainActivity)
        .run()
      : await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1, icon_data_url = ? WHERE package_name = ? AND (icon_data_url IS NULL OR icon_data_url = '')")
        .bind(dataUrl, packageName)
        .run();
    if (!result.meta?.changes && mainActivity) {
      await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1 WHERE package_name = ? AND main_activity = ?")
        .bind(packageName, mainActivity)
        .run();
    } else if (!result.meta?.changes) {
      await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1 WHERE package_name = ?")
        .bind(packageName)
        .run();
    }
    return json({ ok: true, updated: result.meta?.changes || 0 });
  }

  await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1 WHERE package_name = ?").bind(packageName).run();
  return new Response("", { status: 200 });
}

async function uploadSignature(versionId, packageName, mainActivity) {
  return sha256Hex(`icon-upload:${versionId}:${packageName}:${mainActivity}`);
}

function iconDataUrl(bytes, contentType) {
  const type = String(contentType || "image/png").split(";")[0].trim();
  if (!["image/png", "image/webp", "image/jpeg"].includes(type)) throw httpError("Only PNG, WebP or JPEG icons are allowed", 415);
  return `data:${type};base64,${base64Encode(bytes)}`;
}

function base64Encode(bytes) {
  let binary = "";
  const array = new Uint8Array(bytes);
  const chunkSize = 0x8000;
  for (let index = 0; index < array.length; index += chunkSize) {
    binary += String.fromCharCode(...array.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
async function requireAppToken(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw httpError("Missing bearer token", 401);
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(`
    SELECT versions.id AS versionId, icon_packs.user_id AS userId
    FROM access_tokens
    JOIN versions ON versions.id = access_tokens.version_id
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE access_tokens.token_hash = ? AND access_tokens.revoked_at IS NULL
  `).bind(tokenHash).first();
  if (!row) throw httpError("Invalid token", 401);
  return row;
}

async function assertIconPackOwner(env, userId, iconPackId) {
  const row = await env.DB.prepare("SELECT id FROM icon_packs WHERE id = ? AND user_id = ?")
    .bind(iconPackId, userId)
    .first();
  if (!row) throw httpError("Icon pack not found", 404);
}

async function assertVersionOwner(env, userId, versionId) {
  const row = await env.DB.prepare(`
    SELECT versions.id
    FROM versions
    JOIN icon_packs ON icon_packs.id = versions.icon_pack_id
    WHERE versions.id = ? AND icon_packs.user_id = ?
  `).bind(versionId, userId).first();
  if (!row) throw httpError("Version not found", 404);
}

function publicUser(user) {
  const email = String(user.email || "").trim().toLowerCase();
  const fallback = defaultPermissionForEmail(email);
  return { id: user.id, email: user.email, name: user.name, permissionLevel: user.permission_level || user.permissionLevel || fallback };
}

function defaultPermissionForEmail(email) {
  return String(email || "").trim().toLowerCase() === OWNER_EMAIL ? OWNER_PERMISSION_LEVEL : DEFAULT_PERMISSION_LEVEL;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError("Invalid JSON", 400);
  }
}

async function passwordHash(password) {
  const salt = randomToken(16);
  const hash = await sha256Hex(`${salt}:${password}`);
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  return !!salt && hash === await sha256Hex(`${salt}:${password}`);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function cookieToken(request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith("session="))?.slice(8) || "";
}

function cookieValue(request, name) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

function sessionCookie(token, expires) {
  const maxAge = expires ? Math.max(0, expires - Math.floor(Date.now() / 1000)) : 0;
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function deviceCookie(token) {
  return `device=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
}

async function recordUserAccess(env, userId, request) {
  const ip = clientIp(request);
  await env.DB.prepare(`
    INSERT INTO user_access (user_id, last_ip, last_seen_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      last_ip = excluded.last_ip,
      last_seen_at = excluded.last_seen_at
  `).bind(userId, ip, new Date().toISOString()).run();
}

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "-";
}

function displayAdminIp(user, canViewSensitiveIp) {
  const ip = user.lastIp || "-";
  const email = String(user.email || "").toLowerCase();
  if (email === "2841139293@qq.com" || email === "1075210552@qq.com") return "********";
  if (!canViewSensitiveIp && user.permissionLevel === "高级会员") return maskIpTail(ip);
  return ip;
}

function maskIpTail(ip) {
  const value = String(ip || "-");
  if (value === "-" || !value.includes(".")) return value;
  return `${value.slice(0, value.lastIndexOf(".") + 1)}*`;
}

async function deviceKeys(request) {
  const existingToken = cookieValue(request, "device");
  const cookieToken = existingToken || randomToken(24);
  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") || "";
  const ipUaKey = await sha256Hex(`ipua:${ip}:${ua}`);
  const keys = [ipUaKey, await sha256Hex(`cookie:${cookieToken}`)];
  return { keys, cookieToken: existingToken ? "" : cookieToken };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function rateLimitKey(kind, subject, day = todayKey()) {
  return `${kind}:${day}:${subject}`;
}

async function rateLimitCount(env, kind, subject, day = todayKey()) {
  const row = await env.DB.prepare("SELECT count FROM auth_rate_limits WHERE key = ?")
    .bind(rateLimitKey(kind, subject, day))
    .first();
  return row?.count || 0;
}

async function rateLimitIncrement(env, kind, subject) {
  await rateLimitIncrementStatement(env, kind, subject).run();
}

function rateLimitIncrementStatement(env, kind, subject, day = todayKey()) {
  return env.DB.prepare(`
    INSERT INTO auth_rate_limits (key, kind, subject, day, count, updated_at)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = count + 1,
      updated_at = excluded.updated_at
  `).bind(rateLimitKey(kind, subject, day), kind, subject, day, new Date().toISOString());
}

function sanitizeDrawable(value) {
  return String(value || "app")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "app_$&") || "app";
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;"
  }[char]));
}

function httpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function json(data, status = 200, headers = {}) {
  const responseHeaders = new Headers(JSON_HEADERS);
  for (const [key, value] of Object.entries(headers)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) responseHeaders.append(key, item);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,PUT,OPTIONS");
  headers.set("access-control-allow-headers", "authorization,content-type,x-admin-token");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
