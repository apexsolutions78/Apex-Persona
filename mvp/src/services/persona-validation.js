const sourceTypes = new Set(['web_page', 'pdf', 'paper', 'book', 'video', 'podcast', 'forum_thread', 'repository', 'dataset', 'uploaded_file']);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validatePersonaInput(input) {
  const errors = [];
  if (!isObject(input)) return ['Request body must be a JSON object'];
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 200) errors.push('name is required and must be 1–200 characters');
  if (typeof input.learning_goal !== 'string' || !input.learning_goal.trim() || input.learning_goal.trim().length > 10_000) errors.push('learning_goal is required and must be 1–10,000 characters');
  if (!isObject(input.scope)) errors.push('scope must be a JSON object');
  else {
    const include = input.scope.include_topics ?? [];
    const exclude = input.scope.exclude_topics ?? [];
    const domains = input.scope.domains ?? [];
    if (![include, exclude, domains].every(Array.isArray)) errors.push('scope include_topics, exclude_topics, and domains must be arrays');
    else {
      const topics = [...include, ...exclude];
      if (!topics.some((topic) => typeof topic === 'string' && topic.trim())) errors.push('scope must include at least one boundary topic');
      if (topics.some((topic) => typeof topic !== 'string' || !topic.trim() || topic.length > 500)) errors.push('scope topics must be non-empty strings of at most 500 characters');
      if (topics.length > 40) errors.push('scope can contain at most 40 included and excluded topics');
      if (domains.some((domain) => typeof domain !== 'string' || !domain.trim() || domain.length > 200)) errors.push('scope domains must be non-empty strings of at most 200 characters');
    }
  }
  if (input.role_description !== undefined && (typeof input.role_description !== 'string' || input.role_description.length > 10_000)) errors.push('role_description must be a string of at most 10,000 characters');
  if (input.risk_level !== undefined && !['low', 'medium', 'high', 'regulated'].includes(input.risk_level)) errors.push('risk_level is unsupported');
  if (input.created_by !== undefined && (typeof input.created_by !== 'string' || input.created_by.length > 200)) errors.push('created_by must be a string of at most 200 characters');

  const freshness = input.freshness_policy;
  if (freshness !== undefined) {
    if (!isObject(freshness)) errors.push('freshness_policy must be a JSON object');
    else if (freshness.fast_changing_domain !== undefined && typeof freshness.fast_changing_domain !== 'boolean') errors.push('freshness_policy.fast_changing_domain must be boolean');
    else if (freshness.preferred_age_months !== undefined && (!Number.isInteger(freshness.preferred_age_months) || freshness.preferred_age_months < 1 || freshness.preferred_age_months > 600)) errors.push('freshness_policy.preferred_age_months must be between 1 and 600');
  }

  const source = input.source_policy;
  if (source !== undefined) {
    if (!isObject(source)) errors.push('source_policy must be a JSON object');
    else {
      for (const field of ['allowed_source_types', 'allowed_domains', 'prohibited_domains']) {
        if (source[field] !== undefined && (!Array.isArray(source[field]) || source[field].some((value) => typeof value !== 'string' || !value.trim()))) errors.push(`source_policy.${field} must be an array of non-empty strings`);
      }
      if (Array.isArray(source.allowed_source_types) && source.allowed_source_types.some((type) => !sourceTypes.has(type))) errors.push('source_policy.allowed_source_types contains an unsupported type');
      if (source.max_documents_per_run !== undefined && (!Number.isInteger(source.max_documents_per_run) || source.max_documents_per_run < 1 || source.max_documents_per_run > 1000)) errors.push('source_policy.max_documents_per_run must be between 1 and 1,000');
    }
  }

  const policy = input.learning_policy;
  if (policy !== undefined) {
    if (!isObject(policy)) errors.push('learning_policy must be a JSON object');
    else {
      for (const field of ['minimum_core_confidence', 'human_review_threshold']) {
        if (policy[field] !== undefined && (typeof policy[field] !== 'number' || policy[field] < 0 || policy[field] > 1)) errors.push(`learning_policy.${field} must be between 0 and 1`);
      }
      if (policy.minimum_sources_for_high_confidence !== undefined && (!Number.isInteger(policy.minimum_sources_for_high_confidence) || policy.minimum_sources_for_high_confidence < 1 || policy.minimum_sources_for_high_confidence > 100)) errors.push('learning_policy.minimum_sources_for_high_confidence must be between 1 and 100');
    }
  }
  return errors;
}

export function validateRunType(runType) {
  return ['initial_build', 'refresh', 'manual_import', 'revalidation'].includes(runType);
}
