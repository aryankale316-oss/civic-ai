import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import PageTransition from '../components/ui/PageTransition';
import { TicketStub, NoticeCard } from '../components/civic';

const FEATURES = [
  { icon: '🏷️', title: 'AI Classification', body: 'Every complaint is auto-sorted into a category and routed to the right department.' },
  { icon: '⏱️', title: 'Priority Detection', body: 'Keyword and category signals flag Critical/High-priority issues for faster response.' },
  { icon: '🔁', title: 'Duplicate Detection', body: 'Sentence-embedding similarity groups near-identical reports so the same issue isn\'t worked twice.' },
  { icon: '🗺️', title: 'Hotspot Mapping', body: 'Geo-clustering surfaces neighborhoods with recurring problems on an admin map.' },
  { icon: '🎙️', title: 'Voice Complaints', body: 'Speak your complaint instead of typing it, using your browser\'s built-in speech recognition.' },
  { icon: '🚨', title: 'Spam & Fake Detection', body: 'Heuristic checks flag promotional junk, gibberish text, and resubmitted complaints for admin review.' },
  { icon: '📷', title: 'Photo Analysis', body: 'Uploaded photos are scanned with an object-detection model plus heuristic pothole/garbage/water-logging candidates.' },
  { icon: '📊', title: 'Resolution Estimates', body: 'A trained regression model gives citizens a realistic time-to-resolution estimate.' },
  { icon: '💬', title: 'Help Chatbot', body: 'A rule-based assistant answers status and process questions right in the dashboard.' },
];

const STEPS = [
  { n: 1, title: 'Submit', body: 'Describe the issue — by typing or speaking — and optionally attach a photo and location.' },
  { n: 2, title: 'AI Triage', body: 'The system classifies, prioritizes, and routes it to the right department automatically.' },
  { n: 3, title: 'Officer Action', body: 'Admins assign a field officer and track the complaint through to resolution.' },
  { n: 4, title: 'Feedback', body: 'Once resolved, citizens rate the outcome — closing the loop.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <PublicNav />

      <PageTransition>
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-3">Civic Grievance Platform</p>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold text-ink dark:text-paper mb-4">
            Report an issue. Let AI route it. Watch it get fixed.
          </h1>
          <p className="text-ink-soft max-w-2xl mx-auto mb-8">
            Civic AI takes a citizen complaint about roads, water, electricity, garbage, or safety and uses machine
            learning to classify it, prioritize it, and get it in front of the right department — with full tracking
            from submission to resolution.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="px-5 py-2.5 bg-ink text-paper hover:bg-ink/90 transition-colors font-medium">
              Register as Citizen
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 border border-ink/30 dark:border-paper-line/30 text-ink dark:text-paper hover:border-brass transition-colors font-medium"
            >
              Citizen Login
            </Link>
            <Link to="/admin/login" className="px-5 py-2.5 text-sm text-ink-soft underline hover:text-brass">
              Admin login
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-10 border-t border-paper-line dark:border-board-line">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-6 text-center">What's under the hood</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <NoticeCard key={f.title} pin={false} className="h-full">
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none">{f.icon}</span>
                  <div>
                    <h3 className="text-sm font-medium text-ink dark:text-paper mb-1">{f.title}</h3>
                    <p className="text-xs text-ink-soft leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </NoticeCard>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-10 border-t border-paper-line dark:border-board-line">
          <h2 className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-6 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <TicketStub key={s.n} number={s.n} className="h-full">
                <h3 className="text-sm font-medium text-ink dark:text-paper mb-1 mt-2">{s.title}</h3>
                <p className="text-xs text-ink-soft leading-relaxed">{s.body}</p>
              </TicketStub>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-12 text-center border-t border-paper-line dark:border-board-line">
          <h2 className="text-xl font-display font-semibold text-ink dark:text-paper mb-3">Ready to report something?</h2>
          <p className="text-sm text-ink-soft mb-6">Registration takes under a minute — no department knowledge required.</p>
          <Link to="/register" className="inline-block px-6 py-2.5 bg-ink text-paper hover:bg-ink/90 transition-colors font-medium">
            Get Started
          </Link>
        </section>

        <footer className="border-t border-paper-line dark:border-board-line py-6 text-center">
          <p className="text-xs text-ink-soft">
            <Link to="/about" className="underline hover:text-brass">About this project</Link>
          </p>
        </footer>
      </PageTransition>
    </div>
  );
}
