-- Insert master tags data with translations support
-- This migration inserts the predefined tags and sets up translation tables

-- First, let's create a translation table for tags
CREATE TABLE IF NOT EXISTS tag_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  translated_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tag_id, language_code)
);

-- Enable RLS for tag_translations
ALTER TABLE tag_translations ENABLE ROW LEVEL SECURITY;

-- Policy for tag_translations table
CREATE POLICY "Allow read access to tag_translations for all users"
  ON tag_translations
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert the master tags (English names)
INSERT INTO tags (id, name, created_at) VALUES
  ('05c80720-c736-443d-8951-5c1812ea5736', 'Science', '2025-06-13 03:05:19.713377+00'),
  ('09ba299a-631b-41e6-a3d3-764342ccb37d', 'Travel', '2025-06-13 03:05:19.713377+00'),
  ('2616b17d-1beb-40a9-83dd-f9a3497dfde9', 'Health', '2025-06-13 03:05:19.713377+00'),
  ('435c9065-52f1-4e60-87c6-754133a29683', 'Art', '2025-06-13 03:05:19.713377+00'),
  ('44f4c775-1ddf-4128-a2d5-013f25135fa4', 'Beauty', '2025-06-13 03:05:19.713377+00'),
  ('467875a2-3ac7-407f-aaa1-c2c8445774e5', 'Parenting', '2025-06-13 03:05:19.713377+00'),
  ('5d8aea77-f946-41ba-9bd2-cff778bf920f', 'Technology', '2025-06-13 03:05:19.713377+00'),
  ('5f6422a2-3c79-4fdf-9823-e066b64f8bc3', 'Movies', '2025-06-13 03:05:19.713377+00'),
  ('61c3f167-bcf2-4c45-aba3-17f8743531be', 'History', '2025-06-13 03:05:19.713377+00'),
  ('6cd69716-ee6a-4bc8-a081-499cac8cd802', 'Fashion', '2025-06-13 03:05:19.713377+00'),
  ('7580e0da-1a65-4880-a4c5-d9615c8a367f', 'Entertainment', '2025-06-13 03:05:19.713377+00'),
  ('7c98d5e4-d3b9-49a1-a0b4-df4a33300930', 'Environment', '2025-06-13 03:05:19.713377+00'),
  ('7cea2fdc-1664-4954-95fe-8a0113304e36', 'Music', '2025-06-13 03:05:19.713377+00'),
  ('7ecb77e2-0270-4612-a4a0-2e7991f4e3d0', 'Politics', '2025-06-13 03:05:19.713377+00'),
  ('83e4077d-b8cd-4ba3-b0b1-a84ee8d03291', 'Food', '2025-06-13 03:05:19.713377+00'),
  ('86930fbb-466e-4ce0-b3e3-d740c7281ed8', 'Fitness', '2025-06-13 03:05:19.713377+00'),
  ('8a036834-0a38-4de4-a510-ea261dd48df4', 'Relationships', '2025-06-13 03:05:19.713377+00'),
  ('8b7cc56a-6624-4347-9a30-277c1bfc9851', 'Real Estate', '2025-06-13 03:05:19.713377+00'),
  ('8bfb26a4-99cc-4f4c-9a6a-889772b9e944', 'Sports', '2025-06-13 03:05:19.713377+00'),
  ('a0c58040-bc69-4ca3-8c49-4fb940ee40e7', 'Books', '2025-06-13 03:05:19.713377+00'),
  ('ae341a05-e361-49a4-bc3e-e452f75ef207', 'Business', '2025-06-13 03:05:19.713377+00'),
  ('aea87a85-1e98-4e4e-b321-241d52b48201', 'Education', '2025-06-13 03:05:19.713377+00'),
  ('b0017936-4bbc-40a2-a8f3-b3e6b98748d5', 'Automotive', '2025-06-13 03:05:19.713377+00'),
  ('b35a9a1f-64d0-4452-be19-e0ac8dae4e97', 'Career', '2025-06-13 03:05:19.713377+00'),
  ('b35bee8d-7f66-411d-90a4-924fc6958845', 'Finance', '2025-06-13 03:05:19.713377+00'),
  ('b8d32663-f170-4bab-9080-2654f572acc7', 'Gaming', '2025-06-13 03:05:19.713377+00'),
  ('cd273c05-790d-471b-9577-b4a7c935e14e', 'Lifestyle', '2025-06-13 03:05:19.713377+00'),
  ('dada3e13-ff61-48e6-9a4b-172a4525f1bc', 'Shopping', '2025-06-13 03:05:19.713377+00'),
  ('dea479ec-1e04-48a2-90b3-6b065d335e67', 'Pets', '2025-06-13 03:05:19.713377+00'),
  ('fd3c395a-4516-43ea-b67d-5cfe77e336da', 'Social Media', '2025-06-13 03:05:19.713377+00')
