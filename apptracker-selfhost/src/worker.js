const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const SESSION_DAYS = 14;

export default {
  async fetch(request, env) {
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
      return env.ASSETS.fetch(request);
    } catch (error) {
      return withCors(json({ error: error.message || "Internal error" }, error.status || 500));
    }
  }
};

async function handleApi(request, env, url) {
  if (url.pathname === "/api/register" && request.method === "POST") return register(request, env);
  if (url.pathname === "/api/login" && request.method === "POST") return login(request, env);
  if (url.pathname === "/api/logout" && request.method === "POST") return logout(request, env);

  const user = await requireUser(request, env);

  if (url.pathname === "/api/me" && request.method === "GET") return json({ user });
  if (url.pathname === "/api/icon-packs" && request.method === "GET") return listIconPacks(env, user.id);
  if (url.pathname === "/api/icon-packs" && request.method === "POST") return createIconPack(request, env, user.id);
  if (url.pathname.match(/^\/api\/icon-packs\/[^/]+\/versions$/) && request.method === "POST") {
    return createVersion(request, env, user.id, url.pathname.split("/")[3]);
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
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/import-appfilter$/) && request.method === "POST") {
    return importAppfilter(request, env, user.id, url.pathname.split("/")[3]);
  }
  if (url.pathname.match(/^\/api\/versions\/[^/]+\/export-appfilter$/) && request.method === "GET") {
    return exportAppfilter(env, user.id, url.pathname.split("/")[3]);
  }

  return json({ error: "Not found" }, 404);
}

async function register(request, env) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || email.split("@")[0];
  const password = String(body.password || "");
  if (!email.includes("@") || password.length < 8) throw httpError("Email or password is invalid", 400);

  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) throw httpError("Email already registered", 409);

  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, email, name, await passwordHash(password))
    .run();
  return createSession(env, { id, email, name });
}

async function login(request, env) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await env.DB.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw httpError("Email or password is wrong", 401);
  }
  return createSession(env, user);
}

async function logout(request, env) {
  const token = bearerToken(request) || cookieToken(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
}

async function createSession(env, user) {
  const token = randomToken(32);
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expires)
    .run();
  return json({ user: publicUser(user), token }, 200, { "set-cookie": sessionCookie(token, expires) });
}

async function requireUser(request, env) {
  const token = bearerToken(request) || cookieToken(request);
  if (!token) throw httpError("Unauthorized", 401);
  const row = await env.DB.prepare(`
    SELECT users.id, users.email, users.name
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ?
  `).bind(token, Math.floor(Date.now() / 1000)).first();
  if (!row) throw httpError("Unauthorized", 401);
  return publicUser(row);
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
    ORDER BY icon_packs.created_at DESC, versions.created_at DESC
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

async function createIconPack(request, env, userId) {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) throw httpError("Name is required", 400);
  const id = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO icon_packs (id, user_id, name) VALUES (?, ?, ?)").bind(id, userId, name),
    env.DB.prepare("INSERT INTO versions (id, icon_pack_id, name) VALUES (?, ?, ?)").bind(versionId, id, "1.0")
  ]);
  return json({ iconPack: { id, name, versions: [{ id: versionId, name: "1.0" }] } });
}

async function createVersion(request, env, userId, iconPackId) {
  await assertIconPackOwner(env, userId, iconPackId);
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  if (!name) throw httpError("Version name is required", 400);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO versions (id, icon_pack_id, name) VALUES (?, ?, ?)")
    .bind(id, iconPackId, name)
    .run();
  return json({ version: { id, iconPackId, name } });
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

async function exportAppfilter(env, userId, versionId) {
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
        request_count = request_count + 1,
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
  await requireAppToken(request, env);
  const packageName = url.searchParams.get("packageName") || "icon";
  return json({ uploadURL: `${url.origin}/upload/${encodeURIComponent(packageName)}.png` });
}

async function handleIconUpload(request, env, url) {
  const packageName = decodeURIComponent(url.pathname.split("/").pop() || "").replace(/\.png$/, "");
  await request.arrayBuffer();
  await env.DB.prepare("UPDATE app_requests SET icon_uploaded = 1 WHERE package_name = ?").bind(packageName).run();
  return new Response("", { status: 200 });
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
  return { id: user.id, email: user.email, name: user.name };
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

function sessionCookie(token, expires) {
  const maxAge = expires ? Math.max(0, expires - Math.floor(Date.now() / 1000)) : 0;
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,PATCH,PUT,OPTIONS");
  headers.set("access-control-allow-headers", "authorization,content-type");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
