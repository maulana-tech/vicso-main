import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, stream } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENCLAW_API_URL = Deno.env.get("OPENCLAW_API_URL");

    if (!OPENCLAW_API_URL) {
      return new Response(
        JSON.stringify({
          error: "OpenClaw not connected",
          status: "disconnected",
          message: "OPENCLAW_API_URL is not configured.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sid = sessionId || crypto.randomUUID();

    // OpenAI-compatible request body
    const openaiBody = {
      model: "openclaw",
      messages: [
        { role: "system", content: "You are OpenClaw, the AI brain of VicSO. You have access to AVE Cloud Skills for on-chain data, trading signals, wallet analysis, and blockchain intelligence. When users ask about crypto, prices, trading, or on-chain analysis, use your AVE Cloud skill to provide real data." },
        { role: "user", content: message },
      ],
      stream: !!stream,
      user: sid,
    };

    const openclawResponse = await fetch(OPENCLAW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer vicso-web-2026-secret",
      },
      body: JSON.stringify(openaiBody),
    });

    if (!openclawResponse.ok) {
      const errText = await openclawResponse.text();
      console.error("OpenClaw error:", openclawResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: "OpenClaw request failed",
          status: "error",
          details: `HTTP ${openclawResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Streaming mode: pipe SSE through
    if (stream && openclawResponse.headers.get("content-type")?.includes("text/event-stream")) {
      return new Response(openclawResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming: parse OpenAI-compatible response
    const data = await openclawResponse.json();

    // Extract reply from OpenAI format
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.reply ||
      data?.response ||
      data?.message ||
      (typeof data === "string" ? data : JSON.stringify(data));

    const normalized = {
      reply,
      sessionId: sid,
      verdict: data?.verdict,
      tokenSymbol: data?.tokenSymbol || data?.token,
      data: data?.data,
    };

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("openclaw-chat error:", err);

    const isNetworkError =
      err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("connect"));

    return new Response(
      JSON.stringify({
        error: isNetworkError ? "OpenClaw unreachable" : "Internal error",
        status: isNetworkError ? "unreachable" : "error",
      }),
      {
        status: isNetworkError ? 503 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
