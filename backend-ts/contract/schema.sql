--
-- PostgreSQL database dump
--

\restrict MaYIcVocJo1hNTgY7SCd2BA0za2UPGEakVTWT5h4IVIRLDQI8YRT8InY8DrPbkG

-- Dumped from database version 13.23 (Debian 13.23-1.pgdg13+1)
-- Dumped by pg_dump version 13.23 (Debian 13.23-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: projectstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.projectstatus AS ENUM (
    'PLANNING',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED'
);


--
-- Name: projecttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.projecttype AS ENUM (
    'DEVELOPED_BY_MACS',
    'SUPPORTED_BY_MACS',
    'MEMBER_SHOWCASE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    filename character varying NOT NULL,
    content_type character varying NOT NULL,
    data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: event_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: event_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_categories_id_seq OWNED BY public.event_categories.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
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


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id integer NOT NULL,
    full_name character varying NOT NULL,
    profile_image character varying,
    is_active boolean,
    user_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;


--
-- Name: project_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    icon character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: project_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_categories_id_seq OWNED BY public.project_categories.id;


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    id integer NOT NULL,
    project_id integer NOT NULL,
    member_id integer NOT NULL,
    role character varying,
    contribution_count integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_members_id_seq OWNED BY public.project_members.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
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


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsors (
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


--
-- Name: sponsors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sponsors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sponsors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sponsors_id_seq OWNED BY public.sponsors.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: event_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_categories ALTER COLUMN id SET DEFAULT nextval('public.event_categories_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);


--
-- Name: project_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_categories ALTER COLUMN id SET DEFAULT nextval('public.project_categories_id_seq'::regclass);


--
-- Name: project_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members ALTER COLUMN id SET DEFAULT nextval('public.project_members_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: sponsors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors ALTER COLUMN id SET DEFAULT nextval('public.sponsors_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: event_categories event_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_categories
    ADD CONSTRAINT event_categories_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: events events_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_slug_key UNIQUE (slug);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: project_categories project_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_categories
    ADD CONSTRAINT project_categories_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_assets_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_assets_id ON public.assets USING btree (id);


--
-- Name: ix_event_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_event_categories_id ON public.event_categories USING btree (id);


--
-- Name: ix_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events_id ON public.events USING btree (id);


--
-- Name: ix_members_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_members_full_name ON public.members USING btree (full_name);


--
-- Name: ix_members_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_members_id ON public.members USING btree (id);


--
-- Name: ix_project_categories_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_categories_id ON public.project_categories USING btree (id);


--
-- Name: ix_project_members_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_members_id ON public.project_members USING btree (id);


--
-- Name: ix_project_members_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_members_member_id ON public.project_members USING btree (member_id);


--
-- Name: ix_project_members_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_project_members_project_id ON public.project_members USING btree (project_id);


--
-- Name: ix_projects_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_projects_id ON public.projects USING btree (id);


--
-- Name: ix_sponsors_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sponsors_category ON public.sponsors USING btree (category);


--
-- Name: ix_sponsors_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sponsors_id ON public.sponsors USING btree (id);


--
-- Name: ix_sponsors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sponsors_name ON public.sponsors USING btree (name);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: events events_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.event_categories(id);


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: members members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: project_members project_members_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.project_categories(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict MaYIcVocJo1hNTgY7SCd2BA0za2UPGEakVTWT5h4IVIRLDQI8YRT8InY8DrPbkG
