// ctrl_prompt.js — Controller Prompt Picker System
// Extracted ES module. State is exported as live bindings for the gamepad polling loop.
import { createIcon } from './icons.js';

// Shared overlay state (live-exported so pollGamepads can read current values)
let ctrlPromptVisible = false;
let ctrlPromptTemplateMode = false;


// Category color map — used by all color-coding logic
const CAT_COLORS = {
    all:       "#a0a8b8",
    quick:     "#FFD600",
    code:      "#00E676",
    analysis:  "#29B6F6",
    creative:  "#F06292",
    technical: "#FF7043",
    roleplay:  "#AB47BC",
    custom:    "#00E5FF",
};

const CTRL_PROMPT_CATS = [
    { id: "quick",     icon: "zap",         label: "Quick",     color: CAT_COLORS.quick     },
    { id: "code",      icon: "squareTerminal", label: "Code",      color: CAT_COLORS.code      },
    { id: "analysis",  icon: "search",      label: "Analysis",  color: CAT_COLORS.analysis  },
    { id: "creative",  icon: "sparkles",    label: "Creative",  color: CAT_COLORS.creative  },
    { id: "technical", icon: "settings2",   label: "Technical", color: CAT_COLORS.technical },
    { id: "roleplay",  icon: "messageSquare", label: "Roleplay",  color: CAT_COLORS.roleplay  },
    { id: "custom",    icon: "plusCircle",  label: "Custom",    color: CAT_COLORS.custom    },
];

const CTRL_PROMPT_ICON_ALIASES = {
    "⚡": "zap",
    "💻": "squareTerminal",
    "🔍": "search",
    "🎨": "sparkles",
    "⚙️": "settings2",
    "🎭": "messageSquare",
    "⭐": "plusCircle",
    "📝": "fileText",
};

function resolveCtrlPromptIcon(value) {
    return CTRL_PROMPT_ICON_ALIASES[value] || value || "fileText";
}

