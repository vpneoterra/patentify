/**
 * Patentify — Local Environment Overrides
 *
 * Copy this file to env.local.js and fill in your values.
 * env.local.js is .gitignored and will NOT be committed.
 *
 * Alternatively, you can set your API key via the UI:
 *   Command Center → Settings → Claude API Key
 *
 * For GitHub Pages deployment, set these as Repository Secrets:
 *   Settings → Secrets → Actions → New repository secret
 *   The deploy workflow injects them into env.local.js at build time.
 */

window.PATENTIFY_CONFIG = {
  // Your Anthropic API key (starts with "sk-ant-...")
  // Get one at: https://console.anthropic.com/settings/keys
  ANTHROPIC_API_KEY: '',

  // Supabase cloud sync (optional — for Tier 2 cloud persistence)
  // Create a free project at: https://supabase.com
  SUPABASE_URL: '',       // e.g., 'https://xyz.supabase.co'
  SUPABASE_ANON_KEY: '',  // e.g., 'eyJhbGci...'

  // Backend proxy URL (leave empty for direct browser→Anthropic calls)
  // If you run the optional backend: API_BASE: 'http://localhost:8000'
  API_BASE: '',

  // Default model for AI features
  DEFAULT_MODEL: 'claude-sonnet-4-20250514',
};
