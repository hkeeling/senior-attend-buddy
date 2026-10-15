CREATE POLICY "Instructors can open sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.is_instructor());
CREATE POLICY "Instructors can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());
CREATE POLICY "Authenticated users can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view check-ins" ON public.check_ins FOR SELECT TO authenticated USING (true);