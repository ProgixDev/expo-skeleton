// The configured Supabase client is the backbone today. The whole app reaches it
// only through this `backend` seam, so swapping to a custom API later is a folder
// swap — see presets/backend-api for the matching surface.
export { supabase as client, registerSupabaseAutoRefresh } from '../supabase';
