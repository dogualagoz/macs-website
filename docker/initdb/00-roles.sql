-- macs_db.sql dump'i public sema ve tablolar icin macs_admin rolune GRANT veriyor.
-- Rol yoksa dump "role macs_admin does not exist" ile patlar. Once olusturuyoruz.
-- LOGIN yok: uygulama postgres kullanicisi ile baglaniyor, ekstra kimlik bilgisi tutmuyoruz.
-- 'root' rolu de dump'ta GRANT hedefi (Railway'in default superuser adi).
DO $$
DECLARE
    r text;
BEGIN
    FOREACH r IN ARRAY ARRAY['macs_admin', 'root'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END
$$;
