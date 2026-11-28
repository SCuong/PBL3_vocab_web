// Maps vocabulary words and topics to bespoke editorial illustrations in /illustrations/.

const WORD_ILLUSTRATIONS: Record<string, string> = {
  itinerary: '/illustrations/vocab-itinerary.jpg',
  'boarding pass': '/illustrations/vocab-boarding-pass.jpg',
  destination: '/illustrations/vocab-destination.jpg',
  departure: '/illustrations/vocab-departure.jpg',
  luggage: '/illustrations/vocab-luggage.jpg',
  journey: '/illustrations/topic-travel-cover.jpg',
};

const TOPIC_ILLUSTRATIONS: Array<{ pattern: RegExp; src: string }> = [
  { pattern: /health|lifestyle|fitness|well|sport|medic/i, src: '/illustrations/topic-health-cover.webp' },
  { pattern: /home|routine|house|apartment|living/i, src: '/illustrations/topic-home-cover.webp' },
  { pattern: /travel|trip|flight|airport|explore|tour/i, src: '/illustrations/topic-travel-cover.webp' },
  { pattern: /food|drink|greet|intro|chat|cafe|coffee|communi|friend/i, src: '/illustrations/topic-food-cover.webp' },
  { pattern: /work|office|career|edu|business|study|job/i, src: '/illustrations/topic-work-cover.webp' },
];

const FALLBACK_COVERS = [
  '/illustrations/topic-food-cover.webp',
  '/illustrations/topic-home-cover.webp',
  '/illustrations/topic-travel-cover.webp',
  '/illustrations/topic-work-cover.webp',
  '/illustrations/topic-health-cover.webp',
];

export function getVocabIllustration(word?: string, topicName?: string, imageUrl?: string): string {
  const explicit = (imageUrl ?? '').trim();
  if (explicit) {
    return explicit;
  }
  const key = (word ?? '').trim().toLowerCase();
  if (key && WORD_ILLUSTRATIONS[key]) {
    return WORD_ILLUSTRATIONS[key];
  }
  return getTopicIllustration(topicName, key.length);
}

export function getTopicIllustration(topicName?: string, seed = 0): string {
  const name = (topicName ?? '').trim();
  for (const entry of TOPIC_ILLUSTRATIONS) {
    if (entry.pattern.test(name)) return entry.src;
  }
  return FALLBACK_COVERS[Math.abs(seed) % FALLBACK_COVERS.length];
}
