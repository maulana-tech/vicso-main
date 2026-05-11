import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function getSessionId() {
  let sid = sessionStorage.getItem("cn-visitor-sid");
  if (!sid) {
    sid = "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("cn-visitor-sid", sid);
  }
  return sid;
}

export function useVisitorTracking() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const sessionId = getSessionId();

    // Insert or update visitor session
    const track = async () => {
      try {
        const { data: existing } = await supabase
          .from("visitor_sessions")
          .select("id, page_views")
          .eq("session_id", sessionId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("visitor_sessions")
            .update({ last_active: new Date().toISOString(), page_views: (existing.page_views || 0) + 1 })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("visitor_sessions")
            .insert({ session_id: sessionId });
        }
      } catch {
        // Silent fail for visitor tracking
      }
    };

    track();
  }, []);

  return { sessionId: getSessionId() };
}
