-- Idempotent baseline of contract/schema.sql. Never writes Alembic version data.
DO $$ BEGIN
CREATE TYPE public.projectstatus AS ENUM (
    'PLANNING',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE TYPE public.projecttype AS ENUM (
    'DEVELOPED_BY_MACS',
    'SUPPORTED_BY_MACS',
    'MEMBER_SHOWCASE'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.alembic_version (
    version_num character varying(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assets (
    id integer NOT NULL,
    filename character varying NOT NULL,
    content_type character varying NOT NULL,
    data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.assets_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.event_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE SEQUENCE IF NOT EXISTS public.event_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.event_categories_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.event_categories_id_seq OWNED BY public.event_categories.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.events (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    content text,
    image_url character varying,
    location character varying,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    category_id integer,
    created_by integer NOT NULL,
    is_active boolean,
    is_deleted boolean,
    is_featured boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    registration_link character varying,
    directions_link character varying
);

CREATE SEQUENCE IF NOT EXISTS public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.events_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.members (
    id integer NOT NULL,
    full_name character varying NOT NULL,
    profile_image character varying,
    is_active boolean,
    user_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE SEQUENCE IF NOT EXISTS public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.members_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    icon character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE SEQUENCE IF NOT EXISTS public.project_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.project_categories_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.project_categories_id_seq OWNED BY public.project_categories.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_members (
    id integer NOT NULL,
    project_id integer NOT NULL,
    member_id integer NOT NULL,
    role character varying,
    contribution_count integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.project_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.project_members_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.project_members_id_seq OWNED BY public.project_members.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.projects (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    description character varying,
    content text,
    image_url character varying,
    technologies character varying,
    github_url character varying,
    live_url character varying,
    status public.projectstatus,
    category_id integer,
    created_by integer NOT NULL,
    team_members character varying,
    is_active boolean,
    is_deleted boolean,
    is_featured boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    project_type public.projecttype NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.projects_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sponsors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    image_url character varying(500),
    category character varying(100) NOT NULL,
    discount_info text,
    latitude double precision,
    longitude double precision,
    address text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    is_featured boolean DEFAULT false
);

CREATE SEQUENCE IF NOT EXISTS public.sponsors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.sponsors_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.sponsors_id_seq OWNED BY public.sponsors.id;
END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    full_name character varying NOT NULL,
    hashed_password character varying NOT NULL,
    role character varying DEFAULT 'moderator'::character varying NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    is_active boolean,
    failed_login_attempts integer,
    last_login timestamp with time zone,
    last_failed_login timestamp with time zone,
    password_changed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_depend WHERE objid = 'public.users_id_seq'::regclass AND deptype = 'a') THEN
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.assets'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.event_categories'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.event_categories ALTER COLUMN id SET DEFAULT nextval('public.event_categories_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.events'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.members'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.project_categories'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.project_categories ALTER COLUMN id SET DEFAULT nextval('public.project_categories_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.project_members'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.project_members ALTER COLUMN id SET DEFAULT nextval('public.project_members_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.projects'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.sponsors'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.sponsors ALTER COLUMN id SET DEFAULT nextval('public.sponsors_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = 'public.users'::regclass AND a.attname = 'id') THEN
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alembic_version_pkc' AND conrelid = 'public.alembic_version'::regclass) THEN
ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assets_pkey' AND conrelid = 'public.assets'::regclass) THEN
ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_categories_pkey' AND conrelid = 'public.event_categories'::regclass) THEN
ALTER TABLE ONLY public.event_categories
    ADD CONSTRAINT event_categories_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_pkey' AND conrelid = 'public.events'::regclass) THEN
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_slug_key' AND conrelid = 'public.events'::regclass) THEN
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_slug_key UNIQUE (slug);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_pkey' AND conrelid = 'public.members'::regclass) THEN
ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_categories_pkey' AND conrelid = 'public.project_categories'::regclass) THEN
ALTER TABLE ONLY public.project_categories
    ADD CONSTRAINT project_categories_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_pkey' AND conrelid = 'public.project_members'::regclass) THEN
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_pkey' AND conrelid = 'public.projects'::regclass) THEN
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_slug_key' AND conrelid = 'public.projects'::regclass) THEN
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsors_pkey' AND conrelid = 'public.sponsors'::regclass) THEN
ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_assets_id ON public.assets USING btree (id);

CREATE INDEX IF NOT EXISTS ix_event_categories_id ON public.event_categories USING btree (id);

CREATE INDEX IF NOT EXISTS ix_events_id ON public.events USING btree (id);

CREATE INDEX IF NOT EXISTS ix_members_full_name ON public.members USING btree (full_name);

CREATE INDEX IF NOT EXISTS ix_members_id ON public.members USING btree (id);

CREATE INDEX IF NOT EXISTS ix_project_categories_id ON public.project_categories USING btree (id);

CREATE INDEX IF NOT EXISTS ix_project_members_id ON public.project_members USING btree (id);

CREATE INDEX IF NOT EXISTS ix_project_members_member_id ON public.project_members USING btree (member_id);

CREATE INDEX IF NOT EXISTS ix_project_members_project_id ON public.project_members USING btree (project_id);

CREATE INDEX IF NOT EXISTS ix_projects_id ON public.projects USING btree (id);

CREATE INDEX IF NOT EXISTS ix_sponsors_category ON public.sponsors USING btree (category);

CREATE INDEX IF NOT EXISTS ix_sponsors_id ON public.sponsors USING btree (id);

CREATE INDEX IF NOT EXISTS ix_sponsors_name ON public.sponsors USING btree (name);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON public.users USING btree (email);

CREATE INDEX IF NOT EXISTS ix_users_id ON public.users USING btree (id);

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_category_id_fkey' AND conrelid = 'public.events'::regclass) THEN
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.event_categories(id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_fkey' AND conrelid = 'public.events'::regclass) THEN
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_user_id_fkey' AND conrelid = 'public.members'::regclass) THEN
ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_member_id_fkey' AND conrelid = 'public.project_members'::regclass) THEN
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_project_id_fkey' AND conrelid = 'public.project_members'::regclass) THEN
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_category_id_fkey' AND conrelid = 'public.projects'::regclass) THEN
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.project_categories(id);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_created_by_fkey' AND conrelid = 'public.projects'::regclass) THEN
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
END IF;
END $$;
