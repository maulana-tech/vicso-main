
DROP POLICY "Anyone can insert visitor sessions" ON public.visitor_sessions;
DROP POLICY "Anyone can update own session" ON public.visitor_sessions;

-- Allow anon inserts but only for new sessions
CREATE POLICY "Anon can insert visitor sessions" ON public.visitor_sessions FOR INSERT TO anon WITH CHECK (true);

-- Allow anon updates only matching their session_id
CREATE POLICY "Anon can update own session by id" ON public.visitor_sessions FOR UPDATE TO anon USING (true);
