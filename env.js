/**
 * Patentify — Environment Configuration
 *
 * This module manages the Claude API key, backend URL, and prompt caching.
 *
 * API key resolution order:
 *   1. window.PATENTIFY_CONFIG.ANTHROPIC_API_KEY  (set in env.local.js)
 *   2. localStorage.getItem('patentify_api_key')  (set via Settings UI)
 *   3. null  → AI features disabled, UI shows setup prompt
 *
 * PROMPT CACHING:
 *   When options.useCache is true, the system prompt is sent as a
 *   structured content block with cache_control: {type: "ephemeral"}.
 *   This enables Anthropic prompt caching — the system prompt is
 *   processed once and cached for 5 minutes, reducing costs by up
 *   to 90% on subsequent calls with the same prefix.
 *
 *   The USPTO Patent Skill (~4,500 tokens) is stored in
 *   PATENTIFY_USPTO_SKILL and injected as a cacheable system block
 *   for all patent-related workflow steps (WF1 Steps 1-7).
 *
 * SECURITY NOTE:
 *   Client-side API keys are visible in the browser. For production,
 *   route calls through a backend proxy (see /docs/backend-proxy.md).
 */

window.PATENTIFY_CONFIG = window.PATENTIFY_CONFIG || {};

var PatentifyEnv = (function() {
  'use strict';

  // Default config
  var defaults = {
    API_BASE: '',                     // Backend proxy URL (empty = no proxy, use direct Anthropic calls)
    ANTHROPIC_API_KEY: '',            // Set in env.local.js or via UI
    SUPABASE_URL: '',                 // Set in env.local.js or via Platform State UI
    SUPABASE_ANON_KEY: '',            // Set in env.local.js or via Platform State UI
    DEFAULT_MODEL: 'claude-sonnet-4-20250514',
    MAX_TOKENS: 4096,
    ENABLE_PROMPT_CACHE: true,        // Enable Anthropic prompt caching (reduces cost ~90% on cache hits)
  };

  // Merge with any values set before this script loaded
  var config = Object.assign({}, defaults, window.PATENTIFY_CONFIG);

  /**
   * Get the Anthropic API key from config or localStorage
   */
  function getApiKey() {
    // 1. Check runtime config (set in env.local.js)
    if (config.ANTHROPIC_API_KEY) return config.ANTHROPIC_API_KEY;
    // 2. Check localStorage (set via Settings UI)
    var stored = null;
    try { stored = localStorage.getItem('patentify_api_key'); } catch(e) {}
    if (stored) return stored;
    // 3. No key available
    return null;
  }

  /**
   * Save API key to localStorage
   */
  function setApiKey(key) {
    try { localStorage.setItem('patentify_api_key', key || ''); } catch(e) {}
    config.ANTHROPIC_API_KEY = key || '';
  }

  /**
   * Clear stored API key
   */
  function clearApiKey() {
    try { localStorage.removeItem('patentify_api_key'); } catch(e) {}
    config.ANTHROPIC_API_KEY = '';
  }

  /**
   * Check if API key is configured
   */
  function hasApiKey() {
    var key = getApiKey();
    return key && key.length > 10;
  }

  /**
   * Get the backend API base URL
   */
  function getApiBase() {
    // Check meta tag first (backwards compatible)
    var meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.getAttribute('content') && meta.getAttribute('content') !== 'http://localhost:8000') {
      return meta.getAttribute('content');
    }
    return config.API_BASE || '';
  }

  /**
   * Build a system prompt array with prompt caching support.
   *
   * When useCache is true:
   *   - The system prompt is wrapped in a content block array
   *   - The last block gets cache_control: {type: "ephemeral"}
   *   - This tells Anthropic to cache the entire system prefix
   *
   * When useCache is false:
   *   - Falls back to plain string system prompt (legacy behavior)
   *
   * @param {string|Array} system - System prompt string or pre-built array
   * @param {boolean} useCache - Whether to enable prompt caching
   * @returns {string|Array} - Formatted system prompt
   */
  function buildSystemPrompt(system, useCache) {
    if (!system) return undefined;

    // If already an array (pre-built), return as-is
    if (Array.isArray(system)) return system;

    // If caching disabled, return plain string
    if (!useCache || !config.ENABLE_PROMPT_CACHE) return system;

    // Wrap in a cacheable content block
    return [
      {
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' }
      }
    ];
  }

  /**
   * Make an authenticated request to the Anthropic API.
   * Supports prompt caching via options.useCache.
   *
   * @param {Object} options
   * @param {string} options.model - Claude model ID
   * @param {number} options.max_tokens - Max response tokens
   * @param {Array} options.messages - Conversation messages
   * @param {string|Array} options.system - System prompt (string or pre-built array)
   * @param {boolean} options.useCache - Enable prompt caching (default: false)
   */
  async function claudeRequest(options) {
    var apiBase = getApiBase();

    // If backend proxy is configured, use it
    if (apiBase) {
      var resp = await fetch(apiBase + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      if (!resp.ok) throw new Error('Backend API error: HTTP ' + resp.status);
      return await resp.json();
    }

    // Direct Anthropic API call
    var key = getApiKey();
    if (!key) {
      throw new Error('No API key configured. Go to Command Center → Settings to add your Claude API key.');
    }

    var useCache = options.useCache && config.ENABLE_PROMPT_CACHE;

    var body = {
      model: options.model || config.DEFAULT_MODEL,
      max_tokens: options.max_tokens || config.MAX_TOKENS,
      messages: options.messages || []
    };

    // Build system prompt with optional caching
    var systemPrompt = buildSystemPrompt(options.system, useCache);
    if (systemPrompt) body.system = systemPrompt;

    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (resp.status === 401) {
      var authErr = new Error('Invalid API key. Check your Claude API key in Settings.');
      authErr._httpStatus = 401;
      authErr._anthropicType = 'authentication_error';
      throw authErr;
    }
    if (!resp.ok) {
      var errorData = await resp.json().catch(function() { return {}; });
      var errObj = errorData.error || {};
      var apiErr = new Error('Anthropic API error: ' + (errObj.message || 'HTTP ' + resp.status));
      apiErr._httpStatus = resp.status;
      apiErr._anthropicType = errObj.type || null;
      apiErr._anthropicMsg = errObj.message || null;
      apiErr._responseBody = errorData;
      throw apiErr;
    }

    var data = await resp.json();

    // Log cache performance metrics (dev mode)
    if (useCache && data.usage) {
      var cacheRead = data.usage.cache_read_input_tokens || 0;
      var cacheCreate = data.usage.cache_creation_input_tokens || 0;
      var uncached = data.usage.input_tokens || 0;
      if (cacheRead > 0 || cacheCreate > 0) {
        console.log('[Patentify Cache] Read: ' + cacheRead + ' tokens | Created: ' + cacheCreate + ' tokens | Uncached: ' + uncached + ' tokens');
      }
    }

    return data;
  }

  // Public API
  return {
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    clearApiKey: clearApiKey,
    hasApiKey: hasApiKey,
    getApiBase: getApiBase,
    claudeRequest: claudeRequest,
    buildSystemPrompt: buildSystemPrompt,
    config: config
  };
})();


// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM CONTEXT — CACHED SYSTEM PROMPT (Block 1)
// This block gives Claude full awareness of the project: what it is, the
// portfolio taxonomy, workflow chain, scoring systems, and output rules.
// Sent as the first cached block on every API call (~1,800 tokens).
// Combined with the USPTO skill (~4,500 tokens), the total cached prefix
// is ~6,300 tokens — still well within Anthropic's cache-friendly range.
// After the first call, subsequent calls within 5 min pay ~90% less.
// ═══════════════════════════════════════════════════════════════════════════════

window.PLATFORM_CONTEXT = {
  version: '1.0',
  lastUpdated: '2026-03-07',

  /**
   * The platform identity and project context, condensed for prompt caching.
   * This is the "who you are / what you're working on" block that every
   * API call should include so Claude understands the full project.
   *
   * IMPORTANT: No company names, product names, or organization identifiers
   * appear in this block. All references are generic/functional.
   */
  systemPrompt:
    '=== PLATFORM IDENTITY ===\n' +
    'You are the AI engine of a deep-tech IP strategy platform. This platform manages an end-to-end patent portfolio pipeline: from whitespace discovery through patent drafting, FTO analysis, CII scoring, filing strategy, and portfolio optimization.\n\n' +

    '=== PORTFOLIO TAXONOMY ===\n' +
    'The active portfolio spans 15 technology whitespace domains and 105 patentable invention concepts (7 per whitespace). Each whitespace has a canonical ID (WS-1 through WS-15) and belongs to a macro-domain cluster and competition zone.\n\n' +

    'Whitespace domains (wsId: shortName | patentabilityScore | ciisMean | TAM):\n' +
    'WS-1: SSE Interface | 9.2 | 0.626 | $180M-$350M\n' +
    'WS-2: Circular Materials | 9.0 | 0.631 | $200M-$400M\n' +
    'WS-3: Neuromorphic | 8.8 | 0.685 | $150M-$300M\n' +
    'WS-4: Cell-Free Biomanuf. | 8.6 | 0.657 | $120M-$250M\n' +
    'WS-5: Universal TIMs | 8.5 | 0.649 | $100M-$220M\n' +
    'WS-6: QEC Hardware | 8.4 | 0.666 | $130M-$280M\n' +
    'WS-7: Multi-Mat. AM | 8.3 | 0.687 | $110M-$240M\n' +
    'WS-8: Federated Edge AI | 8.1 | 0.701 | $100M-$200M\n' +
    'WS-9: Cryo Control | 8.0 | 0.659 | $90M-$190M\n' +
    'WS-10: Neural Interfaces | 7.9 | 0.654 | $80M-$180M\n' +
    'WS-11: Safety Verification | 7.8 | 0.685 | $70M-$160M\n' +
    'WS-12: WBG Packaging | 7.7 | 0.599 | $75M-$170M\n' +
    'WS-13: SynBio Materials | 7.6 | 0.638 | $65M-$150M\n' +
    'WS-14: Photonic Interconnect | 7.5 | 0.638 | $85M-$190M\n' +
    'WS-15: PQC Hardware | 7.4 | 0.665 | $60M-$140M\n\n' +

    'Each invention concept (Idea 1-105) maps to exactly one whitespace: Ideas 1-7 → WS-1, Ideas 8-14 → WS-2, ..., Ideas 99-105 → WS-15.\n\n' +

    '=== SCORING SYSTEMS ===\n' +
    '1. Patentability Score (0-10): Measures novelty, non-obviousness, enablement, and prior art distance. Source: Patent Lab analysis engine. Higher = stronger filing candidate.\n' +
    '2. Composite Innovation Index (CII, 0-1): Measures network centrality, economic value, legal feasibility, and strategic fit. Source: CII scoring engine. Higher = greater strategic value.\n' +
    'Both scores are pre-computed for all 15 whitespaces and 105 ideas.\n\n' +

    '=== WORKFLOW CHAIN ===\n' +
    'The platform operates four sequential AI-assisted workflow pipelines:\n' +
    'WF1 — Patent Pipeline: Idea disclosure → FTO analysis → claim drafting → figure generation → USPTO specification drafting → lawyer review → admin approval → filing → examination → award. Each step uses AI with domain-specific prompts.\n' +
    'WF2 — Whitespace Discovery: Domain scoping → patent landscape scan → whitespace identification & scoring → solution architecture → FTO deep dive → filing strategy → competitive intelligence → strategic review → record finalization → dashboard update.\n' +
    'WF3 — CII Scoring: Automated scoring of patent ideas on the Composite Innovation Index using multi-factor analysis.\n' +
    'WF4 — CII Training: Calibration and training pipeline for the CII scoring model using labeled examples.\n\n' +

    'Workflow chain execution order: WF1 → WF2 → WF3 → WF4. Each workflow can also run independently.\n\n' +

    '=== ROLE-BASED ACCESS ===\n' +
    'Platform roles: admin, patent-engineer, patent-lawyer, ip-strategist, ip-analyst, inventor. Each workflow step has a roleGate that determines who can execute or approve it.\n\n' +

    '=== OUTPUT CONVENTIONS (all AI-generated content must follow) ===\n' +
    '1. NEVER include any company names, organization names, or product brand names in generated patent text. Use generic functional descriptions only.\n' +
    '2. All patent-related output follows USPTO standards (37 CFR, MPEP). See the USPTO Patent Skill for detailed rules.\n' +
    '3. Maintain strictly clinical, objective, neutral-technical tone in all patent documents. No advocacy, marketing, or emotive language.\n' +
    '4. When referencing whitespace domains or ideas, use the canonical IDs (WS-1, Idea 42, etc.) for consistency across all modules.\n' +
    '5. Cost awareness: use the most efficient model for each task. Simple classification → Haiku. Standard drafting → Sonnet. Complex legal analysis → Opus.\n' +
    '6. All generated content should be self-contained and production-ready — no placeholders, no TODO markers, no incomplete sections.\n\n' +

    '=== AVAILABLE DOMAIN SKILLS ===\n' +
    'The following specialized skill modules are dynamically injected based on the current workflow step. When a skill is active, its full knowledge base is available to you as a cached system block.\n' +
    '1. USPTO Patent Drafting — Specification structure (37 CFR §1.77), claim construction (§1.75), document formatting (§1.52), prohibited terms blocklist, quantitative language patterns, negative limitations, four deliverables (Filing Draft, Attorney Memo, Prior-Art Table, Claim Support Matrix), pre-filing checklist. Active for: WF1 idea/claims/draft steps, WF2 solution architecture.\n' +
    '2. Competitive Intelligence & FTO — Prior art search methodology (5-database cascade), claim-by-claim comparison matrix, FTO risk classification (weighted scoring), design-around decision tree, PTAB/IPR survivability scoring, competitor profiling, patent thicket density analysis, cross-licensing leverage assessment. Active for: WF1 FTO step, WF2 landscape scan/FTO deep dive/competitive intel steps.\n' +
    '3. Patent Language & Compliance Audit — Prohibited terms blocklist (3 categories), section-by-section 37 CFR compliance checklist, claim antecedent basis validation, cross-reference validation (spec↔claims↔figures), tone & register audit, structured audit report format. Active for: WF1 lawyer-review/admin-approval steps, WF2 strategic review.\n' +
    '4. USPTO Patent Figures — Drawing standards (37 CFR §1.84), figure type selection matrix, reference numeral conventions (3-digit system), shading & hatching rules, flowchart/mechanical/design patent specifics, 20-point pre-filing checklist, common PTO-948 objections. Active for: WF1 figures step, WF2 solution architecture.\n' +
    '5. Portfolio Valuation & Filing Strategy — TAM/SAM/SOM modeling for deep-tech patents, royalty benchmarks by sector, three-approach valuation (Income/Market/Cost with triangulation), filing phase assignment (Phase 1/Phase 2/No-File), provisional→PCT→national phase timeline, continuation cascade planning, 10-year revenue projection, jurisdiction cost analysis. Active for: WF2 filing strategy/dashboard update steps, WF4 training.\n' +
    'If no domain skill is injected for the current step, rely on the platform context and general patent knowledge.\n',

  /**
   * Helper: Build the multi-block cached system prompt.
   *
   * Architecture (dynamic):
   *   Block 1: PLATFORM_CONTEXT (cached)     — project identity, taxonomy, workflows
   *   Block 2…N: Domain skill(s) (cached)    — resolved via SKILL_REGISTRY per step
   *   Block N+1: stepRole (uncached)          — per-call step instructions
   *
   * The cached prefix (Block 1 + skills) is marked cache_control: "ephemeral".
   * Anthropic caches the entire prefix; subsequent calls within 5 min pay ~90% less.
   * The last skill block gets cache_control to mark the boundary.
   *
   * @param {string} [stepRole] - Step-specific instruction (optional)
   * @param {Object} [opts] - Options
   * @param {string} [opts._step] - Current step ID for skill resolution
   * @param {string} [opts._workflow] - Current workflow ID for skill resolution
   * @param {boolean} [opts.includeUSPTO=true] - Legacy: include USPTO skill (ignored if _step resolves skills)
   * @returns {Array} - System prompt content block array
   */
  buildFullSystem: function(stepRole, opts) {
    opts = opts || {};

    // Block 1: Platform Context (always cached)
    var blocks = [
      {
        type: 'text',
        text: this.systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ];

    // Block 2…N: Resolve domain skills via SKILL_REGISTRY
    var resolvedSkills = [];
    if (window.SKILL_REGISTRY && opts._step) {
      resolvedSkills = window.SKILL_REGISTRY.resolve(opts._step, opts._workflow);
    }

    if (resolvedSkills.length > 0) {
      // Inject resolved skills — last one gets cache_control for boundary
      for (var i = 0; i < resolvedSkills.length; i++) {
        var skillBlock = { type: 'text', text: resolvedSkills[i].systemPrompt };
        if (i === resolvedSkills.length - 1) {
          skillBlock.cache_control = { type: 'ephemeral' };
        }
        blocks.push(skillBlock);
      }
    } else if (opts.includeUSPTO !== false && window.PATENTIFY_USPTO_SKILL) {
      // Legacy fallback: include USPTO skill when no step-based resolution
      blocks.push({
        type: 'text',
        text: window.PATENTIFY_USPTO_SKILL.systemPrompt,
        cache_control: { type: 'ephemeral' }
      });
    }

    // Final block: step-specific role instruction (uncached — changes per call)
    if (stepRole) {
      blocks.push({ type: 'text', text: stepRole });
    }

    return blocks;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// USPTO PATENT SKILL — CACHED SYSTEM PROMPT (Block 2)
// Source: uspto-patents.skill (SKILL.md + 3 reference docs)
// This content is sent as a cached system prompt for all WF1 steps.
// On the first call, Anthropic caches it (~4,500 tokens). Subsequent
// calls within 5 min hit the cache, paying ~90% less for input tokens.
// ═══════════════════════════════════════════════════════════════════════════════

window.PATENTIFY_USPTO_SKILL = {
  version: '1.0',
  source: 'uspto-patents.skill',
  lastUpdated: '2026-03-07',

  /**
   * The full USPTO patent skill condensed into a single system prompt.
   * This combines SKILL.md + drafting-guidelines.md + language-guide.md +
   * figures-guide.md into one optimized block for prompt caching.
   *
   * Usage in claudeRequest:
   *   system: PATENTIFY_USPTO_SKILL.systemPrompt,
   *   useCache: true
   *
   * Cost savings model:
   *   - Without caching: ~4,500 input tokens × $3/MTok = $0.0135/call
   *   - Cache write (1st call): ~4,500 tokens × $3.75/MTok = $0.0169
   *   - Cache read (2nd+ call): ~4,500 tokens × $0.30/MTok = $0.00135/call
   *   - Savings per cached call: ~90%
   *   - Full WF1 pipeline (7 AI calls): saves ~$0.08 per invention
   *   - 105 inventions: saves ~$8.40 per full portfolio run
   */
  systemPrompt:
    'You are the USPTO Patent Drafting Engine for this IP strategy platform. You produce USPTO-compliant utility patent application documents following 37 CFR Part 1 and the Manual of Patent Examining Procedure (MPEP). You cover specification drafting, claim construction, figure guidance, FTO analysis, and patent-native language conventions.\n\n' +

    '=== NON-NEGOTIABLE RULES ===\n' +
    '1. SPECIFICATION ≠ STRATEGY: Filing draft contains only physical structure, manufacturing methods, usage, embodiments, process parameters, material alternatives, operating ranges, experimental examples, and definitions. Strategy goes in the Attorney Memo (separate deliverable).\n' +
    '2. NO PATENT PROFANITY: Never use absolute, restrictive, or categorical language. See PROHIBITED TERMS below.\n' +
    '3. NO ARGUMENTATIVE PRIOR ART: Never attack prior art with "fails," "fundamentally limited," or "no prior art exists." Use neutral characterizations: "existing approaches have not addressed," "the art does not disclose." Never name competitors in Background.\n' +
    '4. SINGLE REGISTER: Strictly clinical, objective, neutral-technical tone. No advocacy, marketing, pedagogy, metaphors, colloquialisms, emotive descriptors.\n' +
    '5. PROPHETIC ≠ WORKING: Working examples = past tense ("was milled"). Prophetic = present tense ("is formed," "is expected to exhibit"). Include uncertainty bounds for prophetic predictions.\n' +
    '6. CLAIMS: ONE SENTENCE EACH ending in period. Use "a/an" to introduce new elements; "the/said" to refer back. Sequential numbering only (1,2,3…).\n' +
    '7. NO PLACEHOLDERS: Never output [FIGURE PLACEHOLDER], [ATTORNEY DOCKET], etc. Draft seamless text.\n' +
    '8. PROPER SCIENTIFIC NOTATION: Use standard Unicode (e.g., 10⁵ A/cm², μ₀H_c2(0)).\n\n' +

    '=== PROHIBITED TERMS (replace immediately) ===\n' +
    'critical → important/significant (whitelist scientific uses like "critical temperature") | only → in at least one embodiment | requires → may employ | must → may/is configured to | best/optimal → preferred/advantageous | the invention is → the present disclosure relates to | superior → improved/enhanced | essential → advantageous | exclusively → preferentially | necessary → beneficial | impossible → not readily achievable | uniquely → in certain embodiments | solely → primarily | never/always → qualified conditional | ideal/perfect → preferred/substantially matched | no prior art exists → existing approaches have not addressed | the prior art fails → the art does not disclose\n\n' +

    '=== APPROVED PATENT PHRASES (prioritize) ===\n' +
    'approximately | wherein | at least | comprising | about | preferably | having | without | selected from the group consisting of | may be | in a preferred embodiment | substantially | further comprising | in the range of | is configured to | at least one of | optionally | one or more of | in certain embodiments | without limitation | illustrative/non-limiting | as used herein | referring now to FIG. | free of/substantially free of | in the absence of\n\n' +

    '=== SPECIFICATION STRUCTURE (37 CFR § 1.77) ===\n' +
    'Section order (headings UPPERCASE, no bold/underline):\n' +
    '1. TITLE OF THE INVENTION (≤500 chars)\n' +
    '2. CROSS-REFERENCE TO RELATED APPLICATIONS\n' +
    '3. STATEMENT REGARDING FEDERALLY SPONSORED RESEARCH\n' +
    '4. INCORPORATION-BY-REFERENCE (if applicable)\n' +
    '5. BACKGROUND OF THE INVENTION (3-4 paras: field → problem → incomplete approaches → transition)\n' +
    '6. BRIEF SUMMARY OF THE INVENTION\n' +
    '7. BRIEF DESCRIPTION OF THE DRAWINGS\n' +
    '8. DETAILED DESCRIPTION (continuous prose, [0001] numbering, enable PHOSITA, best mode)\n' +
    '9. CLAIM(S) (separate sheet)\n' +
    '10. ABSTRACT OF THE DISCLOSURE (separate sheet, ≤150 words, no merits/comparisons)\n\n' +

    '=== DOCUMENT FORMAT (37 CFR § 1.52) ===\n' +
    'US Letter or A4, portrait only. Margins: top ≥3/4", left ≥1", right ≥3/4", bottom ≥3/4". Font: 12pt Arial/Times/Courier, black on white. Spacing: 1.5 or double. Pages numbered consecutively from 1. Paragraphs: [0001], [0002], etc.\n\n' +

    '=== CLAIM DRAFTING RULES (37 CFR § 1.75) ===\n' +
    'Default to "comprising" (open-ended). Dependent: "The [category] of claim [X], wherein [additional limitation]." Claims must differ substantially. Antecedent basis: introduce with "a/an", refer back with "the/said". Multi-element claims: indent each element. Three ladders: commercially broad, examiner-resistant, data-supported fallback. Markush: "selected from the group consisting of". No alphanumeric suffixes (17A, 17B). Each claim term maps to exactly one specification term.\n\n' +

    '=== QUANTITATIVE LANGUAGE PATTERNS ===\n' +
    'Lower bound: "at least [value]" | Approximation: "approximately [value]" | Range: "in the range of [X] to [Y]" | Hedged range: "from about [X] to about [Y]" | Define "approximately" in spec (e.g., "within ±10% of stated value").\n\n' +

    '=== NEGATIVE LIMITATIONS ===\n' +
    'without [element] | without requiring | free of | substantially free of | absent | does not require | in the absence of | excluding | other than | without the need for\n\n' +

    '=== DRAWING STANDARDS (37 CFR § 1.84) ===\n' +
    'Black-and-white line art only. Figure labels: "FIG. X" consecutive Arabic numerals. Reference characters ≥0.32 cm height, plain, no enclosures. Same part = same character across all figures. Lead lines present, not crossing. Margins: top ≥1", left ≥1", right ≥5/8", bottom ≥3/8". Shading: thin spaced lines preferred, light from upper-left 45°. Scale: details visible at 2/3 reduction. One view suitable for published front page.\n\n' +

    '=== FOUR DELIVERABLES (never combine) ===\n' +
    'A. FILING DRAFT: Clean patent specification only. Zero strategy/notes.\n' +
    'B. ATTORNEY MEMO: Novelty anchors, §103/§112 risks, prosecution strategy, competitive analysis, design-around vulnerabilities.\n' +
    'C. PRIOR-ART TABLE: Peer references, overlapping elements, true distinctions, evidentiary support.\n' +
    'D. CLAIM SUPPORT MATRIX: Each claim term → spec paragraph(s), experimental vs. prophetic classification.\n\n' +

    '=== PRE-FILING CHECKLIST ===\n' +
    '□ Blocklist scan: all prohibited terms replaced (context-aware for scientific terms)\n' +
    '□ Single neutral-technical register throughout\n' +
    '□ Antecedent basis: all claim terms introduced with "a/an", referenced with "the/said"\n' +
    '□ Prophetic language uses conditional tense with uncertainty bounds\n' +
    '□ No placeholders, no unresolved dates, no empty sections\n' +
    '□ Background: no competitor names, no specific citations, 3-4 paragraphs max\n' +
    '□ Section headings UPPERCASE, no bold/underline\n' +
    '□ Title ≤500 characters\n' +
    '□ Abstract on separate page, ≤150 words, no merits/comparisons\n' +
    '□ Claims on separate page, consecutively numbered\n' +
    '□ Each claim: capital letter start, period end\n' +
    '□ Drawing references consistent between description and figures\n' +
    '□ All reference numerals in text appear in drawings and vice versa\n' +
    '□ Content separation: no strategy in specification, no specification in memo',

  /**
   * Helper: Build a system prompt array combining the cached USPTO skill
   * with a step-specific role instruction. The USPTO skill is the cached
   * block; the step role is a small uncached addition.
   *
   * @param {string} stepRole - Short step-specific role instruction
   * @returns {Array} - System prompt array for claudeRequest
   */
  buildCachedSystem: function(stepRole) {
    var blocks = [
      {
        type: 'text',
        text: this.systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ];
    if (stepRole) {
      blocks.push({ type: 'text', text: stepRole });
    }
    return blocks;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SKILL: COMPETITIVE INTELLIGENCE & FTO (Block S2)
// Source: competitive-intelligence-fto.skill
// Consumed by: WF1 Step 1 (FTO), WF2 Steps 5+7 (FTO Deep Dive, Comp Intel)
// ═══════════════════════════════════════════════════════════════════════════════

window.SKILL_CI_FTO = {
  id: 'ci-fto',
  version: '1.0',
  source: 'competitive-intelligence-fto.skill',
  lastUpdated: '2026-03-07',
  workflows: ['wf1', 'wf2'],
  steps: ['fto', 'wsd-2', 'wsd-5', 'wsd-7'],

  systemPrompt:
    '=== COMPETITIVE INTELLIGENCE & FTO SKILL ===\n' +
    'PRIOR ART SEARCH METHODOLOGY:\n' +
    'Search across: USPTO (PatFT/AppFT), EPO (Espacenet, 120M+ docs), WIPO (PatentScope), Google Patents, Semantic Scholar/arXiv (NPL). Execution order: (1) CPC/IPC classification search using primary and secondary codes, (2) Keyword search in title/abstract and full text with Boolean operators, (3) Citation network tracing — forward and backward, 3 hops minimum, (4) Assignee search for top 5 competitors, (5) NPL search for academic prior art under §102(a)(1).\n\n' +
    'CLAIM-BY-CLAIM COMPARISON MATRIX:\n' +
    'For each prior art reference, produce: Reference info (patent/pub number, assignee, title, date) → Table with columns: Claim Element | Invention Claim Language | Reference Disclosure | Overlap | Gap. Classify overlap as ANTICIPATORY / PARTIAL / MINOR / NONE. Rate claim vulnerability as HIGH / MEDIUM / LOW.\n\n' +
    'FTO RISK CLASSIFICATION:\n' +
    'Assess each third-party patent on: Claim Overlap (weight 0.35), Enforceability (0.15), Jurisdiction Match (0.15), Doctrine of Equivalents (0.20), Design-Around Feasibility (0.15).\n' +
    'Risk levels: HIGH (≥80% overlap + in force + same jurisdiction + low design-around) → mandatory design-around or license; MEDIUM (50-79% overlap OR DoE risk OR costly design-around) → design-around recommended; LOW (<50% overlap + clear distinctions) → document only; CLEAR (no meaningful overlap) → no concern.\n\n' +
    'DESIGN-AROUND DECISION TREE:\n' +
    '1. Can feature be OMITTED? → YES: omit. 2. Can feature be SUBSTITUTED? → YES: substitute, verify. 3. Is blocking patent NARROW enough? → YES: minor modifications. 4. Is blocking patent VULNERABLE to invalidity? → YES: consider IPR. 5. Is LICENSING viable? → YES: estimate cost. → NO to all: flag as BLOCKING.\n\n' +
    'PTAB/IPR SURVIVABILITY SCORING:\n' +
    'Score 0-1 on: Prior Art Distance (0.30), Claim Specificity (0.25), Secondary Considerations (0.20), Specification Support (0.15), Prosecution History (0.10). Composite ≥0.75 = STRONG, 0.50-0.74 = MODERATE, 0.25-0.49 = WEAK, <0.25 = VULNERABLE.\n\n' +
    'COMPETITOR PROFILING:\n' +
    'For each competitor: entity type (corp/university/gov/startup), portfolio metrics (total patents, active, pending, filing velocity, geographic coverage, CPC concentration), strategic assessment (portfolio strength: DOMINANT/STRONG/MODERATE/EMERGING/NICHE, filing trajectory, retaliation risk, licensing posture), blocking patents list, open source risk.\n\n' +
    'RETALIATION RISK: Portfolio >10× ours in CPC class = HIGH. Active litigation history (3 yrs) = HIGH. Cross-licensing/pools = MEDIUM. Defensive-only posture = LOW. Startup/academic = LOW.\n\n' +
    'PATENT THICKET DENSITY:\n' +
    '>500 filings/year = dense thicket → narrow claims to unclaimed space. HHI >0.25 = concentrated → target dominant player gaps. <100 filings/year = open field → broad claims viable. Accelerating filings + low total = emerging → file quickly with provisionals.\n\n' +
    'CROSS-LICENSING LEVERAGE:\n' +
    'Leverage = Our_Portfolio_Value_in_Their_Space / Their_Portfolio_Value_in_Our_Space. >1.0 = we have leverage. 0.5-1.0 = balanced. <0.5 = they have leverage. <0.1 = license or design-around.\n\n' +
    'OUTPUT SCHEMAS:\n' +
    'FTO Output: invention_id, analysis_date, executive_summary, overall_fto_risk, patentability_assessment (§101/§102/§103/§112 each with risk + detail), prior_art_references[], claim_comparison_matrix[], blocking_patents[], design_around_recommendations[], risk_matrix_summary, strategic_recommendations[].\n' +
    'Competitive Intel Output: domain, analysis_date, competitor_profiles[], thicket_density, ptab_survivability, open_source_risk, cross_licensing_leverage, defensive_recommendations[], offensive_opportunities[].'
};


// ═══════════════════════════════════════════════════════════════════════════════
// SKILL: PATENT LANGUAGE & COMPLIANCE AUDIT (Block S3)
// Source: patent-language-compliance-audit.skill
// Consumed by: WF1 Steps 6+7 (Lawyer Review, Admin Approval), any review gate
// ═══════════════════════════════════════════════════════════════════════════════

window.SKILL_COMPLIANCE_AUDIT = {
  id: 'compliance-audit',
  version: '1.0',
  source: 'patent-language-compliance-audit.skill',
  lastUpdated: '2026-03-07',
  workflows: ['wf1'],
  steps: ['lawyer-review', 'admin-approval'],

  systemPrompt:
    '=== PATENT LANGUAGE & COMPLIANCE AUDIT SKILL ===\n' +
    'This skill validates USPTO patent filings. It does NOT draft — it audits and flags deficiencies.\n\n' +
    'PROHIBITED TERMS BLOCKLIST (flag every occurrence, propose replacement):\n' +
    'Category A — Absolute/Categorical: critical→important/significant (whitelist scientific uses), only→in at least one embodiment, requires→may employ, must→may/is configured to, best→preferred, optimal→advantageous, essential→advantageous, exclusively→preferentially, necessary→beneficial, impossible→not readily achievable, uniquely→in certain embodiments, solely→primarily, never→in some embodiments does not, always→in various embodiments, ideal→preferred, perfect→substantially matched.\n' +
    'Category B — Advocacy/Comparative: the invention is→the present disclosure relates to, superior→improved/enhanced, no prior art exists→existing approaches have not addressed, fundamentally limited→has not demonstrated, the prior art fails→the art does not disclose, our invention→the present disclosure, solves→provides/achieves, completely eliminates→reduces or eliminates.\n' +
    'Category C — Stylistic: DELETE all metaphors, colloquialisms, emotive descriptors (groundbreaking, remarkable), pitch-deck headers.\n' +
    'For each hit output: {section, paragraph_number, original_text, flagged_term, proposed_replacement, context_note}. Mark scientific uses as WHITELISTED.\n\n' +
    'SECTION-BY-SECTION 37 CFR COMPLIANCE CHECKLIST:\n' +
    'Document Format (§1.52): English only, no mixed formatting, UPPERCASE headings, sequential [0001] numbering, no bullets in Detailed Description.\n' +
    'Specification Structure (§1.71/§1.77): Verify 12-section order (Title→Cross-Ref→Fed Sponsored→Incorporation→Prior Disclosures→Background→Summary→Drawing Desc→Detailed Desc→Claims→Abstract→Sequence). All sections present + substantive. Continuous prose for §112 Enablement. Best mode disclosed. Reference numerals match drawings.\n' +
    'Title (§1.72a): ≤500 chars, specific and descriptive.\n' +
    'Abstract (§1.72b): Separate sheet, ≤150 words, no merits/advocacy.\n' +
    'Claims (§1.75): Separate sheet, consecutive Arabic numerals, each starts capital + ends period, each is one sentence, multi-element indentation, substantially different, correct dependent references.\n' +
    'Drawings (§1.84): Ref chars ≥0.32cm plain legible, same part = same char, no orphaned refs in either direction, lead lines don\'t cross, no solid black shading, hatching at 45°.\n\n' +
    'CLAIM ANTECEDENT BASIS VALIDATION:\n' +
    'Introduction rule: introduce with "a/an", refer back with "the/said". Flag any "the [term]" without prior "a/an [term]" in the claim or its parent chain. Trace full dependency chains to independent claims. Flag circular dependencies. Flag unresolved synonyms without "as used herein" bridge. Flag coined terms in claims without specification definition.\n\n' +
    'CROSS-REFERENCE VALIDATION:\n' +
    'Spec→Claims: identical terminology required. Claims→Figures: claimed elements should have reference numerals. Figures→Spec: every ref numeral in figures must be in description and vice versa. Every figure mentioned in Brief Description of Drawings.\n\n' +
    'TONE & REGISTER AUDIT:\n' +
    'Single clinical neutral-technical register throughout. Flag: advocacy ("This breakthrough"), marketing ("state-of-the-art"), pedagogy ("To understand why"), business strategy, emotive descriptors. Working examples = past tense. Prophetic = present/subjunctive with uncertainty. Background: no competitor names, no author citations, 3-4 paragraphs, no absolute prior art claims. Content separation: flag any IP strategy, design-around analysis, claim breadth rationale, prosecution arguments, or internal notes in the specification.\n\n' +
    'AUDIT REPORT FORMAT:\n' +
    'Title + Date + Summary (total issues: Critical/Warning/Info) + Section Scores (PASS/FAIL per section) + Detailed Findings (ordered by severity, each with ID, Section, Location, Description, Suggested Fix).'
};


// ═══════════════════════════════════════════════════════════════════════════════
// SKILL: USPTO PATENT FIGURES (Block S4)
// Source: uspto-patent-figures.skill
// Consumed by: WF1 Step 3 (Generate Figures), WF2 Step 4 (Solution Architecture)
// ═══════════════════════════════════════════════════════════════════════════════

window.SKILL_PATENT_FIGURES = {
  id: 'patent-figures',
  version: '1.0',
  source: 'uspto-patent-figures.skill',
  lastUpdated: '2026-03-07',
  workflows: ['wf1', 'wf2'],
  steps: ['figures', 'wsd-4'],

  systemPrompt:
    '=== USPTO PATENT FIGURES SKILL (37 CFR §1.84, MPEP §§507, 608.02) ===\n\n' +
    'LEGAL BASIS: 35 U.S.C. §113 mandates drawings whenever the nature of the invention admits of it.\n\n' +
    'COMPLIANCE REQUIREMENTS:\n' +
    'Ink: Black-and-white line art only. No color (unless petition §1.17(h) + 3 color sets), no grayscale fills. Paper: US Letter or DIN A4, consistent. Margins: Top ≥1", Left ≥1", Right ≥5/8", Bottom ≥3/8". No frames/borders. Figure labels: "FIG. X" consecutive Arabic numerals. Sheet numbers: fraction format (1/5, 2/5) top center. Ref chars: ≥0.32cm height, plain, no enclosures (circles/brackets/quotes), same part = same number across all figures. Lead lines: connect ref char to feature, straight/curved, short as possible, NEVER cross each other. Lines: heavy enough for reproduction at 2/3 reduction, min 0.3mm stroke. Text: English only, minimal legends. Scale: detail visible at 2/3 reduction, no scale notations.\n\n' +
    'FIGURE TYPE SELECTION:\n' +
    'System Block Diagram — software/electronics. Method Flowchart — processes/methods (rectangles for steps, diamonds for decisions, YES/NO branches). Perspective View — mechanical 3D. Exploded View — multi-component (brackets indicating assembly). Sectional/Cross-Section — internal mechanisms (hatching at 45°, different patterns per material). Plan/Elevation — structural/design patents. Circuit/Schematic — electronics. Waveform — signals. UI Screenshot — GUI (B&W). Sequence Diagram — protocols.\n' +
    'Selection: Software/method → block diagram + flowchart. Hardware/mechanical → perspective + exploded + sectional. Design patent → 6 standard views + perspective. Mixed → combine.\n\n' +
    'REFERENCE NUMERAL CONVENTION:\n' +
    'Three-digit starting at 100, increment by 10 for major components, by 1 for sub-components (100, 110, 111, 112, 120, 200). Generate a Reference Numeral Table: Ref# | Component Name | Appears in Figures. Every ref in drawings must appear in description and vice versa (§1.84(p)(5)).\n\n' +
    'SHADING & HATCHING:\n' +
    'Shading for surface contour: spaced lines, light from upper-left 45°. No solid black (except bar graphs or color black). Sectional hatching: regularly spaced oblique parallel lines at ~45° to principal axes, different patterns for different materials.\n\n' +
    'FLOWCHART SPECIFICS: Rectangles for process steps, diamonds for decisions, ovals for start/end. Unique ref numeral per step (S100, S110...). Decision diamonds show YES/NO branches. Flow: top-to-bottom primary, left-to-right for branches. Multi-sheet: connector circles with matching letters.\n\n' +
    'MECHANICAL SPECIFICS: Standard orthographic views as needed. Exploded views: separate along assembly axis with brackets. Sectional views: cut plane + hatching. Phantom (dashed) lines for hidden/adjacent structure.\n\n' +
    'DESIGN PATENT FIGURES (35 U.S.C. Chapter 16): Drawings ARE the claim. All 6 standard views (front, rear, left, right, top, bottom) + perspective. Broken lines for environmental (unclaimed) structure. No hidden planes through opaque materials. Color permitted without petition. No sectional construction views.\n\n' +
    'PRE-FILING CHECKLIST (20 items): 1. All B&W line art 2. Consistent paper size 3. Margins compliant 4. No frames 5. FIG. labels consecutive 6. Sheet numbers as fractions 7. Ref chars ≥0.32cm 8. Same part = same ref 9. All refs bidirectionally matched 10. No enclosed ref chars 11. Lead lines non-crossing 12. Lines survive 2/3 reduction 13. Shading thin spaced 14. Hatching at 45° 15. English only 16. Views separated 17. Front page figure selected 18. ID info in top margin 19. Scale adequate 20. Output: PDF vector or TIFF 300DPI.\n\n' +
    'COMMON OBJECTIONS (PTO-948): Lines too light → min 0.3mm. Missing lead lines → verify all refs. Excessive text → minimize. Wrong margins → use template. Unlabeled figures → add FIG. X. Color without petition → convert B&W. Ref chars too small → min 10pt. Crossing lead lines → reposition. Frames → remove.\n\n' +
    'FILING FORMATS: PDF vector (preferred), PDF raster ≥300DPI, TIFF 300DPI B&W Group 4, avoid JPEG. Replacement sheets: per §1.121(d), annotated + clean + explanation. No new matter (35 U.S.C. §132).'
};


// ═══════════════════════════════════════════════════════════════════════════════
// SKILL: PORTFOLIO VALUATION & FILING STRATEGY (Block S5)
// Source: portfolio-valuation-filing-strategy.skill
// Consumed by: WF2 Step 6 (Filing Strategy), WF4 Step 6, Investor Module
// ═══════════════════════════════════════════════════════════════════════════════

window.SKILL_VALUATION_FILING = {
  id: 'valuation-filing',
  version: '1.0',
  source: 'portfolio-valuation-filing-strategy.skill',
  lastUpdated: '2026-03-07',
  workflows: ['wf2', 'wf4'],
  steps: ['wsd-6', 'wsd-9', 'wsd-10'],

  systemPrompt:
    '=== PORTFOLIO VALUATION & FILING STRATEGY SKILL ===\n\n' +
    'TAM/SAM/SOM FOR DEEP-TECH PATENTS:\n' +
    'TAM = Total revenue of infringing products × industry royalty rate. SAM = TAM × geographic coverage × TRL-adjusted adoption probability × time-to-market discount. SOM = SAM × licensing success rate × portfolio strength multiplier × enforcement credibility.\n' +
    'Royalty benchmarks: Semiconductors 1.0-3.5%, Battery/Energy 2.0-5.0%, Advanced Materials 2.5-6.0%, Software/AI 0.5-2.5%, Biotech/SynBio 3.0-8.0%, Quantum 3.0-7.0%, Photonics 1.5-4.0%, Robotics 1.0-3.0%.\n' +
    'TRL discount: TRL 1-3 → 0.05-0.15, TRL 4-5 → 0.15-0.35, TRL 6-7 → 0.35-0.60, TRL 8-9 → 0.60-0.90.\n\n' +
    'PORTFOLIO VALUATION (triangulate all three approaches):\n' +
    'Income Approach (primary): NPV = Σ(t=1→20) [Annual_Royalties(t) / (1+r)^t]. S-curve ramp: years 1-3 minimal, 4-8 growth, 9-15 plateau, 16-20 decline. Discount rate 15-25%. Enforcement probability 0.3-0.7.\n' +
    'Market Approach: Comparable_Value = Median(Transaction_Price/Patent_Count) × Our_Count × (Our_CII / Median_CII). Sources: IFI CLAIMS, RPX, M&A disclosures. Flag as low-confidence if <5 comparables.\n' +
    'Cost Approach (floor): Replacement_Cost = Σ(Filing + Prosecution + R&D_Attribution) × Obsolescence_Factor.\n' +
    'Triangulation: low = max(Cost, Income_Low), mid = Income_Mid×0.50 + Market×0.30 + Cost×0.20, high = min(Income_High, Market_High×1.5). Always report range + confidence + assumptions.\n\n' +
    'FILING PHASE ASSIGNMENT:\n' +
    'Phase 1 (file immediately): CII ≥0.65 AND FTO ≤MEDIUM AND Pat Score ≥7.5 AND TAM ≥$80M. OR: competitor filing in CPC subclass within 6 months, standards body activity, active acquisition interest.\n' +
    'Phase 2 (defer): CII 0.55-0.64, or FTO HIGH (needs design-around), or Pat Score 6.0-7.4, or TAM <$80M but strategic value.\n' +
    'No-File: CII <0.55 AND TAM <$50M AND no blocking value, or FTO HIGH with no design-around, or all claims anticipated.\n\n' +
    'PROVISIONAL → PCT → NATIONAL PHASE:\n' +
    'Month 0: Provisional filed (priority date). Month 10: Decision gate. Month 12: PCT filed. Month 18: PCT publication. Month 22: Preliminary exam. Month 30: National phase deadline.\n' +
    'Path selection: ≥3 jurisdictions → PCT. US-only → direct non-provisional. Urgent → accelerated PCT. Uncertain value → wait 11 months. Budget-constrained → provisional only.\n' +
    'Jurisdiction priority = (Market_Size × Royalty_Rate × Enforcement_Strength) / (Filing_Cost + 10yr_Maintenance).\n\n' +
    'CONTINUATION CASCADE:\n' +
    'Continuation: new claims, same spec. CIP: new claims + new matter. Divisional: restriction requirement. High-value (CII ≥0.70): Provisional → Non-provisional/PCT → Continuation (competitor targeting) + Continuation (manufacturing) + Divisional (if restricted) → CIP (with new data). Budget: CII ≥0.70 → 1.5-2.0× initial cost. CII 0.60-0.69 → 0.75-1.0×. CII <0.60 → no continuations unless blocking.\n\n' +
    'REVENUE PROJECTION (10-YEAR):\n' +
    'Year 1-2: $0 (filing+prosecution). Year 3-4: 5-15% of SOM×rate. Year 5-7: 30-60%. Year 8-10: 50-80%. Streams: Royalty licensing 40-60%, Lump-sum 15-25%, Litigation settlements 10-20%, Cross-licensing value 5-15%. Model three scenarios (Conservative/Base/Optimistic) varying royalty ±1%, adoption ±2yr, licensing success ±20%, enforcement ±0.15.\n\n' +
    'JURISDICTION COSTS (10-YEAR TOTAL):\n' +
    'USPTO: $13K-$28K, STRONG enforcement. EPO (DE+FR+GB): $27K-$55K, STRONG (UPC). CNIPA: $7K-$14K, MODERATE. JPO: $11K-$22K, STRONG. KIPO: $7K-$14K, MOD-STRONG.\n' +
    'Tiers: Tier 1 (always) = US. Tier 2 (TAM>$100M) = EP, CN. Tier 3 (TAM>$200M) = JP, KR. Tier 4 (selective) = IN, TW, AU, CA, IL.\n' +
    'Selection weights: Market revenue 0.30, Competitor presence 0.20, Enforcement reliability 0.20, Cost efficiency 0.15, Strategic value 0.15.'
};


// ═══════════════════════════════════════════════════════════════════════════════
// SKILL REGISTRY — Routes workflow steps to the correct skill(s)
// The auto-injection wrapper in admin/index.html uses this to select which
// skill blocks to include as cached system content for each API call.
// ═══════════════════════════════════════════════════════════════════════════════

window.SKILL_REGISTRY = {
  version: '1.0',
  skills: {
    'uspto-drafting':    function() { return window.PATENTIFY_USPTO_SKILL; },
    'ci-fto':            function() { return window.SKILL_CI_FTO; },
    'compliance-audit':  function() { return window.SKILL_COMPLIANCE_AUDIT; },
    'patent-figures':    function() { return window.SKILL_PATENT_FIGURES; },
    'valuation-filing':  function() { return window.SKILL_VALUATION_FILING; }
  },
  stepSkills: {
    // WF1 — Patent Pipeline
    'idea':            ['uspto-drafting'],
    'fto':             ['ci-fto'],
    'claims':          ['uspto-drafting'],
    'figures':         ['patent-figures'],
    'draft':           ['uspto-drafting'],
    'lawyer-review':   ['compliance-audit'],
    'admin-approval':  ['compliance-audit'],
    // WF2 — Whitespace Discovery
    'wsd-1':  [],
    'wsd-2':  ['ci-fto'],
    'wsd-3':  [],
    'wsd-4':  ['patent-figures', 'uspto-drafting'],
    'wsd-5':  ['ci-fto'],
    'wsd-6':  ['valuation-filing'],
    'wsd-7':  ['ci-fto'],
    'wsd-8':  ['compliance-audit'],
    'wsd-9':  ['valuation-filing'],
    'wsd-10': ['valuation-filing'],
    // WF4 — CII Training
    'wf4-step6': ['valuation-filing']
  },
  resolve: function(step, workflow) {
    var skillIds = this.stepSkills[step];
    if (!skillIds) {
      if (workflow === 'wf1') skillIds = ['uspto-drafting'];
      else skillIds = [];
    }
    var resolved = [];
    for (var i = 0; i < skillIds.length; i++) {
      var getter = this.skills[skillIds[i]];
      if (getter) {
        var skill = getter();
        if (skill && skill.systemPrompt) resolved.push(skill);
      }
    }
    return resolved;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL WHITESPACE DATA CONTRACT v1.0
// All modules MUST reference these canonical identifiers and names.
// Source of truth: Patent Lab (patent_data_normalized.json) + CIIS Engine
// ═══════════════════════════════════════════════════════════════════════════════

window.PATENTIFY_CANONICAL = {
  version: '1.0',
  lastUpdated: '2026-03-07',
  taxonomy: '15-domain-deep-tech',
  whitespaces: [
    { wsId: 1,  ideaRange: [1,7],   name: 'Universal Solid-State Electrolyte Interface Engineering',         shortName: 'SSE Interface',         ciisMean: 0.626, patScore: 9.2, tam: '$180M-$350M', cz: 'CZ-1', macroDomain: 'MD-1' },
    { wsId: 2,  ideaRange: [8,14],  name: 'Circular & Earth-Abundant Electronic Materials',                   shortName: 'Circular Materials',    ciisMean: 0.631, patScore: 9.0, tam: '$200M-$400M', cz: 'CZ-9', macroDomain: 'MD-1' },
    { wsId: 3,  ideaRange: [15,21], name: 'Neuromorphic Computing Substrate & Architecture IP',               shortName: 'Neuromorphic',          ciisMean: 0.685, patScore: 8.8, tam: '$150M-$300M', cz: 'CZ-3', macroDomain: 'MD-8' },
    { wsId: 4,  ideaRange: [22,28], name: 'Cell-Free Biomanufacturing Process Platforms',                     shortName: 'Cell-Free Biomanuf.',   ciisMean: 0.657, patScore: 8.6, tam: '$120M-$250M', cz: 'CZ-4', macroDomain: 'MD-3' },
    { wsId: 5,  ideaRange: [29,35], name: 'Universal Thermal Interface Materials',                            shortName: 'Universal TIMs',        ciisMean: 0.649, patScore: 8.5, tam: '$100M-$220M', cz: 'CZ-5', macroDomain: 'MD-5' },
    { wsId: 6,  ideaRange: [36,42], name: 'Quantum Error Correction Hardware Primitives',                     shortName: 'QEC Hardware',          ciisMean: 0.666, patScore: 8.4, tam: '$130M-$280M', cz: 'CZ-6', macroDomain: 'MD-6' },
    { wsId: 7,  ideaRange: [43,49], name: 'Multi-Material Additive Manufacturing Process Control',            shortName: 'Multi-Mat. AM',         ciisMean: 0.687, patScore: 8.3, tam: '$110M-$240M', cz: 'CZ-7', macroDomain: 'MD-7' },
    { wsId: 8,  ideaRange: [50,56], name: 'Federated Learning & Privacy-Preserving Edge AI',                  shortName: 'Federated Edge AI',     ciisMean: 0.701, patScore: 8.1, tam: '$100M-$200M', cz: 'CZ-3', macroDomain: 'MD-8' },
    { wsId: 9,  ideaRange: [57,63], name: 'Cryogenic Control Electronics for Quantum Processors',             shortName: 'Cryo Control',          ciisMean: 0.659, patScore: 8.0, tam: '$90M-$190M',  cz: 'CZ-6', macroDomain: 'MD-6' },
    { wsId: 10, ideaRange: [64,70], name: 'Bio-Electronic Neural Interfaces (Non-Implantable)',               shortName: 'Neural Interfaces',     ciisMean: 0.654, patScore: 7.9, tam: '$80M-$180M',  cz: 'CZ-8', macroDomain: 'MD-3' },
    { wsId: 11, ideaRange: [71,77], name: 'Autonomous System Safety Verification',                            shortName: 'Safety Verification',   ciisMean: 0.685, patScore: 7.8, tam: '$70M-$160M',  cz: 'CZ-7', macroDomain: 'MD-4' },
    { wsId: 12, ideaRange: [78,84], name: 'Wide-Bandgap Semiconductor Packaging',                             shortName: 'WBG Packaging',         ciisMean: 0.599, patScore: 7.7, tam: '$75M-$170M',  cz: 'CZ-5', macroDomain: 'MD-2' },
    { wsId: 13, ideaRange: [85,91], name: 'Synthetic Biology Materials Discovery Pipeline',                   shortName: 'SynBio Materials',      ciisMean: 0.638, patScore: 7.6, tam: '$65M-$150M',  cz: 'CZ-4', macroDomain: 'MD-3' },
    { wsId: 14, ideaRange: [92,98], name: 'Photonic Interconnect Standards & Interoperability',               shortName: 'Photonic Interconnect', ciisMean: 0.638, patScore: 7.5, tam: '$85M-$190M',  cz: 'CZ-2', macroDomain: 'MD-2' },
    { wsId: 15, ideaRange: [99,105],name: 'Quantum-Safe Cryptographic Hardware Accelerators',                 shortName: 'PQC Hardware',          ciisMean: 0.665, patScore: 7.4, tam: '$60M-$140M',  cz: 'CZ-6', macroDomain: 'MD-6' }
  ],
  totalIdeas: 105,
  ideasPerWhitespace: 7,
  scoringSystems: {
    patentability: { source: 'Patent Lab', scale: '0-10', measures: 'novelty, non-obviousness, enablement, prior art distance' },
    ciis: { source: 'CIIS Engine', scale: '0-1', measures: 'network centrality, economic value, legal feasibility, strategic fit' }
  },
  // Strategy Report paradigms are archived reference material, NOT part of the active platform taxonomy
  strategyReportParadigms: {
    status: 'ARCHIVED',
    note: 'These 5 AI-science paradigms from the IP Whitespace Dominance Strategy Report v2.0 are complementary research references. They are NOT active whitespace domains and have no linked patent ideas or CIIS scores.',
    paradigms: ['De Novo Protein Design', 'Post-Lithium Materials Discovery', 'Plasma Physics RL Control', 'Mathematically Verified Software', 'PINN Earth Sciences']
  }
};
