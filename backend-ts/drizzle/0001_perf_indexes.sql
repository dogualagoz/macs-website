-- no-transaction
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_events_active_start ON public.events (is_active, start_time) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_events_created_at ON public.events (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_projects_live_created ON public.projects (created_at DESC) WHERE is_deleted = false AND is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_projects_deleted_featured ON public.projects (is_deleted, is_featured);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sponsors_active_category ON public.sponsors (is_active, category);
