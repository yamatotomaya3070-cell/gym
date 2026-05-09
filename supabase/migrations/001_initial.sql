-- ============================================================
-- GymNote – Initial Schema Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- exercises (共通種目 + カスタム種目)
CREATE TABLE exercises (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('machine','free','cable','dumbbell','barbell','bodyweight')),
  description      TEXT,
  form_points      TEXT[],
  primary_muscles  TEXT[],
  secondary_muscles TEXT[],
  is_custom        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- routines
CREATE TABLE routines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- routine_exercises
CREATE TABLE routine_exercises (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id          UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index         INT NOT NULL DEFAULT 0,
  default_sets        INT NOT NULL DEFAULT 3,
  default_rest_seconds INT NOT NULL DEFAULT 60
);

-- sessions
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  note       TEXT
);

-- session_sets
CREATE TABLE session_sets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number   INT NOT NULL,
  weight_kg    NUMERIC(5,2),
  reps         INT,
  rpe          NUMERIC(3,1),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- goals
CREATE TABLE goals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_days_per_week INT NOT NULL DEFAULT 3,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- exercise_goals
CREATE TABLE exercise_goals (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id                 UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weekly_weight_increase_kg   NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  UNIQUE (user_id, exercise_id)
);

-- body_measurements
CREATE TABLE body_measurements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg     NUMERIC(5,2),
  body_fat_pct  NUMERIC(4,1),
  chest_cm      NUMERIC(5,1),
  waist_cm      NUMERIC(5,1),
  hip_cm        NUMERIC(5,1),
  thigh_cm      NUMERIC(5,1),
  arm_cm        NUMERIC(5,1),
  measured_at   DATE NOT NULL DEFAULT CURRENT_DATE
);

-- progress_photos
CREATE TABLE progress_photos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url            TEXT NOT NULL,
  angle                TEXT NOT NULL CHECK (angle IN ('front','side','back')),
  body_measurement_id  UUID REFERENCES body_measurements(id) ON DELETE SET NULL,
  note                 TEXT,
  taken_at             DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_goals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos    ENABLE ROW LEVEL SECURITY;

-- exercises: 共通種目(user_id IS NULL)は全員が閲覧可能、カスタム種目は本人のみ
CREATE POLICY "exercises_select" ON exercises
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "exercises_insert" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_custom = true);

CREATE POLICY "exercises_update" ON exercises
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "exercises_delete" ON exercises
  FOR DELETE USING (user_id = auth.uid());

-- routines
CREATE POLICY "routines_select" ON routines FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "routines_insert" ON routines FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "routines_update" ON routines FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "routines_delete" ON routines FOR DELETE USING (user_id = auth.uid());

-- routine_exercises (ルーティン経由で所有者確認)
CREATE POLICY "re_select" ON routine_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "re_insert" ON routine_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "re_update" ON routine_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid()));
CREATE POLICY "re_delete" ON routine_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM routines WHERE routines.id = routine_id AND routines.user_id = auth.uid()));

-- sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (user_id = auth.uid());

-- session_sets
CREATE POLICY "ss_select" ON session_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "ss_insert" ON session_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "ss_update" ON session_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "ss_delete" ON session_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid()));

-- goals
CREATE POLICY "goals_select" ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (user_id = auth.uid());

-- exercise_goals
CREATE POLICY "eg_select" ON exercise_goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "eg_insert" ON exercise_goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "eg_update" ON exercise_goals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "eg_delete" ON exercise_goals FOR DELETE USING (user_id = auth.uid());

-- body_measurements
CREATE POLICY "bm_select" ON body_measurements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bm_insert" ON body_measurements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bm_update" ON body_measurements FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bm_delete" ON body_measurements FOR DELETE USING (user_id = auth.uid());

-- progress_photos
CREATE POLICY "pp_select" ON progress_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pp_insert" ON progress_photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pp_update" ON progress_photos FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "pp_delete" ON progress_photos FOR DELETE USING (user_id = auth.uid());

-- Storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);

CREATE POLICY "photos_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SEED DATA: 共通種目
-- ============================================================