ON CONFLICT (id) DO NOTHING;

-- Insert English translations (same as original names)
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  ('05c80720-c736-443d-8951-5c1812ea5736', 'en', 'Science'),
  ('09ba299a-631b-41e6-a3d3-764342ccb37d', 'en', 'Travel'),
  ('2616b17d-1beb-40a9-83dd-f9a3497dfde9', 'en', 'Health'),
  ('435c9065-52f1-4e60-87c6-754133a29683', 'en', 'Art'),
  ('44f4c775-1ddf-4128-a2d5-013f25135fa4', 'en', 'Beauty'),
  ('467875a2-3ac7-407f-aaa1-c2c8445774e5', 'en', 'Parenting'),
  ('5d8aea77-f946-41ba-9bd2-cff778bf920f', 'en', 'Technology'),
  ('5f6422a2-3c79-4fdf-9823-e066b64f8bc3', 'en', 'Movies'),
  ('61c3f167-bcf2-4c45-aba3-17f8743531be', 'en', 'History'),
  ('6cd69716-ee6a-4bc8-a081-499cac8cd802', 'en', 'Fashion'),
  ('7580e0da-1a65-4880-a4c5-d9615c8a367f', 'en', 'Entertainment'),
  ('7c98d5e4-d3b9-49a1-a0b4-df4a33300930', 'en', 'Environment'),
  ('7cea2fdc-1664-4954-95fe-8a0113304e36', 'en', 'Music'),
  ('7ecb77e2-0270-4612-a4a0-2e7991f4e3d0', 'en', 'Politics'),
  ('83e4077d-b8cd-4ba3-b0b1-a84ee8d03291', 'en', 'Food'),
  ('86930fbb-466e-4ce0-b3e3-d740c7281ed8', 'en', 'Fitness'),
  ('8a036834-0a38-4de4-a510-ea261dd48df4', 'en', 'Relationships'),
  ('8b7cc56a-6624-4347-9a30-277c1bfc9851', 'en', 'Real Estate'),
  ('8bfb26a4-99cc-4f4c-9a6a-889772b9e944', 'en', 'Sports'),
  ('a0c58040-bc69-4ca3-8c49-4fb940ee40e7', 'en', 'Books'),
  ('ae341a05-e361-49a4-bc3e-e452f75ef207', 'en', 'Business'),
  ('aea87a85-1e98-4e4e-b321-241d52b48201', 'en', 'Education'),
  ('b0017936-4bbc-40a2-a8f3-b3e6b98748d5', 'en', 'Automotive'),
  ('b35a9a1f-64d0-4452-be19-e0ac8dae4e97', 'en', 'Career'),
  ('b35bee8d-7f66-411d-90a4-924fc6958845', 'en', 'Finance'),
  ('b8d32663-f170-4bab-9080-2654f572acc7', 'en', 'Gaming'),
  ('cd273c05-790d-471b-9577-b4a7c935e14e', 'en', 'Lifestyle'),
  ('dada3e13-ff61-48e6-9a4b-172a4525f1bc', 'en', 'Shopping'),
  ('dea479ec-1e04-48a2-90b3-6b065d335e67', 'en', 'Pets'),
  ('fd3c395a-4516-43ea-b67d-5cfe77e336da', 'en', 'Social Media')
ON CONFLICT (tag_id, language_code) DO NOTHING;

