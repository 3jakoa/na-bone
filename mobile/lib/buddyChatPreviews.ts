import { supabase } from "./supabase";

const CACHE_STALE_MS = 30_000;
const DEBUG_BUDDY_TIMING = __DEV__;

export type BuddyChatPreview = {
  match_id: string;
  other_profile_id: string;
  other_user_id: string;
  other_name: string;
  other_faculty: string;
  other_photos: string[];
  latest_message_content: string | null;
  latest_message_sender_id: string | null;
  latest_message_mine: boolean | null;
  latest_message_created_at: string | null;
  match_created_at: string;
  last_activity_at: string;
  streak: number;
  unread_count: number;
};

type CacheState = {
  rows: BuddyChatPreview[];
  fetchedAt: number;
};

export type BuddyChatPreviewMessageUpdate = {
  matchId: string;
  content: string;
  senderId: string;
  mine: boolean;
  createdAt: string;
};

let cache: CacheState | null = null;
let pendingFetch: Promise<BuddyChatPreview[]> | null = null;
const listeners = new Set<(update: BuddyChatPreviewMessageUpdate) => void>();

function nowMs() {
  return Date.now();
}

export function getCachedBuddyChatPreviews() {
  return cache;
}

export function isBuddyChatPreviewCacheFresh() {
  return cache ? nowMs() - cache.fetchedAt < CACHE_STALE_MS : false;
}

export function invalidateBuddyChatPreviews() {
  cache = null;
}

function sortPreviewRows(rows: BuddyChatPreview[]) {
  return [...rows].sort((a, b) => {
    const byActivity =
      Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at);
    if (byActivity !== 0) return byActivity;
    return a.match_id.localeCompare(b.match_id);
  });
}

export function subscribeBuddyChatPreviewUpdates(
  listener: (update: BuddyChatPreviewMessageUpdate) => void
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishBuddyChatPreviewMessage(
  update: BuddyChatPreviewMessageUpdate
) {
  if (cache) {
    const rows = cache.rows.map((row) =>
      row.match_id === update.matchId &&
      Date.parse(update.createdAt) >= Date.parse(row.last_activity_at)
        ? {
            ...row,
            latest_message_content: update.content,
            latest_message_sender_id: update.senderId,
            latest_message_mine: update.mine,
            latest_message_created_at: update.createdAt,
            last_activity_at: update.createdAt,
          }
        : row
    );

    cache = {
      rows: sortPreviewRows(rows),
      fetchedAt: nowMs(),
    };
  }

  listeners.forEach((listener) => listener(update));
}

export async function fetchBuddyChatPreviews({
  force = false,
  reason = "screen",
}: {
  force?: boolean;
  reason?: string;
} = {}): Promise<BuddyChatPreview[]> {
  if (!force && isBuddyChatPreviewCacheFresh() && cache) {
    return cache.rows;
  }

  if (!force && pendingFetch) {
    return pendingFetch;
  }

  pendingFetch = (async () => {
    const startedAt = nowMs();
    try {
      const { data, error } = await supabase.rpc("get_buddy_chat_previews");
      const elapsed = nowMs() - startedAt;
      if (error) {
        if (DEBUG_BUDDY_TIMING) {
          console.warn(
            `[Buddies] ${reason} get_buddy_chat_previews failed in ${elapsed}ms`,
            error.message
          );
        }
        throw error;
      }

      const rows = ((data ?? []) as BuddyChatPreview[]).map((row) => ({
        ...row,
        other_photos: row.other_photos ?? [],
        streak: row.streak ?? 0,
        unread_count: row.unread_count ?? 0,
      }));

      cache = { rows, fetchedAt: nowMs() };
      if (DEBUG_BUDDY_TIMING) {
        console.log(
          `[Buddies] ${reason} get_buddy_chat_previews loaded ${rows.length} rows in ${elapsed}ms`
        );
      }
      return rows;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

export function prefetchBuddyChatPreviews(reason = "prefetch") {
  if (isBuddyChatPreviewCacheFresh() || pendingFetch) return;
  void fetchBuddyChatPreviews({ reason }).catch(() => {});
}