INSERT INTO exercises (name, category, description, form_points, primary_muscles, secondary_muscles) VALUES
-- バーベル
('バーベルスクワット', 'barbell',
 'バーベルを肩に担ぎ、股関節と膝を同時に曲げてしゃがむ基本コンパウンド種目。下半身全体を鍛える王道エクササイズ。',
 ARRAY['足を肩幅に開き、つま先をやや外側へ向ける','胸を張り、背筋をまっすぐ保つ','膝をつま先と同じ方向へ追い出す','太ももが床と平行になるまで下げる','かかとで床を押すイメージで立ち上がる'],
 ARRAY['大腿四頭筋','臀筋'], ARRAY['ハムストリングス','脊柱起立筋','腹筋']),

('ベンチプレス', 'barbell',
 'ベンチに仰向けになりバーベルを胸まで下ろして押し上げる、上半身最強のコンパウンド種目。大胸筋のメイン種目。',
 ARRAY['肩甲骨を引き寄せてベンチに固定する','バーを乳頭ライン付近に降ろす','肘を45〜75度外側に開く','足をしっかり床につけてブリッジを作る','息を吐きながら力強く押し上げる'],
 ARRAY['大胸筋'], ARRAY['三角筋前部','上腕三頭筋']),

('デッドリフト', 'barbell',
 '床に置いたバーベルを膝・股関節を使って引き上げる全身種目。背面チェーン全体に刺激が入る最強の複合種目。',
 ARRAY['バーを足の中央真上に置き足は腰幅に開く','股関節から折り曲げてバーを握る','背中をフラットに保ちバーを脛に近づけたまま引く','膝と股関節を同時に伸ばす','トップで臀筋を締める'],
 ARRAY['ハムストリングス','臀筋','脊柱起立筋'], ARRAY['大腿四頭筋','僧帽筋','広背筋']),

('バーベルロウ', 'barbell',
 '上体を前傾させてバーベルを腹部に向けて引く。広背筋・僧帽筋を中心に背中全体を鍛えるコンパウンド種目。',
 ARRAY['上体を45〜60度前傾させる','バーを臍〜下腹部に向けて引く','肘を体に沿って後方へ引く','肩甲骨を寄せてピークコントラクションを意識','ゆっくりとバーを下ろす'],
 ARRAY['広背筋','僧帽筋'], ARRAY['菱形筋','後部三角筋','上腕二頭筋']),

('オーバーヘッドプレス', 'barbell',
 'バーベルを頭上に押し上げる肩の基本コンパウンド種目。三角筋全体と体幹を同時に鍛えられる。',
 ARRAY['バーを鎖骨の前で持つ','脚は肩幅、体幹を締める','頭を後ろに引きながらバーを顔の前を通して上げる','トップで肘を完全に伸ばす','ゆっくりと鎖骨前まで戻す'],
 ARRAY['三角筋'], ARRAY['上腕三頭筋','僧帽筋','体幹']),

('インクラインベンチプレス', 'barbell',
 '30〜45度のインクラインベンチでのベンチプレス。大胸筋上部を重点的に鍛える。',
 ARRAY['ベンチを30〜45度に設定する','鎖骨の下あたりにバーを降ろす','肩甲骨を寄せて固定する','自然なアーチを保つ','大胸筋の上部を意識して押す'],
 ARRAY['大胸筋上部'], ARRAY['三角筋前部','上腕三頭筋']),

-- ダンベル
('ダンベルベンチプレス', 'dumbbell',
 '両手にダンベルを持ってベンチでプレスする。可動域が広くバランス力も鍛えられる。',
 ARRAY['肩甲骨を寄せてベンチに固定','ダンベルを胸の横まで下ろす','大胸筋をストレッチしてから押し上げる','トップで軽く絞るイメージ','左右対称に動かす'],
 ARRAY['大胸筋'], ARRAY['三角筋前部','上腕三頭筋']),

('ダンベルフライ', 'dumbbell',
 '両腕を横に広げてダンベルを弧を描くように動かし大胸筋をストレッチする単関節種目。',
 ARRAY['肘をやや曲げた状態を維持する','弧を描くように下ろす','大胸筋のストレッチを感じる','胸の上で弧を描いて閉じる','重量よりもフォーム優先'],
 ARRAY['大胸筋'], ARRAY['三角筋前部']),

('ワンハンドダンベルロウ', 'dumbbell',
 'ベンチに片手・片膝をついてダンベルを引く。広背筋を集中的に鍛えられる。',
 ARRAY['体幹を水平に保つ','肘を体に沿って後方へ引く','肩甲骨を寄せてピークコントラクション','ゆっくりと腕を伸ばして下ろす','腰をひねらない'],
 ARRAY['広背筋'], ARRAY['僧帽筋','菱形筋','上腕二頭筋']),

