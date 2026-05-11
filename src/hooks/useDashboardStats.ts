import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalTrackedWallets: number;
  activeAlerts: number;
  tokensAnalyzed: number;
  riskEventsToday: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrackedWallets: 0,
    activeAlerts: 0,
    tokensAnalyzed: 0,
    riskEventsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const walletsRes = await supabase.from("tracked_wallets").select("*", { count: "exact", head: true });
    const analysesRes = await supabase.from("token_analyses").select("*", { count: "exact", head: true });

    let alertCount = 0;
    if (user) {
      const alertsRes = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("enabled", true);
      alertCount = alertsRes.count || 0;
    }

    setStats({
      totalTrackedWallets: walletsRes.count || 0,
      tokensAnalyzed: analysesRes.count || 0,
      activeAlerts: alertCount,
      riskEventsToday: 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
