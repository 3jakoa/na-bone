import { supabase } from "./supabase";

type ProductEventType = "thread_opened";

export async function logProductEvent(
  eventType: ProductEventType,
  options: {
    matchId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const { error } = await supabase.rpc("log_product_event", {
    p_event_type: eventType,
    p_match_id: options.matchId ?? null,
    p_metadata: options.metadata ?? {},
  });

  if (error) {
    console.warn("[product-events] log failed", eventType, error.message);
  }
}