-- Insert Chinese translations
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  ('05c80720-c736-443d-8951-5c1812ea5736', 'cn', '科学'),
  ('09ba299a-631b-41e6-a3d3-764342ccb37d', 'cn', '旅行'),
  ('2616b17d-1beb-40a9-83dd-f9a3497dfde9', 'cn', '健康'),
  ('435c9065-52f1-4e60-87c6-754133a29683', 'cn', '艺术'),
  ('44f4c775-1ddf-4128-a2d5-013f25135fa4', 'cn', '美容'),
  ('467875a2-3ac7-407f-aaa1-c2c8445774e5', 'cn', '育儿'),
  ('5d8aea77-f946-41ba-9bd2-cff778bf920f', 'cn', '技术'),
  ('5f6422a2-3c79-4fdf-9823-e066b64f8bc3', 'cn', '电影'),
  ('61c3f167-bcf2-4c45-aba3-17f8743531be', 'cn', '历史'),
  ('6cd69716-ee6a-4bc8-a081-499cac8cd802', 'cn', '时尚'),
  ('7580e0da-1a65-4880-a4c5-d9615c8a367f', 'cn', '娱乐'),
  ('7c98d5e4-d3b9-49a1-a0b4-df4a33300930', 'cn', '环境'),
  ('7cea2fdc-1664-4954-95fe-8a0113304e36', 'cn', '音乐'),
  ('7ecb77e2-0270-4612-a4a0-2e7991f4e3d0', 'cn', '政治'),
  ('83e4077d-b8cd-4ba3-b0b1-a84ee8d03291', 'cn', '食物'),
  ('86930fbb-466e-4ce0-b3e3-d740c7281ed8', 'cn', '健身'),
  ('8a036834-0a38-4de4-a510-ea261dd48df4', 'cn', '关系'),
  ('8b7cc56a-6624-4347-9a30-277c1bfc9851', 'cn', '房地产'),
  ('8bfb26a4-99cc-4f4c-9a6a-889772b9e944', 'cn', '体育'),
  ('a0c58040-bc69-4ca3-8c49-4fb940ee40e7', 'cn', '书籍'),
  ('ae341a05-e361-49a4-bc3e-e452f75ef207', 'cn', '商业'),
  ('aea87a85-1e98-4e4e-b321-241d52b48201', 'cn', '教育'),
  ('b0017936-4bbc-40a2-a8f3-b3e6b98748d5', 'cn', '汽车'),
  ('b35a9a1f-64d0-4452-be19-e0ac8dae4e97', 'cn', '职业'),
  ('b35bee8d-7f66-411d-90a4-924fc6958845', 'cn', '金融'),
  ('b8d32663-f170-4bab-9080-2654f572acc7', 'cn', '游戏'),
  ('cd273c05-790d-471b-9577-b4a7c935e14e', 'cn', '生活方式'),
  ('dada3e13-ff61-48e6-9a4b-172a4525f1bc', 'cn', '购物'),
  ('dea479ec-1e04-48a2-90b3-6b065d335e67', 'cn', '宠物'),
  ('fd3c395a-4516-43ea-b67d-5cfe77e336da', 'cn', '社交媒体')
ON CONFLICT (tag_id, language_code) DO NOTHING;

-- Insert Japanese translations
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  ('05c80720-c736-443d-8951-5c1812ea5736', 'ja', '科学'),
  ('09ba299a-631b-41e6-a3d3-764342ccb37d', 'ja', '旅行'),
  ('2616b17d-1beb-40a9-83dd-f9a3497dfde9', 'ja', '健康'),
  ('435c9065-52f1-4e60-87c6-754133a29683', 'ja', 'アート'),
  ('44f4c775-1ddf-4128-a2d5-013f25135fa4', 'ja', '美容'),
  ('467875a2-3ac7-407f-aaa1-c2c8445774e5', 'ja', '子育て'),
  ('5d8aea77-f946-41ba-9bd2-cff778bf920f', 'ja', 'テクノロジー'),
  ('5f6422a2-3c79-4fdf-9823-e066b64f8bc3', 'ja', '映画'),
  ('61c3f167-bcf2-4c45-aba3-17f8743531be', 'ja', '歴史'),
  ('6cd69716-ee6a-4bc8-a081-499cac8cd802', 'ja', 'ファッション'),
  ('7580e0da-1a65-4880-a4c5-d9615c8a367f', 'ja', 'エンターテインメント'),
  ('7c98d5e4-d3b9-49a1-a0b4-df4a33300930', 'ja', '環境'),
  ('7cea2fdc-1664-4954-95fe-8a0113304e36', 'ja', '音楽'),
  ('7ecb77e2-0270-4612-a4a0-2e7991f4e3d0', 'ja', '政治'),
  ('83e4077d-b8cd-4ba3-b0b1-a84ee8d03291', 'ja', '食べ物'),
  ('86930fbb-466e-4ce0-b3e3-d740c7281ed8', 'ja', 'フィットネス'),
  ('8a036834-0a38-4de4-a510-ea261dd48df4', 'ja', '人間関係'),
  ('8b7cc56a-6624-4347-9a30-277c1bfc9851', 'ja', '不動産'),
  ('8bfb26a4-99cc-4f4c-9a6a-889772b9e944', 'ja', 'スポーツ'),
  ('a0c58040-bc69-4ca3-8c49-4fb940ee40e7', 'ja', '本'),
  ('ae341a05-e361-49a4-bc3e-e452f75ef207', 'ja', 'ビジネス'),
  ('aea87a85-1e98-4e4e-b321-241d52b48201', 'ja', '教育'),
  ('b0017936-4bbc-40a2-a8f3-b3e6b98748d5', 'ja', '自動車'),
  ('b35a9a1f-64d0-4452-be19-e0ac8dae4e97', 'ja', 'キャリア'),
  ('b35bee8d-7f66-411d-90a4-924fc6958845', 'ja', '金融'),
  ('b8d32663-f170-4bab-9080-2654f572acc7', 'ja', 'ゲーム'),
  ('cd273c05-790d-471b-9577-b4a7c935e14e', 'ja', 'ライフスタイル'),
  ('dada3e13-ff61-48e6-9a4b-172a4525f1bc', 'ja', 'ショッピング'),
  ('dea479ec-1e04-48a2-90b3-6b065d335e67', 'ja', 'ペット'),
  ('fd3c395a-4516-43ea-b67d-5cfe77e336da', 'ja', 'ソーシャルメディア')
