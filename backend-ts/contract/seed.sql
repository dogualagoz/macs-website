-- Synthetic contract data only. Password hash: Task 2 passlib fixture, parola123.
TRUNCATE public.assets, public.event_categories, public.events, public.members, public.project_categories, public.project_members, public.projects, public.sponsors, public.users RESTART IDENTITY CASCADE;
DELETE FROM public.alembic_version;
INSERT INTO public.alembic_version VALUES ('e2b8c1f7a934');

INSERT INTO public.users (id, email, full_name, hashed_password, role, status, is_active, failed_login_attempts, last_login, last_failed_login, password_changed_at, created_at, updated_at) VALUES
(1, 'admin@example.com', 'Test Kullanıcı 1', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'admin', 'approved', true, 0, NULL, NULL, NULL, '2026-01-01 10:00:00.123456+00', NULL),
(2, 'mod@example.com', 'Test Kullanıcı 2', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'moderator', 'approved', true, 0, NULL, NULL, NULL, '2026-01-02 10:00:00.123456+00', NULL),
(3, 'pending@example.com', 'Test Kullanıcı 3', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'moderator', 'pending', true, 0, NULL, NULL, NULL, '2026-01-03 10:00:00.123456+00', NULL),
(4, 'rejected@example.com', 'Test Kullanıcı 4', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'moderator', 'rejected', true, 0, NULL, NULL, NULL, '2026-01-04 10:00:00.123456+00', NULL),
(5, 'inactive@example.com', 'Test Kullanıcı 5', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'moderator', 'approved', false, 0, NULL, NULL, NULL, '2026-01-05 10:00:00.123456+00', NULL),
(6, 'locked@example.com', 'Test Kullanıcı 6', '$2b$12$WOrvQjjBSKN/5GetGvBrJ.vszjbLrmgtaJxO8MAL3SBttPoDXiWqy', 'moderator', 'approved', true, 5, NULL, NULL, NULL, '2026-01-06 10:00:00.123456+00', NULL),
(7, 'broken@example.com', 'Test Kullanıcı 7', 'not-a-hash', 'moderator', 'approved', true, 0, NULL, NULL, NULL, '2026-01-07 10:00:00.123456+00', NULL);

UPDATE public.users SET last_failed_login = CURRENT_TIMESTAMP WHERE id = 6;

INSERT INTO public.event_categories (id, name, description, created_at, updated_at) VALUES
(1, 'Workshop', NULL, '2026-01-01 12:00:00.123456+00', NULL),
(2, 'Sosyal', NULL, '2026-01-02 12:00:00.123456+00', NULL);

INSERT INTO public.events (id, title, slug, description, content, image_url, location, start_time, end_time, category_id, created_by, is_active, is_deleted, is_featured, created_at, updated_at, registration_link, directions_link) VALUES
(1, 'Bahar Şenliği', 'bahar-senligi', NULL, NULL, NULL, NULL, '2099-05-01 11:00:00', NULL, 1, 2, true, false, true, '2026-01-01 12:00:00.123456+00', NULL, NULL, NULL),
(2, 'Geçmiş Atölye', 'gecmis-atolye', NULL, NULL, NULL, NULL, '2020-03-10 18:30:00', NULL, 1, 2, true, false, false, '2026-01-02 12:00:00.123456+00', NULL, NULL, NULL),
(3, 'Pasif Etkinlik', 'pasif-etkinlik', NULL, NULL, NULL, NULL, '2099-06-01 10:00:00', NULL, 1, 2, false, false, false, '2026-01-03 12:00:00.123456+00', NULL, NULL, NULL),
(4, 'Silinmiş Etkinlik', 'silinmis-etkinlik', NULL, NULL, NULL, NULL, '2099-07-01 10:00:00', NULL, 1, 2, true, true, false, '2026-01-04 12:00:00.123456+00', NULL, NULL, NULL),
(5, 'Çağrı: Ödüllü Yarışma', 'cagri-odullu-yarisma', NULL, NULL, NULL, NULL, '2099-04-01 09:00:00', '2099-04-01 17:00:00', NULL, 2, true, false, false, '2026-01-05 12:00:00.123456+00', NULL, NULL, NULL),
(6, 'Yakın Etkinlik', 'yakin-etkinlik', NULL, NULL, NULL, NULL, '2099-01-15 19:00:00', NULL, 2, 1, true, false, false, '2026-01-06 12:00:00.123456+00', NULL, NULL, NULL);

INSERT INTO public.project_categories (id, name, description, icon, created_at, updated_at) VALUES
(1, 'Web', NULL, 'globe', '2026-01-01 12:00:00.123456+00', NULL),
(2, 'Mobil', NULL, NULL, '2026-01-02 12:00:00.123456+00', NULL);

