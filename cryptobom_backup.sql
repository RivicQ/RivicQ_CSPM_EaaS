--
-- PostgreSQL database dump
--

\restrict tVjFu7IgpR6bKl0fhTYz6pWq8klwgslrRKZFLjuZrTfjodLgotLqtIwzq0DL0kA

-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    cloud_provider text,
    category text,
    algorithm text,
    key_size integer,
    quantum_safe boolean DEFAULT false NOT NULL,
    risk_level text DEFAULT 'UNKNOWN'::text NOT NULL,
    compliance_score double precision DEFAULT 0 NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assets OWNER TO cryptobom;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid,
    event_type text NOT NULL,
    request_id text,
    method text,
    path text,
    status integer,
    latency_ms integer,
    ip text,
    user_agent text,
    actor_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_events OWNER TO cryptobom;

--
-- Name: bom_reports; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.bom_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    asset_id uuid,
    format text DEFAULT 'cyclonedx'::text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bom_reports OWNER TO cryptobom;

--
-- Name: cloud_connections; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.cloud_connections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    provider text NOT NULL,
    region text,
    status text DEFAULT 'unknown'::text NOT NULL,
    latency_ms integer,
    last_checked timestamp with time zone,
    config jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.cloud_connections OWNER TO cryptobom;

--
-- Name: compliance_reports; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.compliance_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    standard text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    findings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.compliance_reports OWNER TO cryptobom;

--
-- Name: hsm_keys; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.hsm_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    provider text NOT NULL,
    key_id text NOT NULL,
    hsm_cluster_id text,
    key_type text,
    key_size integer,
    attestation_cert text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.hsm_keys OWNER TO cryptobom;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    plan text DEFAULT 'oss'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizations OWNER TO cryptobom;

--
-- Name: quantum_scans; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.quantum_scans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    asset_id uuid,
    risk_score integer DEFAULT 0 NOT NULL,
    pqc_algorithms jsonb DEFAULT '[]'::jsonb NOT NULL,
    vulnerable_algorithms jsonb DEFAULT '[]'::jsonb NOT NULL,
    migration_status text DEFAULT 'not_started'::text NOT NULL,
    attestation_report jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quantum_scans OWNER TO cryptobom;

--
-- Name: scan_jobs; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.scan_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    scan_type text DEFAULT 'quick'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    findings integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.scan_jobs OWNER TO cryptobom;

--
-- Name: users; Type: TABLE; Schema: public; Owner: cryptobom
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    org_id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_secret text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid
);


ALTER TABLE public.users OWNER TO cryptobom;

--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.assets (id, org_id, name, cloud_provider, category, algorithm, key_size, quantum_safe, risk_level, compliance_score, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_events; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.audit_events (id, org_id, event_type, request_id, method, path, status, latency_ms, ip, user_agent, actor_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: bom_reports; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.bom_reports (id, org_id, asset_id, format, content, created_at) FROM stdin;
\.


--
-- Data for Name: cloud_connections; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.cloud_connections (id, org_id, provider, region, status, latency_ms, last_checked, config) FROM stdin;
\.


--
-- Data for Name: compliance_reports; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.compliance_reports (id, org_id, standard, score, findings, created_at) FROM stdin;
\.


--
-- Data for Name: hsm_keys; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.hsm_keys (id, org_id, provider, key_id, hsm_cluster_id, key_type, key_size, attestation_cert, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.organizations (id, name, plan, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quantum_scans; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.quantum_scans (id, org_id, asset_id, risk_score, pqc_algorithms, vulnerable_algorithms, migration_status, attestation_report, created_at) FROM stdin;
\.


--
-- Data for Name: scan_jobs; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.scan_jobs (id, org_id, status, scan_type, started_at, completed_at, findings, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: cryptobom
--

COPY public.users (id, org_id, email, name, role, password, mfa_enabled, mfa_secret, created_at, updated_at, tenant_id) FROM stdin;
\.


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: bom_reports bom_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.bom_reports
    ADD CONSTRAINT bom_reports_pkey PRIMARY KEY (id);


--
-- Name: cloud_connections cloud_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.cloud_connections
    ADD CONSTRAINT cloud_connections_pkey PRIMARY KEY (id);


--
-- Name: compliance_reports compliance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.compliance_reports
    ADD CONSTRAINT compliance_reports_pkey PRIMARY KEY (id);


--
-- Name: hsm_keys hsm_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.hsm_keys
    ADD CONSTRAINT hsm_keys_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: quantum_scans quantum_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.quantum_scans
    ADD CONSTRAINT quantum_scans_pkey PRIMARY KEY (id);


--
-- Name: scan_jobs scan_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.scan_jobs
    ADD CONSTRAINT scan_jobs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_assets_algorithm; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_assets_algorithm ON public.assets USING btree (algorithm);


--
-- Name: idx_assets_cloud_provider; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_assets_cloud_provider ON public.assets USING btree (cloud_provider);


--
-- Name: idx_assets_org_id; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_assets_org_id ON public.assets USING btree (org_id);


--
-- Name: idx_audit_events_created_at; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_audit_events_created_at ON public.audit_events USING btree (created_at);


--
-- Name: idx_audit_events_event_type; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_audit_events_event_type ON public.audit_events USING btree (event_type);


--
-- Name: idx_audit_events_org_id; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_audit_events_org_id ON public.audit_events USING btree (org_id, created_at DESC);


--
-- Name: idx_cloud_connections_org_provider; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE UNIQUE INDEX idx_cloud_connections_org_provider ON public.cloud_connections USING btree (org_id, provider);


--
-- Name: idx_hsm_keys_org_provider; Type: INDEX; Schema: public; Owner: cryptobom
--

CREATE INDEX idx_hsm_keys_org_provider ON public.hsm_keys USING btree (org_id, provider);


--
-- Name: assets assets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: audit_events audit_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: bom_reports bom_reports_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.bom_reports
    ADD CONSTRAINT bom_reports_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: bom_reports bom_reports_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.bom_reports
    ADD CONSTRAINT bom_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: cloud_connections cloud_connections_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.cloud_connections
    ADD CONSTRAINT cloud_connections_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: compliance_reports compliance_reports_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.compliance_reports
    ADD CONSTRAINT compliance_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: hsm_keys hsm_keys_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.hsm_keys
    ADD CONSTRAINT hsm_keys_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: quantum_scans quantum_scans_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.quantum_scans
    ADD CONSTRAINT quantum_scans_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;


--
-- Name: quantum_scans quantum_scans_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.quantum_scans
    ADD CONSTRAINT quantum_scans_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: scan_jobs scan_jobs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.scan_jobs
    ADD CONSTRAINT scan_jobs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cryptobom
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict tVjFu7IgpR6bKl0fhTYz6pWq8klwgslrRKZFLjuZrTfjodLgotLqtIwzq0DL0kA

