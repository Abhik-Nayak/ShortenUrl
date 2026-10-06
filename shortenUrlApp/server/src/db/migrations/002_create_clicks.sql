-- One row per redirect, used for analytics (stage 5).
CREATE TABLE clicks (
  id          BIGSERIAL    PRIMARY KEY,
  url_id      BIGINT       NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ip          INET         NULL,
  country     CHAR(2)      NULL,     -- ISO code, e.g. 'IN'
  city        TEXT         NULL,
  user_agent  TEXT         NULL,
  referrer    TEXT         NULL
);

-- Analytics queries always filter by link and time range.
CREATE INDEX idx_clicks_url_id_clicked_at ON clicks (url_id, clicked_at);
