-- The Torch: one row per monthly issue.
--
-- Events and cards are stored as JSON because an issue is always read and
-- written whole; there is no query that wants them relationally.
--
-- NOTE ON PRIVACY: the printed Torch carries member birthdays and
-- anniversaries. There is deliberately no column for them. The public web
-- edition does not publish personal celebration dates. See README.

CREATE TABLE IF NOT EXISTS torch_issues (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,   -- '2026-08', drives the archive URL
  issue_label   TEXT    NOT NULL,          -- 'August 2026', shown on the masthead
  issue_date    TEXT    NOT NULL,          -- '2026-08-01', sorts the archive

  verse_text    TEXT,
  verse_ref     TEXT,

  feature_kicker TEXT,                     -- 'Missions Conference'
  feature_title  TEXT,                     -- 'Heart For His Harvest'
  feature_when   TEXT,                     -- 'August 2-5, 2026'
  feature_body   TEXT,
  feature_image  TEXT,                     -- R2 key of the event graphic

  events_json   TEXT    NOT NULL DEFAULT '[]',  -- [{date,name,detail}]
  cards_json    TEXT    NOT NULL DEFAULT '[]',  -- [{heading,accent,body,rows:[{date,name,detail}]}]

  pdf_key       TEXT,                      -- R2 key of the uploaded source PDF
  pdf_public    INTEGER NOT NULL DEFAULT 0,-- 0 = archived privately (default)

  status        TEXT    NOT NULL DEFAULT 'draft'  CHECK (status IN ('draft','published')),
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  updated_by    TEXT                       -- Access email of the last editor
);

CREATE INDEX IF NOT EXISTS idx_torch_published
  ON torch_issues (status, issue_date DESC);

-- Small audit trail. A church volunteer publishing to a live website should
-- leave a record of who changed what and when.
CREATE TABLE IF NOT EXISTS torch_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  action     TEXT NOT NULL,   -- 'save' | 'publish' | 'unpublish' | 'upload'
  actor      TEXT,            -- Access email
  detail     TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_torch_audit_time
  ON torch_audit (created_at DESC);