INSERT INTO public.members (id, full_name, profile_image, is_active, user_id, created_at, updated_at) VALUES
(1, 'Ayşe Yılmaz', NULL, true, NULL, '2026-01-01 12:00:00.123456+00', NULL),
(2, 'Mehmet Öz', NULL, true, NULL, '2026-01-02 12:00:00.123456+00', NULL),
(3, 'Pasif Üye', NULL, false, NULL, '2026-01-03 12:00:00.123456+00', NULL),
(4, 'Projesiz Üye', NULL, true, NULL, '2026-01-04 12:00:00.123456+00', NULL);

INSERT INTO public.projects (id, title, slug, description, content, image_url, technologies, github_url, live_url, status, category_id, created_by, team_members, is_active, is_deleted, is_featured, created_at, updated_at, started_at, completed_at, project_type) VALUES
(1, 'MACS Web Sitesi', 'macs-web-sitesi', NULL, NULL, NULL, NULL, NULL, NULL, 'COMPLETED', 1, 1, NULL, true, false, true, '2026-01-01 12:00:00.123456+00', NULL, NULL, NULL, 'DEVELOPED_BY_MACS'),
(2, 'Mobil Uygulama', 'mobil-uygulama', NULL, NULL, NULL, NULL, NULL, NULL, 'IN_PROGRESS', 2, 1, NULL, true, false, false, '2026-01-02 12:00:00.123456+00', NULL, NULL, NULL, 'SUPPORTED_BY_MACS'),
(3, 'Pasif Proje', 'pasif-proje', NULL, NULL, NULL, NULL, NULL, NULL, 'PLANNING', 1, 1, NULL, false, false, false, '2026-01-03 12:00:00.123456+00', NULL, NULL, NULL, 'DEVELOPED_BY_MACS'),
(4, 'Silinmiş Proje', 'silinmis-proje', NULL, NULL, NULL, NULL, NULL, NULL, 'PLANNING', 1, 1, NULL, true, true, false, '2026-01-04 12:00:00.123456+00', NULL, NULL, NULL, 'DEVELOPED_BY_MACS'),
(5, 'Üye Vitrini', 'uye-vitrini', NULL, NULL, NULL, NULL, NULL, NULL, 'PLANNING', NULL, 1, NULL, true, false, false, '2026-01-05 12:00:00.123456+00', NULL, NULL, NULL, 'MEMBER_SHOWCASE');

INSERT INTO public.project_members (id, project_id, member_id, role, contribution_count, created_at) VALUES
(1, 1, 1, 'Lead', 5, '2026-01-01 12:00:00.123456+00'),
(2, 1, 2, 'Designer', 2, '2026-01-02 12:00:00.123456+00'),
(3, 2, 1, NULL, 1, '2026-01-03 12:00:00.123456+00'),
(4, 3, 2, 'Dev', 7, '2026-01-04 12:00:00.123456+00'),
(5, 4, 1, 'Dev', 9, '2026-01-05 12:00:00.123456+00'),
(6, 5, 3, 'Dev', 1, '2026-01-06 12:00:00.123456+00');

INSERT INTO public.sponsors (id, name, description, image_url, category, discount_info, latitude, longitude, address, is_active, created_at, is_featured) VALUES
(1, 'Kahve Durağı', NULL, NULL, 'Kafe', NULL, 41.0, 29.0, NULL, true, '2026-01-01 12:00:00.123456+00', true),
(2, 'Kitap Evi', NULL, NULL, 'Kitap', NULL, NULL, NULL, NULL, true, '2026-01-02 12:00:00.123456+00', false),
(3, 'Burger Köşesi', NULL, NULL, 'Restoran', NULL, NULL, NULL, NULL, true, '2026-01-03 12:00:00.123456+00', false),
(4, 'Eski Sponsor', NULL, NULL, 'Kafe', NULL, NULL, NULL, NULL, false, '2026-01-04 12:00:00.123456+00', false),
(5, 'Tekno Market', NULL, NULL, 'Teknoloji', NULL, NULL, NULL, NULL, true, '2026-01-05 12:00:00.123456+00', false);

SELECT setval('public.assets_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.assets;

SELECT setval('public.event_categories_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.event_categories;

SELECT setval('public.events_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.events;

SELECT setval('public.members_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.members;

SELECT setval('public.project_categories_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.project_categories;

SELECT setval('public.project_members_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.project_members;

SELECT setval('public.projects_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.projects;

SELECT setval('public.sponsors_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.sponsors;

SELECT setval('public.users_id_seq', COALESCE(MAX(id), 1), COUNT(*) > 0) FROM public.users;
