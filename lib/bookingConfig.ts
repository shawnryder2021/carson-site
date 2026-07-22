// Server-only: loads the dealership booking config (hours/timezone + who to
// notify) from site_settings. Reuses the same chat_hours/chat_timezone that
// drive live-chat availability — the only structured hours source.
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CHAT_HOURS, ChatHours } from './chatHours';

export async function loadBookingConfig(sb: SupabaseClient): Promise<{
  hours: ChatHours; timezone: string; teamEmail: string; agents: any[];
}> {
  const { data } = await sb.from('site_settings')
    .select('chat_hours, chat_timezone, contact_email, chat_agents')
    .eq('id', 1).maybeSingle();
  return {
    hours: (Array.isArray(data?.chat_hours) ? data!.chat_hours : DEFAULT_CHAT_HOURS) as ChatHours,
    timezone: data?.chat_timezone || 'America/Halifax',
    teamEmail: process.env.CHAT_NOTIFY_EMAIL || data?.contact_email || process.env.ALERT_FROM_EMAIL || '',
    agents: Array.isArray(data?.chat_agents) ? data!.chat_agents : [],
  };
}
