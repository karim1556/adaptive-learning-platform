import { createClient } from "@supabase/supabase-js"

// Ensure these env vars are set in your environment or .env.local
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!url || !anonKey) {
	// Helpful dev-time warning so it's obvious why REST requests fail in the browser
	// Do NOT commit actual keys to the repo. Set these in your `.env.local`.
	// Example:
	// NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
	// NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
	// In production use server-side secrets instead of exposing service keys.
	// The app will continue to run, but requests to Supabase REST will fail without an API key.
	// See README or Supabase docs for setup.
	// eslint-disable-next-line no-console
	console.warn(
		"Supabase URL or anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local to enable Supabase requests."
	)
}

export const supabase = createClient(url, anonKey, {
	auth: {
		// Avoid automatic refresh attempts (prevents noisy "Invalid Refresh Token" logs
		// when code runs in non-browser/server contexts where a refresh token isn't available).
		autoRefreshToken: false,
		// Don't try to detect/handle session from URL on page load (Next routing can cause issues).
		detectSessionInUrl: false,
		// Keep session persistence enabled in the browser (default behavior).
		persistSession: true,
	},
})

export default supabase