const CTRL_PROMPT_LIBRARY = [
    // ── Quick ──────────────────────────────────────────────────────────────────
    {
        id: "q1", cat: "quick", icon: "⚡", title: "Explain This",
        text: "Explain this in simple terms: [TOPIC]",
        tags: ["explain","simple","eli5"],
        desc: "Strips jargon and forces a plain-language breakdown. Ideal when you hit an unfamiliar concept, error message, or wall of documentation.",
        fields: { TOPIC: "The subject to explain. The more specific you are — 'JWT refresh token rotation' vs 'auth' — the more precise and useful the output. You can also paste raw error text or a paragraph of docs." },
        tips: ["Add 'like I'm 12' at the end for maximum simplicity", "Works on error messages, algorithm names, and documentation extracts", "Pair with a code block inside TOPIC for instant line-by-line walkthroughs"],
    },
    {
        id: "q2", cat: "quick", icon: "⚡", title: "Fix This Bug",
        text: "Find and fix the bug in this code:\n\n[CODE]",
        tags: ["bug","fix","debug"],
        desc: "Diagnose and repair broken code in one shot. The directive is intentionally open-ended — the AI scans for logic errors, off-by-ones, null refs, and type mismatches simultaneously.",
        fields: { CODE: "Paste the minimal reproducible snippet. Include the function signature and any relevant imports. The smaller and more isolated the code, the more accurate the fix." },
        tips: ["Include the error message as a comment above the code for faster diagnosis", "If the bug is intermittent, describe the condition that triggers it", "Ask for an explanation of why it broke, not just the fix"],
    },
    {
        id: "q3", cat: "quick", icon: "⚡", title: "Summarise",
        text: "Summarise the following in 3 bullet points:\n\n[TEXT]",
        tags: ["summary","tldr","bullets"],
        desc: "Forces the AI to distil any wall of text into its three most important statements. The bullet constraint prevents padding and makes the output scannable.",
        fields: { TEXT: "Any text: article, PR description, meeting notes, README, log output. Longer inputs produce better summaries than short ones because the compression ratio reveals what truly matters." },
        tips: ["Change '3' to a higher number for more detail", "Works on git diffs — paste the diff output directly", "Add 'for a non-technical audience' to strip implementation details"],
    },
    {
        id: "q4", cat: "quick", icon: "⚡", title: "What's Wrong?",
        text: "What's wrong with this? Give a direct answer:\n\n[CONTENT]",
        tags: ["review","problem","critique"],
        desc: "'Give a direct answer' suppresses the AI's tendency to hedge with 'It depends' or enumerate every possible issue. You get the most likely root cause first.",
        fields: { CONTENT: "Paste anything: code, a config file, a written paragraph, a plan, a diagram description. The AI will identify the single most impactful problem without being asked for a full audit." },
        tips: ["Great as a fast sanity check before a code review", "Works on written plans, not just code — useful for logic gaps in specs", "Follow up with 'And what else?' to get the next highest-impact issue"],
    },
    {
        id: "q5", cat: "quick", icon: "⚡", title: "Continue Writing",
        text: "Continue writing from where this left off, matching the tone exactly:\n\n[TEXT]",
        tags: ["continue","writing","generate"],
        desc: "'Matching the tone exactly' anchors the model's style to yours — it reads voice, formality level, sentence rhythm, and vocabulary register before generating.",
        fields: { TEXT: "Any text that ends mid-thought. The last 2–3 sentences carry the most tonal weight. Including them gives the model enough context to continue seamlessly." },
        tips: ["Works for code comments, fiction, documentation, and emails", "For code: end your text mid-function to have the implementation completed", "If the continuation drifts, prepend 'Do not change style:' to the prompt"],
    },
    // ── Code ───────────────────────────────────────────────────────────────────
    {
        id: "c1", cat: "code", icon: "💻", title: "Review Code",
        text: "Review this [LANGUAGE] code for bugs, performance issues, and security vulnerabilities. Be concise:\n\n[CODE]",
        tags: ["review","security","performance"],
        desc: "A three-axis review (bugs, performance, security) with a 'be concise' constraint. Without that constraint, the AI pads the output with obvious observations. The language declaration tells it which idioms and common pitfalls to check.",
        fields: {
            LANGUAGE: "The programming language. This matters — 'Python' checks for GIL issues and mutable defaults; 'Rust' checks for ownership and unsafe blocks; 'JavaScript' checks for prototype pollution and async pitfalls.",
            CODE: "The code to audit. For large files, paste only the function or module you care most about. A focused review is more actionable than a shallow pass over 500 lines.",
        },
        tips: ["Run this before every PR for a fast pre-flight check", "Append 'Focus only on security' to narrow the scope", "Paste the function signature + body only — avoid entire files"],
    },
    {
        id: "c2", cat: "code", icon: "💻", title: "Refactor",
        text: "Refactor this code to be cleaner and more maintainable. Keep the same logic:\n\n[CODE]",
        tags: ["refactor","clean","maintainable"],
        desc: "'Keep the same logic' is the critical guard — without it the AI sometimes changes behaviour in pursuit of elegance. The model will rename variables, extract functions, remove duplication, and improve readability.",
        fields: { CODE: "The code to clean up. Works best on functions that have grown organically over time — long conditionals, deeply nested loops, magic numbers, and copy-pasted blocks are prime targets." },
        tips: ["Add 'Do not extract helper functions' if you want inline refactoring only", "Ask it to explain each change it made for a learning opportunity", "Great for legacy code you inherited — pair with the Review Code prompt first"],
    },
    {
        id: "c3", cat: "code", icon: "💻", title: "Write Tests",
        text: "Write comprehensive unit tests for this [LANGUAGE] function:\n\n[CODE]",
        tags: ["tests","unit","tdd"],
        desc: "'Comprehensive' signals the AI to cover happy path, edge cases, boundary values, and error paths — not just the obvious cases. The language declaration picks the right testing framework (pytest, Jest, go test, etc.).",
        fields: {
            LANGUAGE: "Determines the test framework used. 'Python' → pytest fixtures; 'TypeScript' → Jest/Vitest with describe/it blocks; 'Rust' → #[cfg(test)] modules. Be specific.",
            CODE: "The function under test. Include its signature, parameters, and return type. If it has external dependencies, paste the interface too so the AI can mock them correctly.",
        },
        tips: ["Append 'Use table-driven tests' for languages like Go to get compact parametrised coverage", "Ask for 'mutation testing hints' to surface what assertions are missing", "Pair with Review Code to fix issues before writing tests"],
    },
    {
        id: "c4", cat: "code", icon: "💻", title: "Explain Algorithm",
        text: "Explain how this algorithm works step by step, then analyse its time and space complexity:\n\n[CODE]",
        tags: ["algorithm","complexity","explain"],
        desc: "Two-part prompt: the step-by-step walkthrough builds intuition, then the Big-O analysis grounds it in theory. This structure forces the AI to explain the 'why' before the 'how fast'.",
        fields: { CODE: "Any algorithmic function — sorting, searching, graph traversal, DP, etc. Recursive algorithms especially benefit from the step-by-step tracing. Include sample input in a comment for concrete examples." },
        tips: ["Add 'Trace through this input: [value]' for a concrete dry-run example", "Ask for 'the best and worst case separately' for algorithms with variable performance", "Great for interview prep — follow up with 'How would you optimise this?'"],
    },
    {
        id: "c5", cat: "code", icon: "💻", title: "Convert Language",
        text: "Convert this code from [FROM_LANG] to [TO_LANG], maintaining all logic:\n\n[CODE]",
        tags: ["convert","translate","port"],
        desc: "'Maintaining all logic' prevents the AI from simplifying or restructuring during translation, which can silently drop edge case handling. You get an idiomatic equivalent, not a literal transliteration.",
        fields: {
            FROM_LANG: "The source language. Including the version helps: 'Python 2' vs 'Python 3' produces very different output for IO and string handling.",
            TO_LANG: "The target language. The AI will use idiomatic patterns — e.g. converting Python list comprehensions to Go range loops, not verbose for-loops.",
            CODE: "The source code to port. Self-contained functions translate best. Avoid pasting code with framework-specific imports unless you also specify the target framework.",
        },
        tips: ["Append 'and flag any idioms that don't have a direct equivalent' to catch translation losses", "For compiled languages, ask it to also provide a compilation command", "Follow up with 'Write tests for the converted code' to verify correctness"],
    },
    {
        id: "c6", cat: "code", icon: "💻", title: "Add Error Handling",
        text: "Add robust error handling to this code without changing core logic:\n\n[CODE]",
        tags: ["errors","robust","handling"],
        desc: "'Without changing core logic' is the guard that stops the AI from refactoring everything. It will add try/catch, error propagation, input validation, and meaningful error messages while keeping the happy path identical.",
        fields: { CODE: "Functions that currently assume all inputs are valid and all operations succeed. Network calls, file I/O, parsing functions, and database queries benefit most from this treatment." },
        tips: ["Append 'Use the Result/Either pattern' for functional-style error handling in supported languages", "Ask for 'user-facing error messages' separately from internal error logging", "Follow up with 'Write tests for the error paths' to ensure the handling actually works"],
    },
    {
        id: "c7", cat: "code", icon: "💻", title: "Optimise",
        text: "Optimise this code for maximum performance. Explain each change:\n\n[CODE]",
        tags: ["optimise","performance","speed"],
        desc: "'Explain each change' is essential — without it you get faster code you can't maintain or debug. The AI will target algorithmic complexity first, then memory allocation, then micro-optimisations.",
        fields: { CODE: "Performance-sensitive code — hot paths, inner loops, data processing pipelines, or functions called thousands of times. Include comments about what the bottleneck symptoms are if you know them." },
        tips: ["Specify the bottleneck dimension: 'optimise for latency' vs 'optimise for memory' vs 'optimise for throughput'", "Append 'Do not change the public interface' to keep callers intact", "Profile before optimising — paste benchmark results so the AI targets the right function"],
    },
    {
        id: "c8", cat: "code", icon: "💻", title: "Document",
        text: "Write clear documentation and inline comments for this [LANGUAGE] code:\n\n[CODE]",
        tags: ["docs","comments","documentation"],
        desc: "Generates both docstrings (function-level) and inline comments (logic-level). The language declaration ensures the right documentation format: JSDoc, rustdoc, Python docstrings, Go doc comments, etc.",
        fields: {
            LANGUAGE: "Picks the documentation format: 'TypeScript' → JSDoc with @param/@returns; 'Python' → Google-style or NumPy docstrings; 'Rust' → /// rustdoc comments with # Examples sections.",
            CODE: "The code to document. Prioritise public APIs, complex algorithms, and non-obvious logic. Simple getter/setter functions rarely need inline comments.",
        },
        tips: ["Append 'Include a usage example in each docstring' for developer-facing APIs", "Ask for 'README-style documentation' separately from inline comments for open-source projects", "Specify 'terse comments only — no stating the obvious' to avoid comment noise"],
    },
    // ── Analysis ───────────────────────────────────────────────────────────────
    {
        id: "a1", cat: "analysis", icon: "🔍", title: "Break It Down",
        text: "Break this down into its core components and explain each one:\n\n[TOPIC]",
        tags: ["breakdown","components","analyse"],
        desc: "Forces decomposition before explanation. The AI identifies the constituent parts first, then explains each in isolation — much more useful than a monolithic overview that conflates everything.",
        fields: { TOPIC: "Any complex subject: a system architecture, a business concept, a technical protocol, an algorithm, or a framework. Paste a block of text or just name the topic — both work." },
        tips: ["Append 'and how each component interacts with the others' to get the integration map too", "Great for onboarding onto unfamiliar codebases — paste a module list or file tree", "Follow up with 'Which component is the most critical single point of failure?' for risk analysis"],
    },
    {
        id: "a2", cat: "analysis", icon: "🔍", title: "Pros & Cons",
        text: "List the pros and cons of [TOPIC]. Be balanced and thorough.",
        tags: ["pros","cons","comparison"],
        desc: "'Be balanced and thorough' suppresses the AI's tendency to lean toward whichever option it was last trained to favour. You get a genuine adversarial listing, not a subtle endorsement.",
        fields: { TOPIC: "A technology, architectural decision, business strategy, or any binary-ish choice. Include context ('for a team of 3 building a real-time app') to get contextualised trade-offs rather than abstract ones." },
        tips: ["Add 'in the context of [your situation]' to get relevant trade-offs, not generic ones", "Ask for 'the one pro and one con that matter most' for a quick decision shortcut", "Pair with Compare Options when evaluating two specific alternatives head-to-head"],
    },
    {
        id: "a3", cat: "analysis", icon: "🔍", title: "Root Cause",
        text: "Perform a root cause analysis on this problem:\n\n[PROBLEM]",
        tags: ["root","cause","problem","diagnosis"],
        desc: "Applies the 5-Whys methodology implicitly — the AI drills past symptoms to underlying causes. 'Root cause analysis' as a named methodology prompts structured reasoning rather than a surface-level guess.",
        fields: { PROBLEM: "Describe the observed symptom AND the context: when it happens, what changed recently, what you've already tried. The more operational context you provide, the deeper the AI can drill." },
        tips: ["Append 'Give me the top 3 most likely root causes ranked by probability' for a prioritised list", "Include error logs, metric graphs descriptions, or timeline of events for richer analysis", "Follow up with 'For each cause, what is the fastest way to confirm or rule it out?' to get a triage plan"],
    },
    {
        id: "a4", cat: "analysis", icon: "🔍", title: "Compare Options",
        text: "Compare [OPTION_A] vs [OPTION_B] across these dimensions: performance, cost, maintainability, scalability.",
        tags: ["compare","versus","options"],
        desc: "The four dimensions (performance, cost, maintainability, scalability) are the most universally relevant for technical decisions. Naming them forces the AI to structure the output as a matrix rather than a narrative.",
        fields: {
            OPTION_A: "First option to compare. Be specific — 'PostgreSQL' beats 'a relational database'. The more precise the name, the more accurate the trade-off analysis.",
            OPTION_B: "Second option to compare. Ideally a direct alternative to OPTION_A at the same abstraction level — don't compare a language to a framework.",
        },
        tips: ["Add more dimensions: 'also compare on: learning curve, ecosystem maturity, vendor lock-in'", "Append 'For a startup with 2 engineers and 10k MAU' to get context-specific recommendations", "Follow up with 'Which would you recommend and why?' for a decisive conclusion"],
    },
    {
        id: "a5", cat: "analysis", icon: "🔍", title: "Security Audit",
        text: "Perform a security audit on this. Identify threat vectors, vulnerabilities, and recommended mitigations:\n\n[CONTENT]",
        tags: ["security","audit","threats","vulnerabilities"],
        desc: "Three-part structure: threat vectors (attack surfaces), vulnerabilities (exploitable weaknesses), mitigations (concrete fixes). This mirrors OWASP methodology and produces actionable output, not vague warnings.",
        fields: { CONTENT: "Code, architecture description, API spec, config file, or infrastructure diagram. Include auth flows, data flows, and trust boundaries explicitly — they're where most vulnerabilities live." },
        tips: ["Append 'Use OWASP Top 10 as the evaluation framework' for standardised output", "Ask for severity ratings (Critical/High/Medium/Low) for each finding", "Follow up with 'Write the unit tests that would catch these vulnerabilities'"],
    },
    {
        id: "a6", cat: "analysis", icon: "🔍", title: "Architecture Review",
        text: "Review this architecture. Identify bottlenecks, single points of failure, and scalability concerns:\n\n[DESCRIPTION]",
        tags: ["architecture","review","scalability"],
        desc: "Three lenses: bottlenecks (throughput constraints), SPOFs (availability risks), and scalability (what breaks at 10× load). Naming all three forces a systematic scan rather than ad-hoc criticism.",
        fields: { DESCRIPTION: "Describe the system: components, how they connect, data flows, and expected load characteristics. A numbered component list works well. Include current pain points if any — they often point directly to the architecture's weaknesses." },
        tips: ["Append 'Assume we need to handle 10x current load within 6 months' to get forward-looking feedback", "Ask for 'the single most impactful change' first, then iterate", "Include deployment topology (cloud provider, region count, CDN usage) for infrastructure-specific advice"],
    },
    // ── Creative ───────────────────────────────────────────────────────────────
    {
        id: "cr1", cat: "creative", icon: "🎨", title: "Write a Story",
        text: "Write a short [GENRE] story about [CHARACTER] who must [CHALLENGE]. Make it compelling.",
        tags: ["story","fiction","narrative"],
        desc: "Three-anchor story structure: genre (aesthetic + rules), character (empathy hook), challenge (dramatic engine). 'Make it compelling' suppresses generic outputs and prompts narrative tension.",
        fields: {
            GENRE: "Sets the aesthetic rules and reader expectations — 'cyberpunk' implies neon, corporate dystopia, and hacking; 'cozy mystery' implies small town, amateur sleuth, and gentle stakes. Be specific for tighter output.",
            CHARACTER: "The protagonist. Give them a defining trait or contradiction: 'a retired assassin who can't stop helping people'. One-dimensional characters produce flat stories.",
            CHALLENGE: "The dramatic engine — what the character must overcome. 'Stop a server from going down' is more specific and interesting than 'solve a problem'. Include stakes if possible.",
        },
        tips: ["Add 'in 500 words' for a short-form output suitable for sharing", "Ask for the story 'in the style of [author]' to match a specific voice", "Follow up with 'Write the next scene' to extend the story iteratively"],
    },
    {
        id: "cr2", cat: "creative", icon: "🎨", title: "Brainstorm Ideas",
        text: "Brainstorm 10 creative ideas for [TOPIC]. Be original and think outside the box.",
        tags: ["brainstorm","ideas","creative"],
        desc: "'Think outside the box' is a genuine signal to the model to avoid its first-order associations. Asking for 10 specifically forces it past the obvious 3–4 ideas into territory it wouldn't otherwise explore.",
        fields: { TOPIC: "The domain to brainstorm in. The more constrained your topic, the more creative the ideas — 'marketing for a solo developer B2B SaaS' produces better ideas than 'marketing ideas'." },
        tips: ["Ask for ideas across multiple dimensions: 'include 3 low-cost, 3 high-impact, and 4 wild-card ideas'", "Follow up with 'Take idea #5 and expand it into a full plan'", "Append 'that no one has tried before in this space' to maximally suppress generic suggestions"],
    },
    {
        id: "cr3", cat: "creative", icon: "🎨", title: "Write Marketing Copy",
        text: "Write compelling marketing copy for [PRODUCT]. Target audience: [AUDIENCE]. Tone: [TONE].",
        tags: ["marketing","copy","persuasive"],
        desc: "Three variables that determine copy quality: the product (what value is being sold), the audience (who is being persuaded and what they care about), and the tone (the emotional register). All three are required for non-generic output.",
        fields: {
            PRODUCT: "The product or feature being marketed. Include the core value proposition in 1 sentence: 'A terminal app for Steam Deck that lets you chat with AI while gaming'.",
            AUDIENCE: "Who the copy is written for. The more specific the better: 'solo indie hackers who ship fast and hate marketing' hits harder than 'developers'.",
            TONE: "The emotional register: 'bold and irreverent', 'professional and trust-building', 'playful and enthusiastic', 'minimal and factual'. This shapes vocabulary and sentence structure.",
        },
        tips: ["Ask for multiple variations: 'Write 3 versions with different hooks'", "Append 'Include a clear CTA' to ensure the copy drives action", "Ask for a tagline, a tweet, and a landing page paragraph as separate deliverables"],
    },
    {
        id: "cr4", cat: "creative", icon: "🎨", title: "Improve Writing",
        text: "Improve this writing. Make it more engaging, clear, and impactful. Keep the core message:\n\n[TEXT]",
        tags: ["improve","writing","edit","polish"],
        desc: "Three improvement axes: engaging (hooks the reader), clear (removes friction), impactful (makes the point land harder). 'Keep the core message' prevents the AI from rewriting your content into something unrecognisable.",
        fields: { TEXT: "Any writing: email, README intro, pitch paragraph, blog post section, or code comment. The AI improves sentence rhythm, removes filler words, strengthens verbs, and adds clarity without changing your intent." },
        tips: ["Add 'Do not change the first sentence' to preserve your opening hook", "Ask for 'a tracked-changes version' to see exactly what was altered and why", "Follow up with 'Now make it 30% shorter without losing meaning' for tight editing"],
    },
    {
        id: "cr5", cat: "creative", icon: "🎨", title: "Write a Poem",
        text: "Write a [STYLE] poem about [TOPIC]. Make it evocative and memorable.",
        tags: ["poem","poetry","verse"],
        desc: "'Evocative and memorable' signals for concrete imagery and unexpected metaphors, not abstract platitudes. The style declaration sets the formal constraints (meter, rhyme, length) that shape the creative problem.",
        fields: {
            STYLE: "The formal constraint: 'haiku' (17 syllables, seasonal reference), 'Shakespearean sonnet' (14 lines, ABAB rhyme), 'free verse' (no formal constraints), 'limerick' (humorous AABBA). Form shapes meaning.",
            TOPIC: "The subject or emotion. Abstract topics work well in poetry: 'the frustration of a bug you can't find', 'the feeling of a clean git history'. Specificity creates universality in poetry.",
        },
        tips: ["Ask for an annotation explaining the imagery choices for a learning exercise", "Request 'a title that isn't obvious from the content' for more sophisticated output", "Append 'Do not use clichés' to push past 'time flies' and 'broken wings'"],
    },
    // ── Technical ─────────────────────────────────────────────────────────────
    {
        id: "t1", cat: "technical", icon: "⚙️", title: "Design System",
        text: "Design a system architecture for [SYSTEM]. Include components, data flow, and tech stack recommendations.",
        tags: ["architecture","design","system"],
        desc: "Three mandatory outputs — components, data flow, and stack — force a complete architectural blueprint rather than a high-level hand-wave. 'Recommendations' signals the AI to justify its choices.",
        fields: { SYSTEM: "What you're building: include scale expectations, team size, and key constraints (latency requirements, budget, existing stack). 'Real-time collaborative editor for 10k concurrent users, team of 2' produces a targeted design.' " },
        tips: ["Append 'Focus on what a single developer could build in 3 months' for realistic scoping", "Ask for 'the MVP version and the v2 version separately'", "Request a numbered component list first, then expand each one individually"],
    },
    {
        id: "t2", cat: "technical", icon: "⚙️", title: "API Design",
        text: "Design a RESTful API for [SERVICE]. Include endpoints, request/response schemas, and auth strategy.",
        tags: ["api","rest","endpoints","design"],
        desc: "Forces three API design fundamentals in one pass: resource endpoints (what you can do), schemas (what data flows), and auth (how access is controlled). Omitting any one produces an incomplete design.",
        fields: { SERVICE: "The service the API exposes. Be specific about the entities involved: 'A task management service with users, projects, and tasks. Tasks can have subtasks and file attachments.' This level of detail drives the schema design." },
        tips: ["Append 'Follow REST best practices including versioning, pagination, and error response format'", "Ask for OpenAPI/Swagger YAML output for immediate tooling compatibility", "Follow up with 'Write the rate limiting strategy and abuse prevention headers'"],
    },
    {
        id: "t3", cat: "technical", icon: "⚙️", title: "Database Schema",
        text: "Design a database schema for [APPLICATION]. Include tables, relationships, indexes, and justify your choices.",
        tags: ["database","schema","sql","design"],
        desc: "'Justify your choices' is the critical instruction — it forces the AI to explain why each index exists, why a join table was chosen over a JSON column, and why normalization decisions were made. This turns output into learning.",
        fields: { APPLICATION: "Describe the application's data model: the entities, their relationships, and the queries you need to optimise for. 'A multi-tenant SaaS where each tenant has users, who create projects, which have tasks with comments and file attachments' gives enough detail." },
        tips: ["Append 'Assume PostgreSQL — use appropriate types including JSONB and arrays where useful'", "Ask for 'the migration SQL to create this schema' for immediate implementation", "Follow up with 'What indexes would I add for the 5 most common query patterns?'"],
    },
    {
        id: "t4", cat: "technical", icon: "⚙️", title: "Deploy Strategy",
        text: "Outline a deployment strategy for [APPLICATION] targeting [ENVIRONMENT]. Include CI/CD, monitoring, and rollback plan.",
        tags: ["deploy","devops","cicd","infrastructure"],
        desc: "Three pillars of safe deployment: CI/CD (how code gets to production), monitoring (how you know it's working), and rollback (how you recover when it's not). This structure mirrors the Accelerate DevOps framework's key metrics.",
        fields: {
            APPLICATION: "What you're deploying: language, framework, stateful components (databases, queues, caches), and approximate traffic. Stateful components dramatically change the deployment strategy.",
            ENVIRONMENT: "The target platform: 'AWS ECS Fargate', 'bare metal Ubuntu VPS', 'Kubernetes on GKE', 'Vercel + PlanetScale'. This determines which services, tools, and patterns are relevant.",
        },
        tips: ["Append 'Optimise for a solo developer — minimise operational overhead'", "Ask for 'the deployment checklist as a numbered runbook'", "Include 'zero-downtime requirement' if your service must stay available during deploys"],
    },
    {
        id: "t5", cat: "technical", icon: "⚙️", title: "Performance Profile",
        text: "Identify performance bottlenecks in this system and suggest concrete optimisations:\n\n[DESCRIPTION]",
        tags: ["performance","bottleneck","profiling"],
        desc: "'Concrete optimisations' filters out generic advice like 'use caching' — the AI must name specific caches, specific query patterns, specific data structures. The description gives it enough context to make targeted recommendations.",
        fields: { DESCRIPTION: "Describe the system's architecture, the observed performance symptoms (p99 latency, throughput limits, memory pressure), and what you've already tried. Include approximate data volumes and request rates — bottleneck analysis is meaningless without scale context." },
        tips: ["Paste actual benchmark numbers or profiler output for the most targeted advice", "Ask for bottlenecks ranked by estimated impact (High/Medium/Low)", "Append 'Suggest what to instrument/measure first to validate each hypothesis'"],
    },
    {
        id: "t6", cat: "technical", icon: "⚙️", title: "Tech Stack Advice",
        text: "Recommend the best tech stack for [PROJECT_TYPE]. Consider: team size [TEAM_SIZE], scale [SCALE], budget constraints.",
        tags: ["stack","technology","recommend"],
        desc: "Three decision variables that dominate stack selection: project type (what you're building), team size (what expertise you have), and scale (what you need to support). Without all three the recommendation is generic.",
        fields: {
            PROJECT_TYPE: "What kind of product: 'real-time collaborative SaaS', 'static marketing site', 'high-throughput data pipeline', 'mobile app with offline support'. The architecture pattern flows from the type.",
            TEAM_SIZE: "Number of engineers and their backgrounds: 'solo TypeScript developer', 'team of 4 with Python/ML background'. Stack complexity must match team capacity to maintain it.",
            SCALE: "Expected user load and data volume: 'MVP for 100 users', '50k DAU with 1TB data', '10M events/day'. Over-engineering for scale you won't reach is as damaging as under-engineering.",
        },
        tips: ["Append 'Bias toward boring technology that is well-understood' for lower operational risk", "Ask for 'what to start with vs what to migrate to at 10x scale' for a growth path", "Include 'No VC funding — bootstrapped' to filter out enterprise-priced solutions"],
    },
    // ── Roleplay ──────────────────────────────────────────────────────────────
    {
        id: "r1", cat: "roleplay", icon: "🎭", title: "Senior Engineer",
        text: "You are a senior software engineer with 15 years of experience. Review my approach and give frank, expert feedback:\n\n[APPROACH]",
        tags: ["senior","engineer","expert","review"],
        desc: "'Frank' and 'expert' are the critical modifiers. Without them the AI hedges, softens every critique, and adds excessive qualifications. '15 years' anchors the persona to battle-tested pragmatism over theoretical idealism.",
        fields: { APPROACH: "Describe your technical plan, design decision, or implementation. Include the trade-offs you already see — the AI's feedback is most valuable when it challenges your assumptions, not just validates your concerns." },
        tips: ["Add 'Do not soften the feedback' for maximum directness", "Ask for 'what the biggest mistake junior engineers make in this situation'", "Follow up with 'What would you do differently and why?'"],
    },
    {
        id: "r2", cat: "roleplay", icon: "🎭", title: "Socratic Teacher",
        text: "You are a Socratic teacher. Guide me to discover the answer through questions. Topic: [TOPIC]",
        tags: ["teacher","socratic","learning","guide"],
        desc: "The Socratic method produces deeper learning than direct explanation — you construct knowledge rather than receive it. The AI asks questions that expose gaps in your understanding and lead you to insight.",
        fields: { TOPIC: "The concept you want to genuinely understand, not just be told about. Works best for foundational topics where you have some intuition but haven't fully grasped the principle: 'how TCP/IP actually works', 'why React re-renders', 'the CAP theorem'." },
        tips: ["This is slow but deep — use it when you want to truly understand something, not when you need a quick answer", "If you get stuck, say 'I don't know' — the AI will adjust its questions rather than just give the answer", "Follow up across multiple sessions to build cumulative understanding"],
    },
    {
        id: "r3", cat: "roleplay", icon: "🎭", title: "Devil's Advocate",
        text: "Play devil's advocate on this position and make the strongest possible counter-argument:\n\n[POSITION]",
        tags: ["devils","advocate","counter","debate"],
        desc: "'Strongest possible' forces the AI to steelman the opposition, not produce a weak counter-argument you can easily dismiss. This is a pre-mortem tool — it stress-tests your position before you commit to it.",
        fields: { POSITION: "A decision, belief, or plan you're about to act on. The more committed you feel, the more valuable this exercise is — it's hardest to find flaws in things you're excited about, which is exactly when you need to look hardest." },
        tips: ["Use this before any major technical decision — architecture choices, tech stack selections, build vs buy", "Follow up with 'Now steelman my original position' to rebuild confidence in the parts that survived scrutiny", "Ask for 'the one counter-argument that would make you reverse the decision'"],
    },
    {
        id: "r4", cat: "roleplay", icon: "🎭", title: "Code Reviewer",
        text: "You are a strict code reviewer. Be direct and critical. Do not soften feedback. Review this:\n\n[CODE]",
        tags: ["review","strict","code","feedback"],
        desc: "The explicit 'Do not soften feedback' instruction overrides the AI's default politeness — you get the same blunt critique a tired senior engineer gives at 5pm on a Friday, which is exactly what you need before a production deploy.",
        fields: { CODE: "The code you're about to merge or ship. The AI reviews for correctness, maintainability, style, naming, error handling, and hidden complexity. Include the PR description or the problem it solves for context." },
        tips: ["Add 'Grade it on a scale of 1–10 and justify the score' for a quantified quality signal", "Ask for 'the one change that would have the highest impact on code quality'", "Follow up with 'Now rewrite the worst function the way you would write it'"],
    },
    {
        id: "r5", cat: "roleplay", icon: "🎭", title: "Product Manager",
        text: "As a product manager, assess this feature request from a user impact and engineering effort perspective:\n\n[FEATURE]",
        tags: ["product","manager","feature","prioritise"],
        desc: "Forces the two-axis PM assessment that determines prioritisation: user impact (how much value this creates) vs engineering effort (how much it costs to build). This surfaces the hidden trade-off in every feature decision.",
        fields: { FEATURE: "The feature request or idea. Include who asked for it, how many users it affects, and what problem it solves. If you have data (support tickets, user research), include it — the AI's impact estimate is only as good as the evidence you provide." },
        tips: ["Add 'Suggest the smallest version of this feature that delivers the core value' for an MVP scoping", "Ask for 'what metric would prove this feature succeeded or failed'", "Follow up with 'What features should we NOT build this sprint?' for prioritisation pressure"],
    },
];

