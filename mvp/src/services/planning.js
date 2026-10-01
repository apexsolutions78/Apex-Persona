const queryKinds = [
  {
    type: 'definition',
    sourceClasses: ['official', 'academic', 'professional'],
    templates: [
      (topic, goal) => `What are the foundational concepts and terminology of ${topic} for ${goal}?`,
      (topic) => `How is ${topic} defined, scoped, and distinguished from adjacent concepts?`,
    ],
  },
  {
    type: 'official',
    sourceClasses: ['official'],
    templates: [
      (topic) => `What official rules, standards, or specifications govern ${topic}?`,
      (topic) => `Which primary documentation is authoritative for ${topic}?`,
    ],
  },
  {
    type: 'research',
    sourceClasses: ['academic', 'official', 'professional'],
    templates: [
      (topic) => `What high-quality research and evidence evaluates ${topic}?`,
      (topic) => `What measurements, datasets, or studies support claims about ${topic}?`,
    ],
  },
  {
    type: 'procedure',
    sourceClasses: ['official', 'professional', 'expert'],
    templates: [
      (topic, goal) => `What procedures and practical methods for ${topic} help accomplish ${goal}?`,
      (topic) => `What are the recommended steps, prerequisites, and checks for ${topic}?`,
    ],
  },
  {
    type: 'case_study',
    sourceClasses: ['academic', 'professional', 'publisher'],
    templates: [
      (topic) => `What documented case studies show outcomes from applying ${topic}?`,
      (topic) => `What context, actions, outcomes, and limitations are reported in ${topic} cases?`,
    ],
  },
  {
    type: 'failure_mode',
    sourceClasses: ['academic', 'professional', 'community'],
    templates: [
      (topic) => `What common failure modes, risks, and mistakes occur in ${topic}?`,
      (topic) => `What conditions cause approaches to ${topic} to fail, and how are failures detected?`,
    ],
  },
  {
    type: 'critique',
    sourceClasses: ['academic', 'professional', 'community'],
    templates: [
      (topic) => `What credible criticism, limitations, or counter-evidence exists for ${topic}?`,
      (topic) => `Which claims about ${topic} are disputed or depend on context?`,
    ],
  },
  {
    type: 'current_update',
    sourceClasses: ['official', 'academic', 'professional'],
    templates: [
      (topic) => `What has changed recently in ${topic}, and what is the effective date?`,
      (topic) => `Which current guidance or evidence about ${topic} supersedes older information?`,
    ],
  },
];

export function generateQueryPlan({ learningGoal, includeTopics = [], excludeTopics = [] }) {
  if (typeof learningGoal !== 'string' || !learningGoal.trim()) {
    throw new TypeError('learningGoal is required');
  }
  const excluded = new Set(excludeTopics.map(normalize).filter(Boolean));
  const configuredTopics = includeTopics.map((topic) => String(topic).trim()).filter(Boolean);
  const topics = (configuredTopics.length ? configuredTopics : [learningGoal.trim()])
    .filter((topic) => !excluded.has(normalize(topic)))
    .slice(0, 3);
  if (!topics.length) throw new RangeError('At least one in-scope topic is required to plan a learning run');

  const results = [];
  for (const topic of topics) {
    for (const [kindIndex, kind] of queryKinds.entries()) {
      const template = kind.templates[0];
      results.push({
        topic,
        query_text: template(topic, learningGoal.trim()),
        query_type: kind.type,
        target_source_classes: kind.sourceClasses,
        priority: 100 - kindIndex * 8 - results.length,
        status: 'planned',
      });
    }
  }
  if (results.length < 10) {
    for (const kindIndex of [0, 3]) {
      const kind = queryKinds[kindIndex];
      const topic = topics[0];
      results.push({
        topic,
        query_text: kind.templates[1](topic, learningGoal.trim()),
        query_type: kind.type,
        target_source_classes: kind.sourceClasses,
        priority: 100 - kindIndex * 8 - results.length,
        status: 'planned',
      });
    }
  }
  return results.slice(0, 30);
}

function normalize(value) {
  return String(value).normalize('NFKC').trim().toLocaleLowerCase('en');
}

export const queryPlanIntents = queryKinds.map(({ type }) => type);
