/* Kisa — Supabase connection details.
 *
 * These values are PUBLIC by design. The publishable key is not a password:
 * it identifies the project and grants the `anon` Postgres role, and
 * everything it is allowed to do is bounded by the row-level security
 * policies on the database. It ships in the browser on every Supabase site.
 *
 * What must NEVER go in this file (or anywhere in this repo) is the
 * `service_role` / secret key — that one bypasses every RLS policy.
 */
window.KISA_CONFIG = {
  supabaseUrl: 'https://oprpcgjzeuuyjrazjmbs.supabase.co',

  /* Newer "publishable" format. The legacy `anon` JWT for this project still
     works and is interchangeable, but Supabase is migrating to these. */
  supabaseAnonKey: 'sb_publishable_lyINWm0c8ZwyfXJVdN419w_k2FQcXLX'
};
