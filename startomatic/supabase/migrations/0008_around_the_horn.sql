-- Around the Horn Feature: Credits, News, Store
-- Migration 0008

-- ============================================
-- MANAGER CREDITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS manager_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  lifetime_credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE manager_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can view own credits"
  ON manager_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own credits (via API)
CREATE POLICY "Users can update own credits"
  ON manager_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert credits for users
CREATE POLICY "System can insert credits"
  ON manager_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NEWS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('news', 'event', 'milestone', 'achievement')),
  category TEXT NOT NULL CHECK (category IN ('game', 'player', 'league', 'achievement', 'system')),
  headline TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  requires_action BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE news_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own news
CREATE POLICY "Users can view own news"
  ON news_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own news (mark as read)
CREATE POLICY "Users can update own news"
  ON news_events FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert news for users
CREATE POLICY "System can insert news"
  ON news_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_news_events_user_unread ON news_events(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_news_events_created ON news_events(user_id, created_at DESC);

-- ============================================
-- STORE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('cosmetic', 'boost', 'pack', 'upgrade')),
  price INTEGER NOT NULL CHECK (price >= 0),
  icon TEXT DEFAULT '🎁',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (public read for store items)
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active store items
CREATE POLICY "Anyone can view active store items"
  ON store_items FOR SELECT
  USING (is_active = TRUE);

-- ============================================
-- USER PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  credits_spent INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON user_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert purchases
CREATE POLICY "System can insert purchases"
  ON user_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED INITIAL STORE ITEMS
-- ============================================
INSERT INTO store_items (name, description, category, price, icon) VALUES
  ('Lucky Dice', 'Slightly better dice rolls for one game', 'boost', 100, '🎲'),
  ('Gold Team Badge', 'A shiny gold badge for your team', 'cosmetic', 250, '🏅'),
  ('Mystery Player Pack', 'Contains a random historic player', 'pack', 500, '📦'),
  ('Home Run Derby', 'Special game mode unlock', 'upgrade', 1000, '⚾'),
  ('Stadium Upgrade', 'Fancy new stadium visuals', 'cosmetic', 750, '🏟️'),
  ('Scout Report', 'See opponent pitcher stats before game', 'boost', 150, '🔍'),
  ('Double XP Game', 'Earn 2x credits for one game', 'boost', 200, '⭐'),
  ('Retro Uniforms Pack', 'Classic throwback uniforms', 'cosmetic', 400, '👕')
ON CONFLICT DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Award Credits
-- ============================================
CREATE OR REPLACE FUNCTION award_credits(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  INSERT INTO manager_credits (user_id, credits, lifetime_credits)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    credits = manager_credits.credits + p_amount,
    lifetime_credits = manager_credits.lifetime_credits + p_amount,
    updated_at = NOW()
  RETURNING credits INTO new_balance;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Create News Event
-- ============================================
CREATE OR REPLACE FUNCTION create_news_event(
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_headline TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO news_events (user_id, type, category, headline, body, metadata)
  VALUES (p_user_id, p_type, p_category, p_headline, p_body, p_metadata)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
