-- ============================================================
-- GymNote – Migration 004: Yamato専用コンディション管理
-- daily_condition_logs / meal_logs を追加
-- 既存テーブル (sessions, session_sets, body_measurements,
-- progress_photos 等) には一切変更を加えない
-- ============================================================

-- ------------------------------------------------------------
-- updated_at 自動更新用トリガ関数（このマイグレーションで新設）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. daily_condition_logs (1日1行)
-- ============================================================
CREATE TABLE daily_condition_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  sleep_hours       NUMERIC(4,2),
  condition_score   INT CHECK (condition_score BETWEEN 1 AND 5),
  fatigue_score     INT CHECK (fatigue_score   BETWEEN 1 AND 5),
  appetite_score    INT CHECK (appetite_score  BETWEEN 1 AND 5),
  water_l           NUMERIC(4,2),
  creatine_taken    BOOLEAN NOT NULL DEFAULT false,
  creatine_g        NUMERIC(5,2),
  maca_taken        BOOLEAN NOT NULL DEFAULT false,
  maca_count        INT NOT NULL DEFAULT 0,
  protein_count     INT NOT NULL DEFAULT 0,
  caffeine_taken    BOOLEAN NOT NULL DEFAULT false,
  supplement_memo   TEXT,
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_condition_logs_user_date
  ON daily_condition_logs (user_id, date DESC);

CREATE TRIGGER trg_daily_condition_logs_updated_at
  BEFORE UPDATE ON daily_condition_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. meal_logs (1日複数行)
-- ============================================================
CREATE TABLE meal_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  meal_type       TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack','post_workout')),
  meal_name       TEXT,
  calories        INT,
  protein_g       NUMERIC(6,2),
  fat_g           NUMERIC(6,2),
  carbs_g         NUMERIC(6,2),
  image_url       TEXT,
  confidence      INT CHECK (confidence BETWEEN 0 AND 100),
  ai_raw_result   JSONB,
  memo            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_logs_user_date
  ON meal_logs (user_id, date DESC);

CREATE TRIGGER trg_meal_logs_updated_at
  BEFORE UPDATE ON meal_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE daily_condition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs            ENABLE ROW LEVEL SECURITY;

-- daily_condition_logs
CREATE POLICY "dcl_select" ON daily_condition_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dcl_insert" ON daily_condition_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "dcl_update" ON daily_condition_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "dcl_delete" ON daily_condition_logs FOR DELETE USING (user_id = auth.uid());

-- meal_logs
CREATE POLICY "ml_select" ON meal_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ml_insert" ON meal_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ml_update" ON meal_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ml_delete" ON meal_logs FOR DELETE USING (user_id = auth.uid());
