import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import PageTransition from '../components/ui/PageTransition';
import { TicketStub, NoticeCard } from '../components/civic';
import { useLanguage } from '../context/LanguageContext';

const FEATURES = [
  {
    icon: '🏷️',
    title: 'AI Classification',
    body: 'Every complaint is auto-sorted into a category and routed to the right department.',
  },
  {
    icon: '⏱️',
    title: 'Priority Detection',
    body: 'Keyword and category signals flag Critical/High-priority issues for faster response.',
  },
  {
    icon: '🔁',
    title: 'Duplicate Detection',
    body: "Sentence-embedding similarity groups near-identical reports so the same issue isn't worked twice.",
  },
  {
    icon: '🗺️',
    title: 'Hotspot Mapping',
    body: 'Geo-clustering surfaces neighborhoods with recurring problems on an admin map.',
  },
  {
    icon: '🎙️',
    title: 'Voice Complaints',
    body: "Speak your complaint instead of typing it, using your browser's built-in speech recognition.",
  },
  {
    icon: '🚨',
    title: 'Spam & Fake Detection',
    body: 'Heuristic checks flag promotional junk, gibberish text, and resubmitted complaints for admin review.',
  },
  {
    icon: '📷',
    title: 'Photo Analysis',
    body: 'Uploaded photos are scanned with an object-detection model plus heuristic pothole/garbage/water-logging candidates.',
  },
  {
    icon: '📊',
    title: 'Resolution Estimates',
    body: 'A trained regression model gives citizens a realistic time-to-resolution estimate.',
  },
  {
    icon: '💬',
    title: 'Help Chatbot',
    body: 'A rule-based assistant answers status and process questions right in the dashboard.',
  },
];

const STEPS = [
  {
    n: 1,
    title: 'Submit',
    body: 'Describe the issue — by typing or speaking — and optionally attach a photo and location.',
  },
  {
    n: 2,
    title: 'AI Triage',
    body: 'The system classifies, prioritizes, and routes it to the right department automatically.',
  },
  {
    n: 3,
    title: 'Officer Action',
    body: 'Admins assign a field officer and track the complaint through to resolution.',
  },
  {
    n: 4,
    title: 'Feedback',
    body: 'Once resolved, citizens rate the outcome — closing the loop.',
  },
];

export default function Landing() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <PublicNav />

      <PageTransition>
        <section className="city-hero relative min-h-[650px] px-6 pb-32 pt-28 text-left">
          <div className="absolute inset-0 bg-[#0b1424]/45" />

          <div className="relative mx-auto max-w-7xl">
            <p className="mb-4 inline-flex rounded-full bg-civic-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-civic dark:bg-civic/20 dark:text-seal-green">
              {t('AI-powered governance')}
            </p>

            <h1 className="mb-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t('Empowering Indian cities with AI-driven civic action.')}
            </h1>

            <p className="mb-8 max-w-2xl text-lg leading-8 text-white/80">
              {t('Civic AI takes a citizen complaint about roads, water, electricity, garbage, or safety and uses machine learning to classify it, prioritize it, and get it in front of the right department — with full tracking from submission to resolution.')}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="rounded-md bg-civic px-5 py-3 font-semibold text-white transition-colors hover:bg-civic-bright"
              >
                {t('Submit a complaint')}
              </Link>

              <Link
                to="/login"
                className="rounded-md border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {t('Citizen Login')}
              </Link>

              <Link
                to="/admin/login"
                className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white"
              >
                {t('Staff portal')}
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-paper-line bg-white py-14 dark:border-board-line dark:bg-board">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-ink dark:text-paper">
              {t('Built for transparent civic action')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <NoticeCard key={f.title} pin={false} className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none">{f.icon}</span>

                    <div>
                      <h3 className="mb-1 text-sm font-medium text-ink dark:text-paper">
                        {t(f.title)}
                      </h3>

                      <p className="text-xs leading-relaxed text-ink-soft">
                        {t(f.body)}
                      </p>
                    </div>
                  </div>
                </NoticeCard>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-ink dark:text-paper">
            {t('How it works')}
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <TicketStub key={s.n} number={s.n} className="h-full">
                <h3 className="mb-1 mt-2 text-sm font-medium text-ink dark:text-paper">
                  {t(s.title)}
                </h3>

                <p className="text-xs leading-relaxed text-ink-soft">
                  {t(s.body)}
                </p>
              </TicketStub>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl border-t border-paper-line px-6 py-12 text-center dark:border-board-line">
          <h2 className="mb-3 text-xl font-display font-semibold text-ink dark:text-paper">
            {t('Ready to report something?')}
          </h2>

          <p className="mb-6 text-sm text-ink-soft">
            {t('Registration takes under a minute — no department knowledge required.')}
          </p>

          <Link
            to="/register"
            className="inline-block bg-ink px-6 py-2.5 font-medium text-paper transition-colors hover:bg-ink/90"
          >
            {t('Get Started')}
          </Link>
        </section>

        <footer className="border-t border-paper-line py-6 text-center dark:border-board-line">
          <p className="text-xs text-ink-soft">
            <Link
              to="/about"
              className="underline hover:text-brass"
            >
              {t('About this project')}
            </Link>
          </p>
        </footer>
      </PageTransition>
    </div>
  );
}
