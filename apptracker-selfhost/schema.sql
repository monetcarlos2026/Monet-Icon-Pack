CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  permission_level TEXT NOT NULL DEFAULT '普通会员',
  banned_at TEXT,
  banned_reason TEXT,
  banned_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_access (
  user_id TEXT PRIMARY KEY,
  last_ip TEXT,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS icon_packs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  icon_pack_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (icon_pack_id) REFERENCES icon_packs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_tokens (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_requests (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  localized_name TEXT NOT NULL,
  default_name TEXT NOT NULL,
  package_name TEXT NOT NULL,
  main_activity TEXT NOT NULL,
  system_app INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 1,
  adapted INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT '无分类',
  icon_uploaded INTEGER NOT NULL DEFAULT 0,
  icon_data_url TEXT,
  icon_updated_at TEXT,
  first_requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version_id, package_name, main_activity),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_recovery_requests (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  matched_user_id TEXT,
  requester_ip TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matched_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id TEXT,
  actor_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_versions_icon_pack ON versions(icon_pack_id);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_requests_version ON app_requests(version_id, adapted, request_count DESC);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_kind_subject ON auth_rate_limits(kind, subject, day);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_recovery_matched_user ON password_recovery_requests(matched_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status, created_at DESC);