('ダンベルカール', 'dumbbell',
 '両手にダンベルを持って肘を曲げて上腕二頭筋を収縮させる基本アームカール。',
 ARRAY['肘を体側に固定する','手首を回外させながら上げる','トップで上腕二頭筋を絞る','ゆっくり下ろす','反動を使わない'],
 ARRAY['上腕二頭筋'], ARRAY['腕橈骨筋','前腕']),

('サイドレイズ', 'dumbbell',
 '両腕を横に上げて三角筋中部を鍛える。肩の幅を作る重要な単関節種目。',
 ARRAY['肘をやや曲げた状態を維持','真横に腕を上げる','肩の高さまで上げる','ゆっくりと下ろす','重量は軽めでフォーム重視'],
 ARRAY['三角筋中部'], ARRAY['僧帽筋']),

('フレンチプレス', 'dumbbell',
 '頭の後ろにダンベルを下ろして上腕三頭筋を鍛えるアイソレーション種目。',
 ARRAY['肘を耳の横に固定する','上腕三頭筋を意識して伸ばす','コントロールして上げる','肘が外側に開かないようにする'],
 ARRAY['上腕三頭筋'], ARRAY[]::text[]),

-- ケーブル
('ケーブルクロスオーバー', 'cable',
 '高い位置からケーブルを交差させて大胸筋を鍛えるアイソレーション種目。',
 ARRAY['両腕を斜め上から前に引く','大胸筋を絞るイメージ','肘を軽く曲げたまま維持','体幹を安定させる'],
 ARRAY['大胸筋'], ARRAY['三角筋前部']),

('ラットプルダウン', 'cable',
 'バーを顎の下まで引き下げて広背筋を鍛える。懸垂の補助的な役割も果たす。',
 ARRAY['肩幅より少し広めにバーを握る','胸を張り少し後傾する','バーを胸の上部に引き下げる','広背筋を絞るイメージ','ゆっくりと腕を伸ばして戻す'],
 ARRAY['広背筋'], ARRAY['上腕二頭筋','菱形筋']),

('シーテッドケーブルロウ', 'cable',
 'ケーブルマシンで座った状態でロウイングを行う。背中全体を均等に鍛えられる。',
 ARRAY['背筋をまっすぐ保つ','肘を体に沿って後ろへ引く','肩甲骨を寄せる','ゆっくりと戻す','体を前後に揺らさない'],
 ARRAY['広背筋','僧帽筋'], ARRAY['菱形筋','後部三角筋']),

('トライセプスプッシュダウン', 'cable',
 'ケーブルのロープやバーを押し下げる上腕三頭筋のアイソレーション種目。',
 ARRAY['肘を体側に固定する','手首を固定したまま押し下げる','トップで上腕三頭筋を絞る','ゆっくりと上げる','肩を落として行う'],
 ARRAY['上腕三頭筋'], ARRAY[]::text[]),

('ケーブルバイセプスカール', 'cable',
 'ケーブルで上腕二頭筋を鍛える。一定のテンションが維持できるため効果的。',
 ARRAY['肘を体側に固定','手首を回外させながら引く','トップで絞る','ゆっくりと下ろす'],
 ARRAY['上腕二頭筋'], ARRAY['前腕']),

('フェイスプル', 'cable',
 'ケーブルを顔に向けて引く後部三角筋と僧帽筋のエクササイズ。肩の健康維持にも重要。',
 ARRAY['ケーブルを目の高さに設定','ロープを両手で握る','外旋させながら顔に向けて引く','後部三角筋を意識','肩甲骨を寄せる'],
 ARRAY['後部三角筋','僧帽筋'], ARRAY['菱形筋','回旋筋腱板']),

-- マシン
('レッグプレス', 'machine',
 'マシンのプレートを足で押し上げる安全な下半身コンパウンド種目。重量を扱いやすい。',
 ARRAY['足を肩幅に置く','膝をつま先方向へ追い出す','膝が90度になるまで下げる','かかとで押すイメージ','膝をロックしない'],
 ARRAY['大腿四頭筋'], ARRAY['ハムストリングス','臀筋']),