ON CONFLICT (tag_id, language_code) DO NOTHING;

-- Insert Indonesian translations
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  ('05c80720-c736-443d-8951-5c1812ea5736', 'id', 'Sains'),
  ('09ba299a-631b-41e6-a3d3-764342ccb37d', 'id', 'Perjalanan'),
  ('2616b17d-1beb-40a9-83dd-f9a3497dfde9', 'id', 'Kesehatan'),
  ('435c9065-52f1-4e60-87c6-754133a29683', 'id', 'Seni'),
  ('44f4c775-1ddf-4128-a2d5-013f25135fa4', 'id', 'Kecantikan'),
  ('467875a2-3ac7-407f-aaa1-c2c8445774e5', 'id', 'Parenting'),
  ('5d8aea77-f946-41ba-9bd2-cff778bf920f', 'id', 'Teknologi'),
  ('5f6422a2-3c79-4fdf-9823-e066b64f8bc3', 'id', 'Film'),
  ('61c3f167-bcf2-4c45-aba3-17f8743531be', 'id', 'Sejarah'),
  ('6cd69716-ee6a-4bc8-a081-499cac8cd802', 'id', 'Mode'),
  ('7580e0da-1a65-4880-a4c5-d9615c8a367f', 'id', 'Hiburan'),
  ('7c98d5e4-d3b9-49a1-a0b4-df4a33300930', 'id', 'Lingkungan'),
  ('7cea2fdc-1664-4954-95fe-8a0113304e36', 'id', 'Musik'),
  ('7ecb77e2-0270-4612-a4a0-2e7991f4e3d0', 'id', 'Politik'),
  ('83e4077d-b8cd-4ba3-b0b1-a84ee8d03291', 'id', 'Makanan'),
  ('86930fbb-466e-4ce0-b3e3-d740c7281ed8', 'id', 'Kebugaran'),
  ('8a036834-0a38-4de4-a510-ea261dd48df4', 'id', 'Hubungan'),
  ('8b7cc56a-6624-4347-9a30-277c1bfc9851', 'id', 'Properti'),
  ('8bfb26a4-99cc-4f4c-9a6a-889772b9e944', 'id', 'Olahraga'),
  ('a0c58040-bc69-4ca3-8c49-4fb940ee40e7', 'id', 'Buku'),
  ('ae341a05-e361-49a4-bc3e-e452f75ef207', 'id', 'Bisnis'),
  ('aea87a85-1e98-4e4e-b321-241d52b48201', 'id', 'Pendidikan'),
  ('b0017936-4bbc-40a2-a8f3-b3e6b98748d5', 'id', 'Otomotif'),
  ('b35a9a1f-64d0-4452-be19-e0ac8dae4e97', 'id', 'Karir'),
  ('b35bee8d-7f66-411d-90a4-924fc6958845', 'id', 'Keuangan'),
  ('b8d32663-f170-4bab-9080-2654f572acc7', 'id', 'Gaming'),
  ('cd273c05-790d-471b-9577-b4a7c935e14e', 'id', 'Gaya Hidup'),
  ('dada3e13-ff61-48e6-9a4b-172a4525f1bc', 'id', 'Belanja'),
  ('dea479ec-1e04-48a2-90b3-6b065d335e67', 'id', 'Hewan Peliharaan'),
  ('fd3c395a-4516-43ea-b67d-5cfe77e336da', 'id', 'Media Sosial')
ON CONFLICT (tag_id, language_code) DO NOTHING;

-- Create a helper function to get translated tag names
CREATE OR REPLACE FUNCTION get_translated_tags(p_language_code text DEFAULT 'en')
RETURNS TABLE (
  id uuid,
  name text,
  translated_name text,
  created_at timestamptz
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    t.id,
    t.name,
    COALESCE(tt.translated_name, t.name) as translated_name,
    t.created_at
  FROM tags t
  LEFT JOIN tag_translations tt ON t.id = tt.tag_id AND tt.language_code = p_language_code
  ORDER BY t.name;
$$;
