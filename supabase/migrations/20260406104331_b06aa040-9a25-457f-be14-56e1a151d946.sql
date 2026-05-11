
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('token', 'wallet', 'risk')),
  target_identifier TEXT NOT NULL,
  target_name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alerts" ON public.alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX alerts_user_target_type ON public.alerts (user_id, target_identifier, alert_type);
