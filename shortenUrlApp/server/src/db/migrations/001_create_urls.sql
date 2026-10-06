-- One row per short link.
CREATE TABLE urls (
  id           BIGSERIAL    PRIMARY KEY,               -- also the source for Base62 codes (stage 2)
  short_code   VARCHAR(32)  NOT NULL UNIQUE,           -- UNIQUE creates the index used by redirects
  long_url     TEXT         NOT NULL,
  is_custom    BOOLEAN      NOT NULL DEFAULT FALSE,    -- true when the user chose the alias (stage 4)
  expires_at   TIMESTAMPTZ  NULL,                      -- NULL = never expires (stage 4)
  click_count  BIGINT       NOT NULL DEFAULT 0,        -- denormalised counter for fast reads (stage 5)
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
