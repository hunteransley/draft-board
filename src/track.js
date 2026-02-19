import { supabase } from "./supabase.js";

// Lightweight event tracking — fire-and-forget, never blocks UI
// Events: signup, ranking_started, ranking_saved, mock_draft_started,
//         mock_draft_completed, share_triggered, session_return

let _userId = null;

export function setTrackingUser(id) {
  _userId = id;
}

export function track(event, metadata = {}) {
  if (!_userId) return;
  // Fire and forget — don't await, don't block, don't throw
  supabase
    .from("events")
    .insert({ user_id: _userId, event, metadata })
    .then(({ error }) => {
      if (error) console.debug("track error:", event, error.message);
    });
}

// Deduplicated session tracking — only fires once per session per event key
const _fired = new Set();
export function trackOnce(event, metadata = {}) {
  const key = event + JSON.stringify(metadata);
  if (_fired.has(key)) return;
  _fired.add(key);
  track(event, metadata);
}
