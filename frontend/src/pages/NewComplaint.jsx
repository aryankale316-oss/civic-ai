import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import ImageDropzone from '../components/ImageDropzone';
import VoiceInputButton from '../components/VoiceInputButton';
import LocationPicker from '../components/LocationPicker';
import { useToast } from '../context/ToastContext';

const STEPS = ['Describe', 'Location', 'Photos', 'AI review', 'Submit'];

const CATEGORIES = [
  'Roads',
  'Water Supply',
  'Electricity',
  'Garbage',
  'Drainage',
  'Health',
  'Transport',
  'Public Safety',
];

const INPUT_CLASS =
  'w-full rounded-md border border-paper-line bg-white px-4 py-3 text-ink placeholder:text-ink-soft focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper';

export default function NewComplaint() {
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [images, setImages] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successId, setSuccessId] = useState(null);

  const descriptionBase = useRef('');

  const validStep =
    (step !== 1 || (title.trim() && description.trim())) &&
    (step !== 2 || locationText.trim());

  function next() {
    if (!validStep) {
      setError(
        step === 1
          ? 'Add a title and description to continue.'
          : 'Choose or enter a location to continue.'
      );
      return;
    }

    setError('');
    setStep((s) => s + 1);
  }

  async function runReview() {
    setChecking(true);
    setError('');

    try {
      const { data } = await apiClient.post(
        '/complaints/check-duplicates',
        {
          title,
          description,
        }
      );

      setDuplicates(data.possible_duplicates || []);
    } catch {
      setError(
        'Duplicate check could not run. You can still submit your report.'
      );
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError('');

    try {
      const { data } = await apiClient.post('/complaints', {
        title,
        description,
        location_text: locationText,
        latitude,
        longitude,
      });

      if (images.length) {
        const form = new FormData();

        images.forEach((file) => {
          form.append('images', file);
        });

        await apiClient.post(`/complaints/${data.id}/images`, form);
      }

      setSuccessId(data.id);
      toast.success('Report submitted successfully');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to submit report'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="min-h-screen bg-paper dark:bg-board">
        <Navbar />

        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#55e0ce] text-4xl text-[#0b1424]"
          >
            ✓
          </motion.div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-seal-green">
            Report received
          </p>

          <h1 className="mt-3 text-4xl font-bold text-ink dark:text-paper">
            Thank you for speaking up.
          </h1>

          <p className="mt-4 text-ink-soft">
            Your complaint ID is <b>#{successId}</b>. We will notify you as it
            moves through review and resolution.
          </p>

          <div className="mt-9 flex justify-center gap-3">
            <Link
              to={`/complaints/${successId}`}
              className="rounded-md bg-civic px-5 py-3 font-semibold text-white"
            >
              Track complaint
            </Link>

            <Link
              to="/dashboard"
              className="rounded-md border border-paper-line px-5 py-3 font-semibold text-ink dark:border-board-line dark:text-paper"
            >
              Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />

      <main className="mx-auto max-w-4xl px-5 py-8">
        <p className="text-sm font-semibold text-seal-green">
          REPORT AN ISSUE
        </p>

        <h1 className="mt-2 text-3xl font-bold text-ink dark:text-paper">
          Help make your city better.
        </h1>

        <div className="mt-8 grid grid-cols-5 gap-2">
          {STEPS.map((label, i) => (
            <button
              type="button"
              key={label}
              onClick={() =>
                i + 1 < step && setStep(i + 1)
              }
              className="text-left"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  i + 1 <= step
                    ? 'bg-civic text-white'
                    : 'bg-paper-line text-ink-soft'
                }`}
              >
                {i + 1}
              </span>

              <span
                className={`mt-2 hidden text-xs sm:block ${
                  i + 1 === step
                    ? 'font-bold text-ink dark:text-paper'
                    : 'text-ink-soft'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-paper-line bg-white p-5 shadow-sm dark:border-board-line dark:bg-board sm:p-8">
          {error && (
            <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-stamp-red">
              {error}
            </p>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              {step === 1 && (
                <section>
                  <h2 className="text-2xl font-bold text-ink dark:text-paper">
                    Describe the issue
                  </h2>

                  <p className="mt-1 text-ink-soft">
                    Choose a category to guide your report. AI will make the
                    final routing suggestion.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {CATEGORIES.map((item) => (
                      <button
                        type="button"
                        onClick={() => setCategory(item)}
                        key={item}
                        className={`rounded-full px-3 py-2 text-sm ${
                          category === item
                            ? 'bg-ink text-paper'
                            : 'bg-paper-warm text-ink dark:text-paper'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <label className="mt-6 block text-sm font-medium text-ink dark:text-paper">
                    Short title

                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={`${INPUT_CLASS} mt-2`}
                      placeholder="Example: Large pothole near the bus stop"
                    />
                  </label>

                  <div className="mt-5 flex items-center justify-between">
                    <label className="text-sm font-medium text-ink dark:text-paper">
                      What happened?
                    </label>

                    <VoiceInputButton
                      onListeningChange={(listening) => {
                        if (listening) {
                          descriptionBase.current = description;
                        }
                      }}
                      onTranscriptChange={(text) => {
                        setDescription(
                          `${descriptionBase.current}${
                            descriptionBase.current ? ' ' : ''
                          }${text}`
                        );
                      }}
                    />
                  </div>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className={`${INPUT_CLASS} mt-2`}
                    placeholder="Include useful details, such as severity and landmarks."
                  />
                </section>
              )}

              {step === 2 && (
                <section>
                  <h2 className="text-2xl font-bold text-ink dark:text-paper">
                    Add the location
                  </h2>

                  <p className="mt-1 text-ink-soft">
                    Search or place a pin so the right team can find the issue.
                  </p>

                  <input
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className={`${INPUT_CLASS} mt-5`}
                    placeholder="Street, landmark, or ward"
                  />

                  <div className="mt-4 overflow-hidden rounded-lg border border-paper-line dark:border-board-line">
                    <LocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onLocationChange={(lat, lng) => {
                        setLatitude(lat);
                        setLongitude(lng);
                      }}
                      onAddressChange={setLocationText}
                    />
                  </div>
                </section>
              )}

              {step === 3 && (
                <section>
                  <h2 className="text-2xl font-bold text-ink dark:text-paper">
                    Add photos
                  </h2>

                  <p className="mt-1 text-ink-soft">
                    Photos help staff understand the issue. They are optional.
                  </p>

                  <div className="mt-5">
                    <ImageDropzone
                      files={images}
                      onChange={setImages}
                    />
                  </div>
                </section>
              )}

              {step === 4 && (
                <section>
                  <h2 className="text-2xl font-bold text-ink dark:text-paper">
                    AI review
                  </h2>

                  <p className="mt-1 text-ink-soft">
                    We check for similar reports before you submit. Category
                    and priority are calculated after the report is received.
                  </p>

                  <button
                    type="button"
                    onClick={runReview}
                    disabled={checking}
                    className="mt-6 rounded-md bg-ink px-5 py-3 font-semibold text-paper"
                  >
                    {checking
                      ? 'Checking reports…'
                      : 'Check similar reports'}
                  </button>

                  {duplicates.length > 0 && (
                    <div className="mt-5 rounded-lg bg-amber-50 p-4">
                      <b className="text-amber-900">
                        Possible similar reports
                      </b>

                      {duplicates.map((d) => (
                        <Link
                          key={d.id}
                          to={`/complaints/${d.id}`}
                          className="mt-2 block text-sm text-amber-800 underline"
                        >
                          #{d.id} — {d.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {step === 5 && (
                <section>
                  <h2 className="text-2xl font-bold text-ink dark:text-paper">
                    Review and submit
                  </h2>

                  <div className="mt-5 space-y-3 rounded-lg bg-paper-warm p-5 text-sm dark:bg-board-line">
                    <p>
                      <b>Title:</b> {title}
                    </p>

                    <p>
                      <b>Category:</b> {category || 'Not selected'}
                    </p>

                    <p>
                      <b>Location:</b> {locationText}
                    </p>

                    <p>
                      <b>Description:</b> {description}
                    </p>

                    <p>
                      <b>Photos:</b> {images.length}
                    </p>
                  </div>

                  <p className="mt-5 text-xs text-ink-soft">
                    AI classification, priority, and any image analysis are
                    suggestions for staff review, not confirmed facts.
                  </p>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between gap-3 border-t border-paper-line pt-5 dark:border-board-line">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md px-4 py-3 font-semibold text-ink dark:text-paper"
              >
                Back
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="rounded-md px-4 py-3 font-semibold text-ink dark:text-paper"
              >
                Cancel
              </Link>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-md bg-civic px-5 py-3 font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="rounded-md bg-civic px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}