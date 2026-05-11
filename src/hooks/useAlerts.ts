import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertRow {
  id: string;
  user_id: string;
  alert_type: "token" | "wallet" | "risk";
  target_identifier: string;
  target_name: string | null;
  enabled: boolean;
  conditions: Record<string, unknown>;
  last_triggered_at: string | null;
  created_at: string;
}

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) { setAlerts([]); setLoading(false); return; }
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts((data as AlertRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const addAlert = async (
    alertType: "token" | "wallet" | "risk",
    targetIdentifier: string,
    targetName?: string,
  ) => {
    if (!user) return;
    await supabase.from("alerts").upsert(
      {
        user_id: user.id,
        alert_type: alertType,
        target_identifier: targetIdentifier,
        target_name: targetName || targetIdentifier,
        enabled: true,
      },
      { onConflict: "user_id,target_identifier,alert_type" }
    );
    fetchAlerts();
  };

  const toggleAlert = async (id: string, enabled: boolean) => {
    await supabase.from("alerts").update({ enabled: !enabled }).eq("id", id);
    fetchAlerts();
  };

  const removeAlert = async (id: string) => {
    await supabase.from("alerts").delete().eq("id", id);
    fetchAlerts();
  };

  const isAlertEnabled = (targetIdentifier: string, alertType: "token" | "wallet" | "risk") =>
    alerts.some((a) => a.target_identifier === targetIdentifier && a.alert_type === alertType && a.enabled);

  return { alerts, loading, addAlert, toggleAlert, removeAlert, isAlertEnabled, refetch: fetchAlerts };
}