// Usage tracking (weight bumped per selection)
function getCtrlPromptUsage() {
    try { return JSON.parse(localStorage.getItem("ctrlPromptUsage") || "{}"); } catch { return {}; }
}

function bumpCtrlPromptUsage(id) {
    const usage = getCtrlPromptUsage();
    usage[id] = { uses: ((usage[id] && usage[id].uses) || 0) + 1, lastUsed: Date.now() };
    localStorage.setItem("ctrlPromptUsage", JSON.stringify(usage));
}

let ctrlPromptCatIdx = 0;
let ctrlPromptListIdx = 0;
let ctrlPromptFiltered = [];
let ctrlPromptTemplateParts = [];   // [{type:"text"|"placeholder", value, options, optIdx}]
let ctrlPromptPlaceholderIdx = 0;

// Prefix trie filter — returns prompts matching query across title+tags+text
function filterCtrlPrompts(query, catId) {
    const q = query.trim().toLowerCase();
    const usage = getCtrlPromptUsage();
    let pool = (catId === "custom")
        ? getCustomCtrlPrompts()
        : (catId === "all" ? CTRL_PROMPT_LIBRARY : CTRL_PROMPT_LIBRARY.filter(p => p.cat === catId));
    if (q) {
        pool = pool.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.text.toLowerCase().includes(q) ||
            (p.tags && p.tags.some(t => t.includes(q)))
        );
    }
    return pool.slice().sort((a, b) => {
        const ua = (usage[a.id] && usage[a.id].uses) || 0;
        const ub = (usage[b.id] && usage[b.id].uses) || 0;
        return ub - ua;
    });
}

