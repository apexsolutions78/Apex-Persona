This MVP builds the baby brain, not a complete adult persona.
It accepts a learning goal, gathers knowledge from selected sources, turns it into structured
knowledge atoms, validates and scores those atoms, and stores them for fast retrieval.
It does not need advanced identity simulation, autonomous actions, personality roleplay,
continuous autonomous learning, or a polished public chat product in version 1.
Given an input such as:
"Learn the domain required to become a competent [role/topic]."
The application should be able to:
1. Generate a research plan and discovery queries.
2. Gather documents from approved sources.
3. Normalize and preserve source metadata.
4. Extract concepts, claims, procedures, cases, and heuristics.
5. Detect duplicate and conflicting knowledge.
6. Score each atom for source quality, evidence, agreement, logic, and recency.
7. Store validated knowledge in a searchable memory system.
8. Return retrieved, source-linked, confidence-aware knowledge for a user question.
The result is a usable validated knowledge foundation from which personas can later be
synthesized.
Layer MVP Status Why it exists in MVP
Layer 0 — Empty Core Included
Defines learning goal, permitted tools, policies, and starting
configuration
Layer 1 — Perception & Ingestion Included Collects source material and preserves provenance
Layer 2 — Digestion & Structuring Included Converts documents into reusable knowledge atoms
Persona Development Application — MVP Scope
Minimal Viable Subset: Layers 0–4
Purpose
MVP Outcome
Included Layers
Layer MVP Status Why it exists in MVP
Layer 3 — Validation & Truth Filter Included, simplified
Prevents raw internet content from becoming trusted knowledge
automatically
Layer 4 — Memory Architecture Included, simplified Makes validated knowledge searchable and retrievable
Layer 5 — Identity & Behavior
Synthesis
Deferred Requires a stable knowledge foundation first
Layer 6 — Interaction &
Expression
Minimal internal API
only
Full agent/chat interface is not needed for validation of the core
concept
Layer 7 — Growth & SelfImprovement
Deferred Start with manually triggered ingestion and review cycles
Do not add these to the first MVP unless they are needed to prove the core pipeline:
Fully autonomous internet crawling without a defined topic or source policy
A “human-like” personality, avatar, voice, or character system
Autonomous tool execution or real-world actions
Fine-tuning a base LLM
Full knowledge graph reasoning across every domain
Video understanding beyond transcript ingestion
Perfect automated fact-checking
Automatic publication of generated knowledge as truth
Massive-scale web crawling
Multi-tenant billing, enterprise permissions, or complex frontend workflows
The MVP should be small, auditable, and correct enough to learn from.
Create the starting state of a learning instance. The system has no knowledge but has a
bounded objective, tool permissions, collection rules, and validation policies.
persona_seed:
persona_id: uuid
learning_goal: "Learn the knowledge required for [role/domain]."
scope:
include_topics: []
exclude_topics: []
What Is Explicitly Out of Scope
Layer 0 — Empty Core
Objective
Minimum Inputs
source_policy:
allowed_source_types:
- official_documentation
- research_paper
- book_or_longform
- reputable_publication
- community_forum
prohibited_domains: []
max_documents_per_run: 100
freshness_policy:
fast_changing_domain: true
preferred_age_months: 24
validation_policy:
minimum_core_confidence: 0.70
minimum_sources_for_high_confidence: 2
human_review_threshold: 0.45
Every run must have a named learning goal.
Every learning goal must have scope boundaries.
Every source must be traceable to a URL, file, or connector record.
No extracted claim becomes “core knowledge” before validation.
The system must distinguish raw evidence from validated knowledge.
Collect relevant source material while preserving provenance, dates, source type, and
processing history.
User-defined seed queries
Automatically expanded queries
Explicit URLs
Uploaded files
Optional approved source lists
Use a bounded discovery run rather than “scrape the entire internet.”
1. Convert the learning goal into 10–30 research queries.
2. Classify queries by intent:
MVP Rules
Layer 1 — Perception & Ingestion
Objective
MVP Inputs
MVP Collection Strategy
Definitions and foundations
Official rules, standards, and specifications
Research and evidence
Procedures and practical methods
Case studies and outcome data
Failure modes and criticisms
Community experience and edge cases
3. Search and rank candidate sources.
4. Fetch only sources allowed by the source policy.
5. Save raw and cleaned versions with full metadata.
6. Deduplicate documents before expensive extraction.
Start with only:
Search provider/API
URL fetcher and HTML extractor
PDF/text parser
Local file upload
Add forum-specific, video, podcast, social, and code-repository connectors later.
Every document must retain:
Canonical URL or upload identifier
Title
Author or publisher, when available
Publication date and retrieval date
Source type
Language
Domain name
Content hash
Crawl/fetch status
License/usage notes, where available
Minimum Ingestion Connectors
Required Source Metadata
A user can create a learning run with a goal and seed query list.
The system can ingest at least HTML pages, PDFs, and uploaded text files.
Duplicate documents are detected by canonical URL and content hash.
Every stored document has immutable provenance metadata.
Transform raw documents into compact, source-linked knowledge atoms that can be
compared, scored, and retrieved.
1. Clean source content: remove navigation, ads, cookie banners, repeated boilerplate, and
unrelated page elements.
2. Normalize text: convert to markdown/plain text with headings and paragraphs preserved.
3. Segment document: split by semantic sections, not arbitrary fixed length alone.
4. Extract concepts: identify terms, entities, tools, metrics, and domain labels.
5. Extract knowledge atoms: claims, procedures, patterns, examples/cases, and definitions.
6. Attach exact evidence: atom must point to source section(s) that support it.
7. Detect near duplicates: merge or link equivalent atoms while preserving all sources.
Each atom must be:
Atomic: one independently understandable idea.
Scoped: contains conditions, context, or applicable domain where possible.
Attributed: linked to one or more evidence spans.
Typed: claim, procedure, concept, case, or heuristic.
Non-inflated: extraction must not state stronger conclusions than the original source.
Type Meaning Example shape
Concept Definition or entity “X is a method used for Y”
Claim Verifiable statement “Under condition C, X tends to affect Y”
Procedure Ordered method “To achieve G, perform steps 1…N”
MVP Acceptance Tests
Layer 2 — Digestion & Structuring
Objective
Processing Pipeline
Knowledge Atom Rules
MVP Atom Types
Type Meaning Example shape
Heuristic Conditional rule of thumb “When S occurs, prefer A unless B”
Case Event with context and outcome “In context C, action A produced outcome O”
For each atom, produce:
{
"atom_type": "claim",
"canonical_text": "...",
"conditions": ["..."],
"topic_tags": ["..."],
"source_evidence": [
{"document_id": "...", "section_id": "...", "quote_start": 0, "quote_end": 0}
],
"extraction_confidence": 0.0
}
A document can be transformed into clean sections.
Each extracted atom can be traced to a specific document section.
Atoms are classified into one of the MVP atom types.
Near-duplicate atoms can be linked into an equivalence cluster.
Separate stored evidence from trusted working knowledge. The system does not “prove truth”;
it maintains calibrated confidence based on evidence quality and contradiction handling.
Never ask one LLM: “Is this true?” and accept the answer.
Instead, score a claim using several independent signals:
overall_confidence = weighted combination of:
source credibility
evidence strength
cross-source agreement
contradiction penalty
recency
MVP Extraction Output
MVP Acceptance Tests
Layer 3 — Validation & Truth Filter
Objective
MVP Validation Principle
extraction quality
constraint/logic checks
The score is an estimate of support, not a declaration of absolute truth.
Assign an initial source score using transparent rules:
Source class Example Starting score
Primary / official Standards body, official documentation, official dataset 0.90
Peer-reviewed / institutional Academic journal, university, recognized research institution 0.80
Named expert / reputable publisher Established author or specialist publication 0.65
Case-study publisher Company or consultant with disclosed method/data 0.55
Community / forum Named or anonymous discussion 0.35
Unknown / low-quality Thin, unattributed, spam-like site 0.15
Scores must be configurable by domain. An official source can be authoritative about its own
rules but not necessarily about general best practice.
Classify evidence without confusing specificity with truth:
Evidence class Score guide
Formal standard, directly relevant primary evidence 0.95
Replicated or high-quality study 0.85
Transparent dataset or measurable case study 0.70
Named expert explanation with rationale 0.55
Anecdote / community observation 0.35
Unsupported assertion 0.10
Cluster semantically equivalent claims.
Count independent supporting sources, not copied articles.
Detect syndication, plagiarism, or shared origin so 100 copied pages do not look like 100
confirmations.
Reward agreement across diverse source classes.
MVP Validation Components
A. Source Credibility
B. Evidence Strength
C. Cross-Source Agreement
For every meaningful claim cluster, look for:
Direct contradiction: “X improves Y” vs “X reduces Y.”
Contextual contradiction: both may be correct under different conditions.
Time conflict: older rules versus newer rules.
Definition conflict: same word used differently by different sources.
A contradiction should not automatically delete a claim. It should create:
A conflict record
A confidence penalty
A context-resolution task
A possible “debated” label
Use deterministic checks when possible:
Formal rules/specifications
Unit and numerical consistency
Date sequence consistency
Impossible values or contradictory conditions
Domain-specific hard constraints, when available
Record publication date and last verification date.
Apply stronger decay only for domains flagged as fast-changing.
Preserve older foundational knowledge if it is still supported by newer sources.
Confidence band Treatment
0.80–1.00 Core supported knowledge; usable by default
0.60–0.79 Supported but qualified; usable with confidence label
0.40–0.59 Uncertain or debated; use only with caveat or review
0.00–0.39 Quarantined evidence; not used as advice or fact
D. Contradiction Detection
E. Constraint and Logic Checks
F. Recency
MVP Decision Bands
Send to review when:
High-impact claim has conflicting credible sources.
The claim has strong consequences but weak evidence.
The extraction model is uncertain.
The source is new, unknown, or suspected spam.
A user disputes a previously trusted atom.
An atom’s final score is explainable from stored component scores.
Conflicting claims are stored as conflicts, not silently overwritten.
Low-confidence knowledge is excluded from default retrieval.
A human reviewer can approve, reject, or override an atom, with audit trail.
Store raw evidence and validated knowledge separately, then retrieve the most relevant,
supported, recent material quickly.
Use four logical stores. They may initially live in PostgreSQL plus object storage and a vector
index.
1. Raw source store — Original fetched files and cleaned document versions.
2. Structured relational store — Documents, sections, atoms, sources, scores, conflicts, and
review records.
3. Vector retrieval index — Embeddings for sections and atoms.
4. Optional graph projection — Concept-to-atom and atom-to-atom relationships. This can
start as relational tables rather than a graph database.
When asked a question:
1. Classify intent and target domain.
2. Search high-confidence atoms semantically.
3. Filter by scope, recency, atom type, and confidence threshold.
4. Re-rank using query relevance plus evidence strength.
MVP Human Review Queue
MVP Acceptance Tests
Layer 4 — Memory Architecture
Objective
MVP Storage Pattern
Retrieval Pipeline
5. Retrieve source evidence alongside each atom.
6. Return answer material with confidence and conflict status.
Prefer high-confidence atoms over merely similar low-confidence text.
Do not retrieve quarantined claims unless the user explicitly asks for disputed views.
Do not merge mutually contradictory claims into a false consensus.
Preserve source provenance in all internal outputs.
Keep raw documents available for audit and reprocessing.
Semantic search: “Find knowledge relevant to this question.”
Faceted search: filter by topic, source type, date, atom type, confidence band.
Evidence lookup: “Why does the system believe this?”
Conflict lookup: “What contradicts this claim?”
Learning-run audit: “Which sources and atoms were created by this run?”
A query retrieves atom text, source evidence, and confidence score.
Retrieval can filter at or above a minimum confidence score.
A user can trace an answer candidate back to original source content.
A query can surface both a claim and its known conflicts.
1. Create a Persona Seed and define a learning goal.
2. Create a bounded learning run.
3. Generate and approve discovery queries.
4. Fetch and normalize documents.
5. Extract sections, concepts, and knowledge atoms.
6. Cluster duplicates and related claims.
7. Score sources and evidence.
8. Detect supporting and conflicting evidence.
9. Compute confidence bands.
10. Store core, qualified, debated, and quarantined atoms separately by status.
11. Query the knowledge memory and inspect evidence.
Default Retrieval Rules
MVP Search Capabilities
MVP Acceptance Tests
Minimal End-to-End Workflow
12. Review failures, tune rules, then run another learning cycle.
Build:
Persona Seed / learning goal
URL and file ingestion
Raw document storage
Clean document text and metadata
Audit logs
Do not start with a chatbot.
Build:
Section segmentation
Claim/concept/procedure/case extraction
Evidence span linking
Basic duplicate detection
Build:
Source registry
Evidence classification
Basic agreement clustering
Contradiction records
Explainable confidence scoring
Human-review queue
Build:
Embeddings and vector retrieval
Metadata/confidence filters
Evidence and conflict views
Basic internal API
Recommended MVP Build Order
Phase 1 — Provenance First
Phase 2 — Atomization
Phase 3 — Trust Filter
Phase 4 — Queryable Brain
At the end of Phase 4, you have a real MVP: an empty persona seed can learn from governed
sources, create source-linked knowledge, distinguish strong from weak evidence, and retrieve
its best-supported memory.
Measure the system itself—not only LLM output quality.
Provenance coverage: percentage of atoms with valid source evidence; target 100%.
Duplicate rate: percentage of near-identical atoms correctly clustered.
Validation explainability: percentage of final scores with all contributing components
visible; target 100%.
Review agreement: agreement rate between automated confidence band and human
reviewer decisions.
Retrieval precision: proportion of top retrieved atoms judged relevant and supported.
Conflict capture: percentage of known test contradictions detected and linked.
Knowledge freshness: proportion of time-sensitive core atoms reviewed within policy
period.
The MVP is successful if it proves this statement:
A blank Persona Seed can collect bounded external evidence, transform it into traceable
knowledge atoms, score uncertainty and conflict transparently, and retrieve the most
supported information without pretending that all scraped content is true.
MVP Success Metrics
The MVP Boundary