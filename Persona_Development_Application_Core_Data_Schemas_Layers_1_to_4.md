This document defines an implementation-oriented data model for the baby’s brain.
The recommended pattern is polyglot storage:
PostgreSQL for metadata, workflow state, provenance, validation, relationships, and
review records.
Object storage (S3/MinIO/local filesystem) for raw files, normalized documents,
transcripts, and snapshots.
Vector database (Qdrant, pgvector, Weaviate, etc.) for semantic retrieval of sections and
knowledge atoms.
Optional graph layer (PostgreSQL tables first; Neo4j later if needed) for concepts and
relationships.
Use UUIDs for primary IDs, UTC timestamps, JSONB for evolving extracted metadata, and
immutable version records for anything generated or validated.
1. Provenance first: Every knowledge atom must point to precise evidence.
2. Documents are not truth: Raw documents are evidence containers, not facts.
3. Claims are separate from sources: Multiple documents can support or dispute one
canonical claim.
4. Confidence is explainable: Store all component scores, weights, and score versions.
5. Never erase disagreement: Store supporting, disputing, and qualifying evidence.
6. Version everything important: Documents, extractions, validations, and playbooks can
change.
7. Keep raw, normalized, and derived data separate.
8. Use soft deletion/status fields rather than destroying evidence.
Persona Development Application — Core Data
Schemas
Layers 1–4: Ingestion, Knowledge Atoms, Validation, and Memory
Purpose
Schema Principles
These tables support all Layers 1–4.
Defines the learning target. It is not a personality prompt; it is the scope and governance
definition for a learning project.
Field Type Notes
id UUID PK Persona/project identifier
name TEXT Working name
learning_goal TEXT What the baby is intended to learn
role_description TEXT Optional desired future role
scope_json JSONB Domains, subdomains, jurisdiction, languages, task types
risk_level ENUM low, medium, high, regulated
freshness_policy_json JSONB Domain volatility/decay settings
source_policy_json JSONB Allowed, preferred, blocked source classes/domains
learning_policy_json JSONB Evidence and review rules
status ENUM draft, active, paused, archived
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
created_by UUID/TEXT User or service identity
Suggested indexes: status, GIN index on scope_json.
An auditable execution of discovery, ingestion, extraction, and validation for one persona spec.
Field Type Notes
id UUID PK Run identifier
persona_spec_id UUID FK References persona_specs.id
run_type ENUM
initial_build, refresh, manual_import,
revalidation
status ENUM queued, running, completed, failed, cancelled
config_snapshot_json JSONB Exact configuration used
started_at TIMESTAMPTZ UTC
Cross-Layer Foundation Tables
persona_specs
learning_runs
Field Type Notes
completed_at TIMESTAMPTZ UTC
summary_json JSONB Counts, errors, costs, outcomes
created_by UUID/TEXT Actor
Suggested indexes: (persona_spec_id, started_at DESC), status.
Controlled vocabulary for domains and subdomains.
Field Type Notes
id UUID PK Domain ID
parent_id UUID FK nullable Self-reference for hierarchy
name TEXT Human-readable term
slug TEXT UNIQUE Stable identifier
description TEXT Scope definition
volatility_class ENUM stable, moderate, high
active BOOLEAN Soft lifecycle control
Example: computer-science → machine-learning → retrieval-augmented-generation.
Many-to-many mapping of a persona spec to target domains.
Field Type Notes
persona_spec_id UUID FK Persona
domain_id UUID FK Domain
priority SMALLINT Higher = more central
scope_note TEXT Optional boundary
Primary key: (persona_spec_id, domain_id).
domains
persona_domains
Layer 1 — Perception & Ingestion Schemas
A plan for what the system should seek before searches are executed.
Field Type Notes
id UUID PK Plan ID
learning_run_id UUID FK Run
persona_spec_id UUID FK Persona
objective TEXT Discovery objective
topic TEXT Topic/subtopic
query_text TEXT Exact planned query
query_type ENUM
definition, official, research, procedure,
case_study, failure_mode, critique,
current_update
target_source_classes JSONB e.g. official, academic, community
priority SMALLINT Search order
status ENUM planned, approved, executed, rejected
created_at TIMESTAMPTZ UTC
Indexes: (learning_run_id, priority), full-text index on query_text.
Registry for source domains, publishers, channels, or organizations.
Field Type Notes
id UUID PK Publisher/source identity
canonical_name TEXT Publisher or organization name
domain
TEXT UNIQUE
nullable
e.g. example.org
source_class ENUM
official, academic, professional, publisher,
expert, community, unknown, spam
base_reputation_score NUMERIC(4,3) Initial 0–1 prior
reputation_reason TEXT Why the score exists
ownership_json JSONB Author/organization info
policy_flags_json JSONB blocked, restricted, licensing notes
last_reviewed_at TIMESTAMPTZ Registry maintenance
created_at TIMESTAMPTZ UTC
query_plans
source_publishers
Field Type Notes
updated_at TIMESTAMPTZ UTC
Indexes: source_class, base_reputation_score DESC.
Represents a discoverable source URL, file, video, feed entry, repository, or forum thread.
Field Type Notes
id UUID PK Source ID
publisher_id UUID FK nullable References source_publishers
canonical_url
TEXT UNIQUE
nullable
Canonical URL
source_type ENUM
web_page, pdf, paper, book, video, podcast,
forum_thread, repository, dataset,
uploaded_file
title TEXT Source title
author_json JSONB One or more authors if known
published_at
TIMESTAMPTZ
nullable
Publication date
language_code TEXT ISO language code
license_json JSONB License/copyright/access metadata
discovery_method ENUM search, seed_url, manual, api, upload
discovered_from_query_id UUID FK nullable References query plan
status ENUM
discovered, allowed, blocked, fetched, failed,
superseded
content_hash TEXT nullable Hash of fetched canonical content
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
Indexes: publisher_id, source_type, published_at DESC, content_hash.
Every fetch attempt. Keep this append-only for auditability.
Field Type Notes
id UUID PK Fetch ID
source_id UUID FK References sources
sources
source_fetches
Field Type Notes
learning_run_id UUID FK Run that fetched it
fetch_method ENUM http, browser, api, upload, transcript
requested_url TEXT Exact requested URL
final_url TEXT Redirect target
http_status INTEGER nullable HTTP status
fetched_at TIMESTAMPTZ UTC
raw_object_uri TEXT nullable Object-storage URI
mime_type TEXT nullable Content type
byte_size BIGINT nullable Size
content_hash TEXT nullable Hash
robots_result ENUM allowed, denied, unknown, not_applicable
error_json JSONB nullable Error details
parser_version TEXT Fetch/parser version
Indexes: (source_id, fetched_at DESC), learning_run_id, content_hash.
Normalized document created from a fetch. A source can have multiple document versions
over time.
Field Type Notes
id UUID PK Document ID
source_id UUID FK References sources
fetch_id UUID FK References source_fetches
version_no INTEGER Monotonic per source
normalized_text_uri TEXT Object storage Markdown/text URI
normalized_text TEXT nullable Store inline only when reasonably sized
document_hash TEXT Normalized-text hash
word_count INTEGER Normalized word count
quality_score
NUMERIC(4,3)
nullable
Basic document quality
quality_flags_json JSONB boilerplate, thin, duplicate, spam indicators
language_code TEXT Detected language
documents
Field Type Notes
normalization_version TEXT Pipeline version
status ENUM
ready, quarantined, duplicate, rejected,
superseded
created_at TIMESTAMPTZ UTC
Unique: (source_id, version_no).
Logical sections used as the main unit for extraction and retrieval.
Field Type Notes
id UUID PK Section ID
document_id UUID FK Parent document
parent_section_id UUID FK nullable Hierarchical sectioning
sequence_no INTEGER Section order
heading_path TEXT e.g. H1 > H2 > H3
section_title TEXT nullable Heading text
content_text TEXT Normalized section text
start_char INTEGER Position in document
end_char INTEGER Position in document
token_count INTEGER Approximate token count
section_hash TEXT Dedupe support
created_at TIMESTAMPTZ UTC
Indexes: (document_id, sequence_no), full-text index on content_text, section_hash.
Domain classification at the document or section level.
Field Type Notes
id UUID PK Tag ID
document_id UUID FK nullable Document target
section_id UUID FK nullable Section target
domain_id UUID FK Domain
confidence NUMERIC(4,3) Classifier confidence
document_sections
document_domain_tags
Field Type Notes
assigned_by ENUM model, human, rule
created_at TIMESTAMPTZ UTC
Constraint: exactly one of document_id or section_id must be non-null.
The canonical knowledge unit. This table represents the normalized assertion, procedure,
definition, case, heuristic, or constraint—not a raw copy of a source sentence.
Field Type Notes
id UUID PK Atom ID
persona_spec_id UUID FK Scope owner; can later support shared/global atoms
atom_type ENUM
concept, claim, procedure, heuristic, case,
constraint
canonical_text TEXT Concise normalized form
summary TEXT nullable Short display summary
subject_text TEXT nullable Main subject/entity
predicate TEXT nullable For structured claims, e.g. improves, requires
object_text TEXT nullable Main asserted outcome/object
context_json JSONB Conditions, population, jurisdiction, environment
assumptions_json JSONB Explicit/implicit assumptions
metrics_json JSONB Numbers, units, sample size, timeframe
domain_scope_json JSONB Domain/subdomain IDs or tags
initial_status ENUM unreviewed, extracted, merged, discarded
current_validation_status ENUM
unreviewed, supported, mixed, disputed,
insufficient_evidence,
rejected_by_constraint, approved
canonical_language_code TEXT Language of atom
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
created_by_pipeline_version TEXT Extraction version
Layer 2 — Digestion & Knowledge-Atom Schemas
knowledge_atoms
Indexes: (persona_spec_id, atom_type), current_validation_status, GIN indexes on JSONB
fields, full-text index on canonical_text.
Immutable history of edits, merges, and re-extractions.
Field Type Notes
id UUID PK Version ID
atom_id UUID FK Parent atom
version_no INTEGER Monotonic version
canonical_text TEXT Snapshot
context_json JSONB Snapshot
change_type ENUM
created, model_revision, human_edit, merge, split,
superseded
change_reason TEXT Why changed
created_by UUID/TEXT Model, user, service
created_at TIMESTAMPTZ UTC
Unique: (atom_id, version_no).
The core provenance bridge. Links a knowledge atom to the exact material that supports,
disputes, or qualifies it.
Field Type Notes
id UUID PK Evidence ID
atom_id UUID FK Knowledge atom
document_id UUID FK Document
section_id
UUID FK
nullable
Precise section
stance ENUM
supports, contradicts, qualifies, defines,
illustrates, mentions
evidence_quote TEXT Short exact evidence span, where legally permitted
start_char
INTEGER
nullable
Span start in section/document
end_char
INTEGER
nullable
Span end
extraction_confidence NUMERIC(4,3) Confidence that the link is accurate
atom_versions
atom_evidence
Field Type Notes
evidence_type ENUM
opinion, anecdote, guidance, case_study,
dataset, experiment, study, standard,
primary_record
independence_group TEXT nullable Identifies copies/syndicated content source family
created_at TIMESTAMPTZ UTC
created_by_pipeline_version TEXT Extractor version
Indexes: (atom_id, stance), document_id, section_id, independence_group.
Normalized domain mapping for each atom.
Field Type Notes
atom_id UUID FK Atom
domain_id UUID FK Domain
relevance_score NUMERIC(4,3) 0–1
assigned_by ENUM model, human, rule
Primary key: (atom_id, domain_id).
Groups near-duplicate or semantically equivalent atoms.
Field Type Notes
id UUID PK Cluster ID
persona_spec_id UUID FK Scope
cluster_type ENUM
duplicate, similar_claim, contradiction_candidate,
procedure_variant
canonical_atom_id
UUID FK
nullable
Preferred atom in cluster
cluster_summary TEXT What the cluster represents
similarity_method TEXT Embedding/model/rule version
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
atom_domains
atom_clusters
Field Type Notes
cluster_id UUID FK Cluster
atom_id UUID FK Atom
similarity_score NUMERIC(5,4) Similarity to canonical/member basis
relation ENUM duplicate, equivalent, variant, possible_contradiction
created_at TIMESTAMPTZ UTC
Primary key: (cluster_id, atom_id).
Optional structured extension for atoms whose type is procedure.
Field Type Notes
atom_id UUID PK/FK References knowledge_atoms.id
goal_text TEXT Intended outcome
preconditions_json JSONB Required conditions
expected_outcomes_json JSONB Expected outputs
risk_notes_json JSONB Risks/cautions
Field Type Notes
id UUID PK Step ID
procedure_atom_id UUID FK Procedure atom
step_no INTEGER Order
instruction_text TEXT Step
conditions_json JSONB If/then conditions
expected_result TEXT nullable Expected result
created_at TIMESTAMPTZ UTC
Unique: (procedure_atom_id, step_no).
atom_cluster_members
procedures
procedure_steps
Optional structured extension for atoms whose type is case.
Field Type Notes
atom_id UUID PK/FK References knowledge_atoms.id
situation_json JSONB Context/starting conditions
actions_json JSONB Actions/interventions
outcomes_json JSONB Results/metrics
limitations_json JSONB Caveats/confounders
timeframe_json JSONB Dates/duration
generalizability_score NUMERIC(4,3) nullable How broadly it may apply
Versioned reputation assessments. Do not overwrite source reputation without retaining
history.
Field Type Notes
id UUID PK Assessment ID
publisher_id UUID FK Source publisher
domain_id UUID FK nullable Reputation can vary by domain
score NUMERIC(4,3) 0–1
tier ENUM A, B, C, D
rationale_json JSONB Named author, editorial process, primary status, etc.
assessment_method ENUM seed_rule, model, human, feedback_update
valid_from TIMESTAMPTZ Start
valid_until TIMESTAMPTZ nullable End if superseded
created_by UUID/TEXT Actor
created_at TIMESTAMPTZ UTC
Indexes: (publisher_id, domain_id, valid_from DESC).
cases
Layer 3 — Validation and Truth-Filter Schemas
source_reputation_assessments
Records an execution of validation logic against an atom or cluster.
Field Type Notes
id UUID PK Validation run ID
persona_spec_id UUID FK Persona scope
atom_id
UUID FK
nullable
Target atom
cluster_id
UUID FK
nullable
Target cluster
validation_type ENUM
source_score, corroboration, conflict, constraint,
recency, full_score
pipeline_version TEXT Validator/model version
input_snapshot_json JSONB Inputs used
output_json JSONB Detailed output
status ENUM completed, failed, needs_review
executed_at TIMESTAMPTZ UTC
Constraint: target at least one of atom_id, cluster_id.
Stores score components and the resulting confidence. Keep one active version and historical
records.
Field Type Notes
id UUID PK Score ID
atom_id UUID FK Atom
score_version TEXT Algorithm/weights version
source_quality_score NUMERIC(4,3) 0–1
evidence_strength_score NUMERIC(4,3) 0–1
corroboration_score NUMERIC(4,3) 0–1
recency_score NUMERIC(4,3) 0–1
constraint_consistency_score NUMERIC(4,3) 0–1
conflict_penalty NUMERIC(4,3) 0–1
final_confidence_score NUMERIC(4,3) 0–1
confidence_band ENUM high, supported, tentative, weak
validation_runs
atom_validation_scores
Field Type Notes
validation_status ENUM
supported, mixed, disputed,
insufficient_evidence,
rejected_by_constraint, approved
explanation_json JSONB Human-readable score explanation and counts
is_current BOOLEAN Current score row flag
calculated_at TIMESTAMPTZ UTC
Indexes: (atom_id, is_current), (confidence_band, final_confidence_score DESC),
validation_status.
Represents support, contradiction, qualification, or derivation among atoms.
Field Type Notes
id UUID PK Relation ID
from_atom_id UUID FK Source atom
to_atom_id UUID FK Target atom
relation_type ENUM
supports, contradicts, qualifies, supersedes,
derived_from, same_as, depends_on
strength_score NUMERIC(4,3) Relation confidence
reason_json JSONB Model/rule/human evidence
status ENUM proposed, verified, rejected
created_at TIMESTAMPTZ UTC
verified_by
UUID/TEXT
nullable
Human/service
verified_at
TIMESTAMPTZ
nullable
UTC
Indexes: from_atom_id, to_atom_id, relation_type.
Hard or strong rules against which claims may be checked.
Field Type Notes
id UUID PK Constraint ID
domain_id UUID FK Applicable domain
constraint_type ENUM
formal_rule, standard, legal_rule, mathematical,
physical, platform_policy, safety
claim_relations
constraints
Field Type Notes
statement TEXT Constraint text
structured_rule_json JSONB Optional machine-checkable form
authority_level ENUM hard, strong, advisory
effective_from
TIMESTAMPTZ
nullable
Start date
effective_to
TIMESTAMPTZ
nullable
End date
status ENUM active, superseded, withdrawn
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
Field Type Notes
constraint_id UUID FK Constraint
document_id UUID FK Authority document
section_id UUID FK nullable Evidence location
evidence_quote TEXT Supporting text
created_at TIMESTAMPTZ UTC
Primary key: (constraint_id, document_id, section_id).
Field Type Notes
id UUID PK Check ID
atom_id UUID FK Atom
constraint_id UUID FK Constraint
result ENUM consistent, conflict, not_applicable, uncertain
explanation TEXT Why
checker_version TEXT Rule/model version
checked_at TIMESTAMPTZ UTC
Indexes: (atom_id, result), constraint_id.
constraint_evidence
atom_constraint_checks
Human-in-the-loop queue.
Field Type Notes
id UUID PK Review task ID
persona_spec_id UUID FK Persona
target_type ENUM source, document, atom, cluster, relation, constraint
target_id UUID Polymorphic target ID
reason_code ENUM
high_risk, source_conflict, low_evidence,
extraordinary_claim, manual_sampling, model_error
priority ENUM low, medium, high, critical
status ENUM open, assigned, approved, rejected, edited, deferred
assigned_to
UUID/TEXT
nullable
Reviewer
decision_json JSONB nullable Decision, rationale, edits
created_at TIMESTAMPTZ UTC
resolved_at
TIMESTAMPTZ
nullable
UTC
Indexes: (status, priority), (persona_spec_id, status).
Use either this relational registry plus an external vector DB, or pgvector directly.
Field Type Notes
id UUID PK Embedding ID
entity_type ENUM document, section, atom, concept, playbook
entity_id UUID Target entity
embedding_model TEXT Model/version
vector_store_key TEXT External vector record ID
content_hash TEXT Hash of embedded text
dimension INTEGER Vector dimension
created_at TIMESTAMPTZ UTC
review_tasks
Layer 4 — Memory, Retrieval, and Concept-Graph
Schemas
embeddings
Field Type Notes
superseded_at TIMESTAMPTZ nullable If re-embedded
Unique recommended: (entity_type, entity_id, embedding_model, content_hash).
If using PostgreSQL pgvector, add embedding VECTOR(n) and an HNSW/IVFFlat index instead of
vector_store_key.
Canonical concepts for semantic organization.
Field Type Notes
id UUID PK Concept ID
persona_spec_id UUID FK nullable Null if shared global concept
preferred_label TEXT Canonical name
definition TEXT nullable Validated working definition
domain_id UUID FK nullable Primary domain
status ENUM candidate, active, deprecated, merged
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
Indexes: (persona_spec_id, preferred_label), full-text index on labels/definition.
Field Type Notes
id UUID PK Alias ID
concept_id UUID FK Concept
alias_text TEXT Synonym, abbreviation, alternate spelling
language_code TEXT Language
alias_type ENUM synonym, abbreviation, legacy_term, translation
created_at TIMESTAMPTZ UTC
Unique: (concept_id, alias_text, language_code).
concepts
concept_aliases
Links knowledge atoms to concepts.
Field Type Notes
atom_id UUID FK Atom
concept_id UUID FK Concept
role ENUM subject, object, condition, method, outcome, metric, risk
relevance_score NUMERIC(4,3) 0–1
assigned_by ENUM model, human, rule
created_at TIMESTAMPTZ UTC
Primary key: (atom_id, concept_id, role).
The MVP concept graph.
Field Type Notes
id UUID PK Edge ID
from_concept_id UUID FK Origin node
to_concept_id UUID FK Target node
relation_type ENUM
is_a, part_of, requires, causes, improves, reduces,
measured_by, applies_to, related_to
confidence_score NUMERIC(4,3) 0–1
supporting_atom_id
UUID FK
nullable
Atom establishing this edge
status ENUM proposed, active, disputed, deprecated
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
Indexes: (from_concept_id, relation_type), to_concept_id.
Defines retrieval policies per persona/domain/task.
Field Type Notes
id UUID PK Profile ID
persona_spec_id UUID FK Persona
atom_concepts
concept_relations
retrieval_profiles
Field Type Notes
name TEXT e.g. default_evidence_first
task_type TEXT nullable explain, compare, design, diagnose
min_confidence_band ENUM weak, tentative, supported, high
max_results INTEGER Retrieval count
recency_preference NUMERIC(4,3) 0–1
source_diversity_required BOOLEAN Avoid one-source answers
include_conflicts BOOLEAN Return debate evidence when relevant
allowed_source_classes_json JSONB Source-class filters
reranking_config_json JSONB Weights for relevance, confidence, freshness
created_at TIMESTAMPTZ UTC
updated_at TIMESTAMPTZ UTC
Audit trail for what memory was used in a future answer or test.
Field Type Notes
id UUID PK Retrieval event ID
persona_spec_id UUID FK Persona
retrieval_profile_id UUID FK nullable Profile
query_text TEXT Query
query_context_json JSONB Intent, domain, filters
retrieved_entity_type ENUM atom, section, concept, case, procedure
retrieved_entity_id UUID Result entity
rank INTEGER Final rank
semantic_score NUMERIC(6,5) Vector similarity
confidence_score NUMERIC(4,3) Current confidence
rerank_score NUMERIC(6,5) Final score
retrieved_at TIMESTAMPTZ UTC
Indexes: (persona_spec_id, retrieved_at DESC), (retrieved_entity_type,
retrieved_entity_id).
retrieval_logs
persona_specs
└── learning_runs
└── query_plans
└── sources
└── source_fetches
└── documents
└── document_sections
└── atom_evidence
└── knowledge_atoms
├── atom_versions
├── atom_clusters
├── atom_validation_scores
├── claim_relations
├── atom_constraint_checks
├── atom_concepts
└── embeddings
source_publishers ──> sources
source_publishers ──> source_reputation_assessments
constraints ──> constraint_evidence
constraints ──> atom_constraint_checks
concepts ──> concept_aliases / concept_relations / atom_concepts
Use PostgreSQL ENUMs or lookup tables. Lookup tables are easier to extend.
atom_type:
concept | claim | procedure | heuristic | case | constraint
source_class:
official | academic | professional | publisher | expert | community | unknown | spa
evidence_type:
opinion | anecdote | guidance | case_study | dataset | experiment | study | standar
stance:
supports | contradicts | qualifies | defines | illustrates | mentions
validation_status:
unreviewed | supported | mixed | disputed | insufficient_evidence | rejected_by_con
confidence_band:
high | supported | tentative | weak
review_status:
open | assigned | approved | rejected | edited | deferred
Key Relationships
Critical Enumerations
1. A search query discovers a web page.
2. Create sources record with its URL and type.
3. Fetch it; create source_fetches record and save raw object.
4. Normalize it into documents; split it into document_sections.
5. Extract an atomic statement into knowledge_atoms.
6. Create atom_evidence pointing to the exact section, with stance supports or contradicts.
7. Find matching atoms; create an atom_cluster and cluster members.
8. Run validators; persist detailed output in validation_runs and final components in
atom_validation_scores.
9. Associate key terms via concepts and atom_concepts.
10. Generate an embedding registry entry in embeddings.
11. At query time, return the atom with score, source evidence, conflict state, and recency—not
an unsupported statement.
Need Practical MVP choice
Main relational database PostgreSQL
JSON metadata PostgreSQL JSONB
Full-text search PostgreSQL FTS
Vector search pgvector first; Qdrant if scale/operations demand it
Raw and normalized file storage MinIO/S3-compatible object storage
Background jobs Celery/RQ/Temporal/BullMQ, depending on backend language
Crawling/HTML extraction Playwright + extraction library, or a managed crawler
Schema migrations Alembic, Prisma, Drizzle, Flyway, or equivalent
Admin/review UI Minimal internal dashboard backed by review_tasks
1. persona_specs, learning_runs, domains, persona_domains
2. source_publishers, sources, source_fetches
3. documents, document_sections, document_domain_tags
4. knowledge_atoms, atom_evidence, atom_domains, atom_versions
5. source_reputation_assessments, atom_validation_scores, review_tasks
Example: One Claim Through the System
Suggested Initial Technology Mapping
MVP Database Build Order
6. embeddings, concepts, atom_concepts, concept_relations
7. atom_clusters, claim_relations, constraints, atom_constraint_checks, retrieval_logs
Start simple. The evidence chain and scoring history are more important than building an
elaborate graph on day one.
Do not allow a knowledge atom to be approved without at least one atom_evidence record.
Do not calculate confidence without recording score components and algorithm version.
Do not collapse contradictory claims into a single “truth” record without retaining
opposition evidence.
Do not overwrite source documents or atom versions; append new versions.
Do not retrieve weak/disputed atoms as facts by default.
Do not let a future persona runtime hide its uncertainty when the evidence store is
incomplete or conflicted.
Non-Negotiable Integrity Rules