function getCustomCtrlPrompts() {
    try { return JSON.parse(localStorage.getItem("ctrlCustomPrompts") || "[]"); } catch { return []; }
}

// Returns the color hex for a prompt's category
function getCatColor(catId) {
    return CAT_COLORS[catId] || CAT_COLORS.custom;
}

// Render categories sidebar with per-category color coding
function renderCtrlPromptCats() {
    const container = document.getElementById("ctrl-prompt-cats");
    if (!container) return;
    const allCats = [{ id: "all", icon: "fileText", label: "All", color: CAT_COLORS.all }, ...CTRL_PROMPT_CATS];
    container.innerHTML = allCats.map((cat, i) => {
        const count = cat.id === "all"
            ? CTRL_PROMPT_LIBRARY.length + getCustomCtrlPrompts().length
            : cat.id === "custom"
                ? getCustomCtrlPrompts().length
                : CTRL_PROMPT_LIBRARY.filter(p => p.cat === cat.id).length;
        const color = cat.color || CAT_COLORS.custom;
        const isActive = i === ctrlPromptCatIdx;
        const activeStyle = isActive
            ? `border-left-color:${color};color:${color};background:${color}18;`
            : `--cat-hover-color:${color};`;
        return `<button class="ctrl-prompt-cat-btn${isActive ? " active" : ""}" data-catidx="${i}" style="${activeStyle}">
            <span class="ctrl-prompt-cat-icon">${createIcon(resolveCtrlPromptIcon(cat.icon), { size: 16 })}</span>
            <span>${cat.label}</span>
            <span class="ctrl-prompt-cat-count" style="${isActive ? `background:${color}30;color:${color};` : ""}">${count}</span>
        </button>`;
    }).join("");
    container.querySelectorAll(".ctrl-prompt-cat-btn").forEach(btn => {
        const color = allCats[parseInt(btn.dataset.catidx, 10)]?.color || CAT_COLORS.custom;
        btn.addEventListener("mouseenter", () => { if (!btn.classList.contains("active")) { btn.style.color = color; btn.style.borderLeftColor = color; } });
        btn.addEventListener("mouseleave", () => { if (!btn.classList.contains("active")) { btn.style.color = ""; btn.style.borderLeftColor = ""; } });
        btn.addEventListener("click", () => {
            ctrlPromptCatIdx = parseInt(btn.dataset.catidx, 10);
            ctrlPromptListIdx = 0;
            renderCtrlPromptCats();
            renderCtrlPromptList();
        });
    });
}