('チェストプレスマシン', 'machine',
 'マシンを使って胸を鍛えるプレス種目。フォームが安定しやすく初心者にも扱いやすい。',
 ARRAY['背もたれにしっかりつける','グリップを胸の高さに設定','大胸筋を意識して押す','ゆっくりと戻す'],
 ARRAY['大胸筋'], ARRAY['三角筋前部','上腕三頭筋']),

('レッグカール', 'machine',
 'マシンで膝を曲げてハムストリングスを鍛えるアイソレーション種目。',
 ARRAY['大腿の裏をパッドに当てる','足首を曲げた状態で行う','完全にかかとをお尻に近づける','ゆっくりと戻す'],
 ARRAY['ハムストリングス'], ARRAY['腓腹筋']),

('レッグエクステンション', 'machine',
 'マシンで膝を伸ばして大腿四頭筋を鍛えるアイソレーション種目。',
 ARRAY['背もたれに深く座る','つま先を上に向ける','完全に膝を伸ばす','ゆっくりと下ろす','反動を使わない'],
 ARRAY['大腿四頭筋'], ARRAY[]::text[]),

('ショルダープレスマシン', 'machine',
 'マシンで行う肩のプレス種目。体幹が安定した状態で三角筋に集中できる。',
 ARRAY['グリップを肩の高さに設定','真上に押し上げる','肘を完全に伸ばし切らない','ゆっくりと戻す'],
 ARRAY['三角筋'], ARRAY['上腕三頭筋']),

('チェストフライマシン', 'machine',
 'マシンで行う大胸筋のアイソレーション種目。ストレッチポジションを感じやすい。',
 ARRAY['背もたれにつけてシートを調整','肘をパッドに当てて弧を描く','胸を張ってストレッチを感じる','前で絞るイメージ'],
 ARRAY['大胸筋'], ARRAY['三角筋前部']),

-- 自重
('プルアップ', 'bodyweight',
 '懸垂。バーにぶら下がって顎をバーの上まで引き上げる最強の上半身引く種目。',
 ARRAY['肩幅より少し広めに握る','肩甲骨を下げてから引き始める','胸をバーに向けるイメージ','ゆっくりと降りる','体を揺らさない'],
 ARRAY['広背筋'], ARRAY['上腕二頭筋','菱形筋']),

('プッシュアップ', 'bodyweight',
 '腕立て伏せ。自重で大胸筋・三角筋・上腕三頭筋を鍛える基本エクササイズ。',
 ARRAY['手を肩幅より少し広めに置く','体を板のように保つ','胸が床に触れるまで下げる','肘を45〜60度外側に開く','力強く押し上げる'],
 ARRAY['大胸筋'], ARRAY['三角筋前部','上腕三頭筋']),

('ディップス', 'bodyweight',
 '平行棒で体を上下させる。上腕三頭筋と大胸筋下部を鍛える複合種目。',
 ARRAY['体を前に傾けると大胸筋に効く','真っ直ぐだと上腕三頭筋に効く','肘が直角になるまで下げる','肩をすくめない','コントロールして行う'],
 ARRAY['上腕三頭筋','大胸筋下部'], ARRAY['三角筋前部']),

('プランク', 'bodyweight',
 '前腕で体を支えて一直線を保つアイソメトリックコア種目。体幹安定性の基礎。',
 ARRAY['前腕と爪先で体を支える','体を一直線に保つ','腰が沈まないようにする','臀筋と腹筋を締める','自然な呼吸を維持'],
 ARRAY['腹横筋','腹直筋'], ARRAY['脊柱起立筋','臀筋']),

('チンアップ', 'bodyweight',
 '逆手（アンダーグリップ）での懸垂。上腕二頭筋に強く効くバリエーション。',
 ARRAY['肩幅程度のアンダーグリップ','肘を絞るイメージで引く','上腕二頭筋を意識する','顎がバーの上まで引く','ゆっくりと降りる'],
 ARRAY['上腕二頭筋','広背筋'], ARRAY['菱形筋']),

('ランジ', 'bodyweight',
 '足を前に踏み出して膝を曲げる下半身の基本種目。片足ずつ鍛えられバランスにも効く。',
 ARRAY['歩幅を大きくとる','前膝がつま先を超えないようにする','後ろ膝を床に近づける','上体を真っ直ぐ保つ','踏み出した足で立ち上がる'],
 ARRAY['大腿四頭筋','臀筋'], ARRAY['ハムストリングス','体幹']);
