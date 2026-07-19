import PublicNav from '../components/PublicNav';
import PageTransition from '../components/ui/PageTransition';
import { NoticeCard, MetricRow } from '../components/civic';

const AI_CAPABILITIES = [
  {
    title: 'Category & department classification',
    status: 'Trained ML model',
    body: 'A scikit-learn text classifier trained on seed complaint data sorts each submission into one of 8 categories (Roads, Water Supply, Electricity, Garbage, Drainage, Health, Transport, Public Safety) and maps it to a department.',
  },
  {
    title: 'Priority detection',
    status: 'Rule-based',
    body: 'Keyword and category signals (e.g. "gas leak", "live wire") assign Critical/High/Medium/Low priority.',
  },
  {
    title: 'Sentiment analysis',
    status: 'Rule-based (VADER)',
    body: 'The complaint text is scored for sentiment to help admins spot distressed citizens.',
  },
  {
    title: 'Duplicate & repeated-submission detection',
    status: 'Trained ML model',
    body: 'Sentence embeddings (all-MiniLM-L6-v2) compare each new complaint against existing ones via cosine similarity to flag likely duplicates and repeat submissions from the same user.',
  },
  {
    title: 'Hotspot mapping',
    status: 'ML (DBSCAN clustering)',
    body: 'Geo-tagged complaints are clustered to surface neighborhoods with recurring issues.',
  },
  {
    title: 'Spam detection',
    status: 'Rule-based',
    body: 'Text is scored for spam signals — promotional phrasing, links, excessive caps, repeated characters — independent of the fake-complaint check below.',
  },
  {
    title: 'Fake-complaint detection',
    status: 'Composite heuristic',
    body: 'Combines a text-gibberish check (no-vowel words, consonant clusters, repetitive wording) with the spam score and duplicate/repeated-submission signals into one fake-likelihood score for admin review.',
  },
  {
    title: 'Photo analysis',
    status: 'Pretrained model + heuristics',
    body: 'Uploaded photos run through a pretrained YOLOv8n object-detection model (general objects — cars, people, etc. — not civic-issue-specific) plus lightweight OpenCV heuristics that flag pothole, garbage, and water-logging candidates. No labeled civic-imagery dataset exists yet, so heuristic results are rough hints, not verified findings.',
  },
  {
    title: 'Resolution-time estimate',
    status: 'Trained ML model (synthetic data)',
    body: 'A RandomForest regressor estimates hours-to-resolution by category and priority. It\'s trained on synthetic data derived from typical SLA targets, since this deployment has no real historical resolution-time data yet.',
  },
  {
    title: 'Voice complaints',
    status: 'Browser API',
    body: 'Citizens can speak a complaint instead of typing, using the browser\'s built-in Web Speech API (Chrome/Edge).',
  },
  {
    title: 'Help chatbot',
    status: 'Rule-based',
    body: 'Answers common status/process questions in the dashboard — no LLM involved.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <PublicNav />

      <PageTransition className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-2">About</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-4">What Civic AI is</h1>
        <p className="text-ink-soft leading-relaxed mb-6">
          Civic AI is a vertical slice of a civic grievance-redressal platform: a citizen submits a complaint, a set
          of machine-learning and rule-based models classify and triage it, and an admin dashboard lets department
          staff track it through to resolution. It's built to show the shape of a full system — real classification,
          real duplicate detection, real clustering — without pretending every AI feature is production-grade yet.
        </p>

        <MetricRow
          className="mb-10"
          metrics={[
            { label: 'Complaint categories', value: '8' },
            { label: 'Services', value: '3' },
            { label: 'AI/ML features', value: AI_CAPABILITIES.length.toString() },
          ]}
        />

        <h2 className="text-lg font-display font-semibold text-ink dark:text-paper mb-1">AI capabilities, honestly labeled</h2>
        <p className="text-sm text-ink-soft mb-6">
          Each feature below is tagged with what actually powers it — a trained model, a rule-based heuristic, or a
          pretrained third-party model — so it's clear what to trust and what to treat as a rough signal.
        </p>

        <div className="space-y-3 mb-10">
          {AI_CAPABILITIES.map((c) => (
            <NoticeCard key={c.title} pin={false}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-ink dark:text-paper">{c.title}</h3>
                <span className="px-2 py-0.5 bg-paper-warm dark:bg-board-line text-ink-soft text-[10px] font-mono uppercase tracking-wide">
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">{c.body}</p>
            </NoticeCard>
          ))}
        </div>

        <h2 className="text-lg font-display font-semibold text-ink dark:text-paper mb-2">Tech stack</h2>
        <ul className="text-sm text-ink-soft space-y-1 mb-2 list-disc list-inside">
          <li>Backend API — Node/Express + PostgreSQL + JWT auth</li>
          <li>AI service — Python/FastAPI + scikit-learn + sentence-transformers + YOLOv8 (Ultralytics) + OpenCV</li>
          <li>Frontend — React + Vite + Tailwind CSS</li>
        </ul>
      </PageTransition>
    </div>
  );
}