// Render prompt list for current category + search
function renderCtrlPromptList() {
    const searchEl = document.getElementById("ctrl-prompt-search");
    const query = searchEl ? searchEl.value : "";
    const allCats = [{ id: "all" }, ...CTRL_PROMPT_CATS];
    const catId = allCats[ctrlPromptCatIdx] ? allCats[ctrlPromptCatIdx].id : "all";
    ctrlPromptFiltered = filterCtrlPrompts(query, catId);

    const container = document.getElementById("ctrl-prompt-list");
    if (!container) return;

    if (ctrlPromptFiltered.length === 0) {
        container.innerHTML = `<div class="ctrl-prompt-empty">No prompts found. Type to search all categories.</div>`;
        updateCtrlPromptPreview(null);
        return;
    }

    if (ctrlPromptListIdx >= ctrlPromptFiltered.length) ctrlPromptListIdx = 0;

    const usage = getCtrlPromptUsage();
    const maxUses = Math.max(1, ...Object.values(usage).map(u => u.uses || 0));

    container.innerHTML = ctrlPromptFiltered.map((p, i) => {
        const uses = (usage[p.id] && usage[p.id].uses) || 0;
        const usePct = Math.round((uses / maxUses) * 100);
        const hasTemplate = p.text.includes("[");
        const color = getCatColor(p.cat);
        const isFocused = i === ctrlPromptListIdx;
        const borderStyle = isFocused ? `border-left-color:${color};` : "";
        const iconBg = `background:${color}1a;`;
        return `<div class="ctrl-prompt-row${isFocused ? " focused" : ""}" data-idx="${i}" style="${borderStyle}">
            <div class="ctrl-prompt-row-icon" style="${iconBg}color:${color};">${createIcon(resolveCtrlPromptIcon(p.icon), { size: 18 })}</div>
            <div class="ctrl-prompt-row-content">
                <div class="ctrl-prompt-row-title" style="${isFocused ? `color:${color};` : ""}">${p.title}${hasTemplate ? ` <span class="ctrl-prompt-template-badge" style="background:${color}22;color:${color};">template</span>` : ""}</div>
                <div class="ctrl-prompt-row-text">${p.text.replace(/\n/g, " ").slice(0, 90)}${p.text.length > 90 ? "…" : ""}</div>
            </div>
            <div class="ctrl-prompt-row-meta">
                ${uses > 0 ? `<div class="ctrl-prompt-row-uses">${uses}x</div>` : ""}
                ${uses > 0 ? `<div class="ctrl-prompt-usage-bar"><div class="ctrl-prompt-usage-fill" style="width:${usePct}%;background:${color};"></div></div>` : ""}
                <div class="ctrl-prompt-cat-dot" style="background:${color};" title="${p.cat}"></div>
            </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".ctrl-prompt-row").forEach(row => {
        row.addEventListener("click", () => {
            ctrlPromptListIdx = parseInt(row.dataset.idx, 10);
            updateCtrlPromptPreview(ctrlPromptFiltered[ctrlPromptListIdx]);
            renderCtrlPromptList();
            confirmCtrlPrompt();
        });
        row.addEventListener("mouseenter", () => {
            ctrlPromptListIdx = parseInt(row.dataset.idx, 10);
            updateCtrlPromptPreview(ctrlPromptFiltered[ctrlPromptListIdx]);
            renderCtrlPromptList();
        });
    });

    // Scroll focused row into view
    const focusedRow = container.querySelector(".ctrl-prompt-row.focused");
    if (focusedRow) focusedRow.scrollIntoView({ block: "nearest" });

    updateCtrlPromptPreview(ctrlPromptFiltered[ctrlPromptListIdx]);
}

function updateCtrlPromptPreview(prompt) {
    const footer = document.querySelector(".ctrl-prompt-footer");
    if (!footer) return;
    if (!prompt) {
        footer.innerHTML = `<div class="ctrl-prompt-preview" id="ctrl-prompt-preview">Select a prompt — hover or navigate with the D-pad to see its full tooltip.</div>`;
        return;
    }

    const color = getCatColor(prompt.cat);
    const catLabel = (CTRL_PROMPT_CATS.find(c => c.id === prompt.cat) || {}).label || prompt.cat;

    // Field breakdown rows
    let fieldsHtml = "";
    if (prompt.fields && Object.keys(prompt.fields).length > 0) {
        const rows = Object.entries(prompt.fields).map(([name, explanation]) =>
            `<div class="cpt-field-row">
                <span class="cpt-field-name" style="color:${color};">[${name}]</span>
                <span class="cpt-field-desc">${explanation}</span>
            </div>`
        ).join("");
        fieldsHtml = `<div class="cpt-section-label" style="color:${color};">FIELDS</div><div class="cpt-fields">${rows}</div>`;
    }

    // Tips
    let tipsHtml = "";
    if (prompt.tips && prompt.tips.length > 0) {
        const items = prompt.tips.map(t => `<li class="cpt-tip-item">${t}</li>`).join("");
        tipsHtml = `<div class="cpt-section-label" style="color:${color};">TIPS</div><ul class="cpt-tips">${items}</ul>`;
    }

    footer.innerHTML = `
        <div class="ctrl-prompt-tooltip" style="border-left-color:${color};">
            <div class="cpt-header">
                <span class="cpt-title" style="color:${color};">${prompt.title}</span>
                <span class="cpt-cat-badge" style="background:${color}22;color:${color};border-color:${color}44;">${catLabel}</span>
            </div>
            ${prompt.desc ? `<div class="cpt-desc">${prompt.desc}</div>` : ""}
            ${fieldsHtml}
            ${tipsHtml}
        </div>`;
}

// Navigate list up/down
function navigateCtrlPromptList(delta) {
    if (ctrlPromptFiltered.length === 0) return;
    ctrlPromptListIdx = (ctrlPromptListIdx + delta + ctrlPromptFiltered.length) % ctrlPromptFiltered.length;
    renderCtrlPromptList();
}

// Navigate category
function navigateCtrlPromptCat(delta) {
    const total = CTRL_PROMPT_CATS.length + 1; // +1 for "all"
    ctrlPromptCatIdx = (ctrlPromptCatIdx + delta + total) % total;
    ctrlPromptListIdx = 0;
    renderCtrlPromptCats();
    renderCtrlPromptList();
}

// Parse template placeholders: "Write a [GENRE] story about [CHARACTER]"
function parseTemplateText(text) {
    const parts = [];
    const re = /\[([A-Z_0-9]+)\]/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
        parts.push({ type: "placeholder", name: m[1], value: m[1], options: getPlaceholderOptions(m[1]), optIdx: 0 });
        last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
    return parts;
}

const PLACEHOLDER_OPTIONS = {
    LANGUAGE:   ["JavaScript", "Python", "Rust", "Go", "TypeScript", "C++", "Java", "Bash"],
    FROM_LANG:  ["JavaScript", "Python", "Rust", "Go", "TypeScript", "C++"],
    TO_LANG:    ["Rust", "Go", "Python", "JavaScript", "TypeScript", "C++"],
    GENRE:      ["cyberpunk", "fantasy", "sci-fi", "horror", "thriller", "romance", "mystery"],
    TONE:       ["professional", "casual", "humorous", "authoritative", "empathetic"],
    STYLE:      ["haiku", "sonnet", "free verse", "limerick", "ballad"],
    SCALE:      ["startup (< 1k users)", "mid-scale (< 100k users)", "large-scale (1M+ users)"],
    TEAM_SIZE:  ["solo developer", "small team (2-5)", "medium team (5-20)", "large team (20+)"],
    ENVIRONMENT:["AWS", "GCP", "Azure", "bare-metal", "Kubernetes", "Docker Compose", "Vercel"],
};

function getPlaceholderOptions(name) {
    return PLACEHOLDER_OPTIONS[name] || [];
}

function getTemplateFilled() {
    return ctrlPromptTemplateParts.map(p => {
        if (p.type === "text") return p.value;
        return p.options.length > 0 ? p.options[p.optIdx] : `[${p.name}]`;
    }).join("");
}

function renderTemplateModeFooter() {
    const footer = document.querySelector(".ctrl-prompt-footer");
    const placeholders = ctrlPromptTemplateParts.filter(p => p.type === "placeholder");
    const current = placeholders[ctrlPromptPlaceholderIdx];
    if (!current || !footer) return;

    footer.innerHTML = `<div class="ctrl-prompt-template-bar">
        <span class="ctrl-prompt-template-label">&#x25B6; Fill: [${current.name}]</span>
        <span class="ctrl-prompt-template-value">${current.options.length > 0 ? current.options[current.optIdx] : "(type below)"}</span>
        <span class="ctrl-prompt-template-hint">&#x2190;&#x2192;=Cycle &nbsp; &#x2191;&#x2193;=Next Field &nbsp; A=Confirm Send &nbsp; B=Cancel</span>
    </div>`;
}

function enterTemplateMode(prompt) {
    ctrlPromptTemplateParts = parseTemplateText(prompt.text);
    const placeholders = ctrlPromptTemplateParts.filter(p => p.type === "placeholder");
    if (placeholders.length === 0) {
        // No placeholders — send directly
        sendCtrlPromptToChat(prompt.text, prompt.id);
        return;
    }
    ctrlPromptTemplateMode = true;
    ctrlPromptPlaceholderIdx = 0;
    renderTemplateModeFooter();
}

function cycleTemplatePlaceholder(delta) {
    const placeholders = ctrlPromptTemplateParts.filter(p => p.type === "placeholder");
    const current = placeholders[ctrlPromptPlaceholderIdx];
    if (!current || current.options.length === 0) return;
    current.optIdx = (current.optIdx + delta + current.options.length) % current.options.length;
    current.value = current.options[current.optIdx];
    renderTemplateModeFooter();
}

function navigateTemplatePlaceholder(delta) {
    const placeholders = ctrlPromptTemplateParts.filter(p => p.type === "placeholder");
    if (placeholders.length === 0) return;
    ctrlPromptPlaceholderIdx = (ctrlPromptPlaceholderIdx + delta + placeholders.length) % placeholders.length;
    renderTemplateModeFooter();
}

function confirmTemplateAndSend() {
    const filled = getTemplateFilled();
    const prompt = ctrlPromptFiltered[ctrlPromptListIdx];
    sendCtrlPromptToChat(filled, prompt ? prompt.id : null);
    exitTemplateMode();
}

function exitTemplateMode() {
    ctrlPromptTemplateMode = false;
    ctrlPromptTemplateParts = [];
    // Restore normal preview footer
    const footer = document.querySelector(".ctrl-prompt-footer");
    updateCtrlPromptPreview(ctrlPromptFiltered[ctrlPromptListIdx] || null);
}

// Send prompt text to chat input and switch to chat view
function sendCtrlPromptToChat(text, promptId) {
    if (promptId) bumpCtrlPromptUsage(promptId);
    closeCtrlPromptOverlay();
    // Navigate to chat view
    const chatTab = document.querySelector('.nav-tab[data-view="chat"]');
    if (chatTab && !chatTab.classList.contains("active")) chatTab.click();
    setTimeout(() => {
        const input = document.getElementById("user-input");
        if (input) {
            input.value = text;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.focus();
            // Auto-resize textarea
            input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 200) + "px";
        }
    }, 80);
}

// Confirm current selection — enter template mode if has placeholders, else send
function confirmCtrlPrompt() {
    const prompt = ctrlPromptFiltered[ctrlPromptListIdx];
    if (!prompt) return;
    if (prompt.text.includes("[")) {
        enterTemplateMode(prompt);
    } else {
        sendCtrlPromptToChat(prompt.text, prompt.id);
    }
}

function openCtrlPromptOverlay() {
    ctrlPromptVisible = true;
    ctrlPromptListIdx = 0;
    ctrlPromptCatIdx = 0;
    ctrlPromptTemplateMode = false;
    const overlay = document.getElementById("ctrl-prompt-overlay");
    if (overlay) {
        overlay.classList.add("active");
        overlay.setAttribute("aria-hidden", "false");
    }
    renderCtrlPromptCats();
    renderCtrlPromptList();
    // Focus search for keyboard users
    setTimeout(() => {
        const searchEl = document.getElementById("ctrl-prompt-search");
        if (searchEl) searchEl.focus();
    }, 50);
}

function closeCtrlPromptOverlay() {
    ctrlPromptVisible = false;
    ctrlPromptTemplateMode = false;
    const overlay = document.getElementById("ctrl-prompt-overlay");
    if (overlay) {
        overlay.classList.remove("active");
        overlay.setAttribute("aria-hidden", "true");
    }
}

function initCtrlPromptPicker() {
    // Keyboard shortcut: Ctrl+Shift+P
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "P") {
            e.preventDefault();
            ctrlPromptVisible ? closeCtrlPromptOverlay() : openCtrlPromptOverlay();
        }
        if (!ctrlPromptVisible) return;
        if (e.key === "Escape") { closeCtrlPromptOverlay(); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); ctrlPromptTemplateMode ? navigateTemplatePlaceholder(1) : navigateCtrlPromptList(1); }
        if (e.key === "ArrowUp") { e.preventDefault(); ctrlPromptTemplateMode ? navigateTemplatePlaceholder(-1) : navigateCtrlPromptList(-1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); ctrlPromptTemplateMode ? cycleTemplatePlaceholder(-1) : navigateCtrlPromptCat(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); ctrlPromptTemplateMode ? cycleTemplatePlaceholder(1) : navigateCtrlPromptCat(1); }
        if (e.key === "Enter") { e.preventDefault(); ctrlPromptTemplateMode ? confirmTemplateAndSend() : confirmCtrlPrompt(); }
    });

    // Search input live filter
    document.addEventListener("input", (e) => {
        if (e.target && e.target.id === "ctrl-prompt-search") {
            ctrlPromptListIdx = 0;
            renderCtrlPromptList();
        }
    });

    // Click-outside to close
    const overlay = document.getElementById("ctrl-prompt-overlay");
    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeCtrlPromptOverlay();
        });
    }
}


// ── Ctrl+P Sliding Side Panel ────────────────────────────────────────────────
// Separate from the overlay — this is a 300px fixed panel on the right edge.
// View-aware: shows 12 templates relevant to the active NEURODECK tab.

const PANEL_TEMPLATES = {
    chat: [
        { label: "Summarize",      text: "Summarize the key points of the following in 3 bullet points:\n\n{{input}}" },
        { label: "Explain simply", text: "Explain this concept to a complete beginner: {{input}}" },
        { label: "Compare",        text: "Compare and contrast {{input}} with its nearest alternative." },
        { label: "Pros & Cons",    text: "List the pros and cons of {{input}} in a markdown table." },
        { label: "Debate",         text: "Make the strongest possible argument against: {{input}}" },
        { label: "Follow-up Qs",   text: "Generate 5 insightful follow-up questions about: {{input}}" },
        { label: "ELI5",           text: "Explain like I'm 5: {{input}}" },
        { label: "Action items",   text: "Extract all action items from the following:\n\n{{input}}" },
        { label: "Critique",       text: "Give a critical, honest critique of: {{input}}" },
        { label: "Rewrite",        text: "Rewrite the following to be clearer and more concise:\n\n{{input}}" },
        { label: "Story form",     text: "Tell me a short story that illustrates: {{input}}" },
        { label: "Research plan",  text: "Create a step-by-step research plan for: {{input}}" },
    ],
    terminal: [
        { label: "Find files",     text: "find . -name '{{input}}' -type f 2>/dev/null" },
        { label: "Disk usage",     text: "du -sh */ | sort -rh | head -20" },
        { label: "Process list",   text: "ps aux | grep {{input}} | grep -v grep" },
        { label: "Port check",     text: "lsof -i :{{input}}" },
        { label: "Git log short",  text: "git log --oneline -20" },
        { label: "Count lines",    text: "find . -name '*.{{input}}' | xargs wc -l | tail -1" },
        { label: "Kill port",      text: "kill -9 $(lsof -ti :{{input}})" },
        { label: "Archive dir",    text: "tar -czf {{input}}.tar.gz {{input}}/" },
        { label: "Watch logs",     text: "tail -f {{input}}.log | grep --line-buffered 'ERROR\\|WARN'" },
        { label: "Diff files",     text: "diff <(sort {{input}}) <(sort {{input2}})" },
        { label: "Memory info",    text: "free -h && cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable'" },
        { label: "Network stats",  text: "ss -tulnp | grep LISTEN" },
    ],
    agent: [
        { label: "Write script",   text: "Write a Python script that {{input}}. Include error handling and a usage example." },
        { label: "Debug code",     text: "Debug the following code and explain the fix:\n\n{{input}}" },
        { label: "Refactor",       text: "Refactor this code to be cleaner and more maintainable:\n\n{{input}}" },
        { label: "Add tests",      text: "Write unit tests for the following function:\n\n{{input}}" },
        { label: "Document",       text: "Add comprehensive docstrings and comments to:\n\n{{input}}" },
        { label: "Automate task",  text: "Write a shell script to automate: {{input}}" },
        { label: "API wrapper",    text: "Write a Python wrapper for the {{input}} API with error handling and retries." },
        { label: "Data pipeline",  text: "Create a data pipeline that reads from {{input}}, transforms, and writes to CSV." },
        { label: "Config gen",     text: "Generate a production-ready config file for {{input}}." },
        { label: "Perf analyze",   text: "Analyze performance bottlenecks and suggest optimizations for:\n\n{{input}}" },
        { label: "Security audit", text: "Perform a security audit of:\n\n{{input}}" },
        { label: "Deploy script",  text: "Write a deployment script for {{input}} that handles rollback." },
    ],
    canvas: [
        { label: "HTML boilerplate", text: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>{{input}}</title>\n</head>\n<body>\n  <h1>{{input}}</h1>\n</body>\n</html>" },
        { label: "React component",  text: "export default function {{input}}({ children }) {\n  return <div className=\"{{input|lower}}\">{children}</div>;\n}" },
        { label: "Python class",     text: "class {{input}}:\n    def __init__(self):\n        pass\n\n    def run(self):\n        pass" },
        { label: "Fetch API",        text: "const res = await fetch('{{input}}');\nconst data = await res.json();\nconsole.log(data);" },
        { label: "CSS variables",    text: ":root {\n  --primary: #00e5ff;\n  --bg: #0d0d14;\n  --text: #e0e0f0;\n}" },
        { label: "Tailwind card",    text: "<div class=\"rounded-xl border border-zinc-700 bg-zinc-900 p-6\">\n  <h2 class=\"text-lg font-bold\">{{input}}</h2>\n</div>" },
        { label: "SQL query",        text: "SELECT *\nFROM {{input}}\nWHERE created_at > NOW() - INTERVAL '7 days'\nORDER BY created_at DESC\nLIMIT 100;" },
        { label: "Bash function",    text: "{{input}}() {\n  local arg=\"$1\"\n  echo \"Running: $arg\"\n}" },
        { label: "Lua plugin",       text: "registerCommand('{{input}}', function(args)\n  return execute(args)\nend)" },
        { label: "JSON schema",      text: "{\n  \"$schema\": \"https://json-schema.org/draft-07/schema\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"name\": { \"type\": \"string\" }\n  }\n}" },
        { label: "Dockerfile",       text: "FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nCMD [\"python\", \"main.py\"]" },
        { label: "Github Actions",   text: "name: {{input}}\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4" },
    ],
    default: [
        { label: "Summarize",      text: "Summarize: {{input}}" },
        { label: "Explain",        text: "Explain: {{input}}" },
        { label: "Improve",        text: "Improve this: {{input}}" },
        { label: "Translate EN",   text: "Translate to English: {{input}}" },
        { label: "Bullet points",  text: "List the key points of:\n{{input}}" },
        { label: "Simplify",       text: "Simplify the following:\n{{input}}" },
        { label: "Examples",       text: "Give 3 concrete examples of: {{input}}" },
        { label: "Step by step",   text: "Explain step by step how to: {{input}}" },
        { label: "Pros & Cons",    text: "Pros and cons of: {{input}}" },
        { label: "TL;DR",          text: "TL;DR:\n{{input}}" },
        { label: "Action items",   text: "Extract action items from:\n{{input}}" },
        { label: "Next steps",     text: "What are the next steps for: {{input}}" },
    ],
};

let _panelOpen = false;

export function initCtrlPromptPanel() {
    const panel = document.getElementById("ctrl-prompt-panel");
    const closeBtn = document.getElementById("ctrl-prompt-panel-close");
    if (!panel) return;

    closeBtn?.addEventListener("click", () => _closePanel());

    // Ctrl+P (not Ctrl+Shift+P which is the overlay)
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "p") {
            e.preventDefault();
            _panelOpen ? _closePanel() : _openPanel();
        }
    });

    // Click outside panel to close
    document.addEventListener("click", (e) => {
        if (_panelOpen && panel && !panel.contains(e.target)) {
            _closePanel();
        }
    });
}

function _openPanel() {
    const panel = document.getElementById("ctrl-prompt-panel");
    if (!panel) return;
    _panelOpen = true;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    _renderPanelTemplates();
}

function _closePanel() {
    const panel = document.getElementById("ctrl-prompt-panel");
    if (!panel) return;
    _panelOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
}

function _getActiveView() {
    const active = document.querySelector(".nav-tab.active");
    return active?.dataset.view || "chat";
}

function _renderPanelTemplates() {
    const listEl  = document.getElementById("ctrl-prompt-panel-list");
    const labelEl = document.getElementById("ctrl-prompt-panel-view-label");
    if (!listEl) return;

    const view      = _getActiveView();
    const templates = PANEL_TEMPLATES[view] || PANEL_TEMPLATES.default;
    const viewName  = view.charAt(0).toUpperCase() + view.slice(1).replace(/-/g, " ");
    if (labelEl) labelEl.textContent = viewName;

    listEl.innerHTML = templates.map((t, i) => `
        <div class="ctp-card" data-idx="${i}" role="article" aria-label="${_esc(t.label)}">
            <div class="ctp-card-label">${_esc(t.label)}</div>
            <div class="ctp-card-text">${_esc(t.text.slice(0, 80))}${t.text.length > 80 ? "…" : ""}</div>
            <button class="ctp-use-btn" data-idx="${i}" aria-label="Use template: ${_esc(t.label)}">Use</button>
        </div>
    `).join("");

    listEl.querySelectorAll(".ctp-use-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const tpl = templates[Number(btn.dataset.idx)];
            if (tpl) _pasteTemplate(view, tpl.text);
            _closePanel();
        });
    });
}

function _pasteTemplate(view, text) {
    // Remove {{placeholder}} markers for pasting
    const clean = text.replace(/\{\{[^}]+\}\}/g, "");
    const full  = text;

    // Chat: paste into user-input
    const chatInput = document.getElementById("user-input");
    if ((view === "chat" || !chatInput?.closest(".view-content:not(.active)")) && chatInput) {
        chatInput.value = full;
        chatInput.focus();
        chatInput.dispatchEvent(new Event("input"));
        return;
    }
    // Terminal: paste into active PTY (or agent task input)
    if (view === "terminal") {
        const ptyInput = document.querySelector(".xterm-helper-textarea");
        if (ptyInput) { ptyInput.dispatchEvent(new InputEvent("input", { data: clean, bubbles: true })); }
        return;
    }
    // Agent
    const agentInput = document.getElementById("agent-task-input");
    if (view === "agent" && agentInput) {
        agentInput.value = full;
        agentInput.focus();
        agentInput.dispatchEvent(new Event("input"));
        return;
    }
    // Canvas: set Monaco if available
    if (view === "canvas") {
        if (window._monacoEditor) { window._monacoEditor.setValue(full); return; }
        const ta = document.getElementById("canvas-code-input");
        if (ta) { ta.value = full; ta.dispatchEvent(new Event("input")); }
        return;
    }
    // Fallback: try chat input
    if (chatInput) { chatInput.value = full; chatInput.focus(); chatInput.dispatchEvent(new Event("input")); }
}

function _esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Exports ─────────────────────────────────────────────────────────────────
// Getter functions — guarantee live reads regardless of how the module is bundled.
// Import these instead of the raw variables so pollGamepads always sees current state.
export function getCtrlPromptVisible() { return ctrlPromptVisible; }
export function getCtrlPromptTemplateMode() { return ctrlPromptTemplateMode; }

// Functions called by gamepad polling loop
export {
    openCtrlPromptOverlay,
    closeCtrlPromptOverlay,
    confirmCtrlPrompt,
    exitTemplateMode,
    cycleTemplatePlaceholder,
    navigateTemplatePlaceholder,
    confirmTemplateAndSend,
    navigateCtrlPromptList,
    navigateCtrlPromptCat,
    initCtrlPromptPicker,
};
