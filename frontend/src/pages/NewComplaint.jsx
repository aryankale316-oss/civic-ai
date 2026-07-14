import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import ImageDropzone from '../components/ImageDropzone';
import VoiceInputButton from '../components/VoiceInputButton';
import LocationPicker from '../components/LocationPicker';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper focus:outline-none focus:ring-2 focus:ring-brass placeholder:text-ink-soft';

export default function NewComplaint() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();
  const descriptionBaseRef = useRef('');
  const duplicatesConfirmedRef = useRef(false);

  async function submitComplaint() {
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/complaints', {
        title,
        description,
        location_text: locationText,
        latitude,
        longitude,
      });

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((file) => formData.append('images', file));
        try {
          await apiClient.post(`/complaints/${data.id}/images`, formData);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
        }
      }

      toast.success('Complaint submitted');
      navigate(`/complaints/${data.id}`);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to submit complaint';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!duplicatesConfirmedRef.current) {
      setCheckingDuplicates(true);
      try {
        const { data } = await apiClient.post('/complaints/check-duplicates', { title, description });
        if (data.possible_duplicates?.length > 0) {
          setDuplicates(data.possible_duplicates);
          setCheckingDuplicates(false);
          return;
        }
      } catch (err) {
        console.error('Duplicate check failed:', err);
      }
      setCheckingDuplicates(false);
    }

    setDuplicates([]);
    await submitComplaint();
  }

  function handleSubmitAnyway() {
    duplicatesConfirmedRef.current = true;
    setDuplicates([]);
    submitComplaint();
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="max-w-2xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Intake form</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">Submit a New Complaint</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-board border border-paper-line dark:border-board-line p-6"
        >
          {error && <p className="text-sm text-stamp-red mb-4">{error}</p>}

          <label className="block text-sm text-ink-soft mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pothole on Main Street"
            className={`${INPUT_CLASS} mb-4`}
          />

          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-ink-soft">Description</label>
            <VoiceInputButton
              disabled={loading}
              onListeningChange={(listening) => {
                if (listening) descriptionBaseRef.current = description;
              }}
              onTranscriptChange={(transcript) => {
                const base = descriptionBaseRef.current;
                setDescription(`${base}${base ? ' ' : ''}${transcript}`);
              }}
            />
          </div>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail, or use the mic to speak it..."
            className={`${INPUT_CLASS} mb-4`}
          />

          <label className="block text-sm text-ink-soft mb-1">Location</label>
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="e.g. Main Street, Ward 5"
            className={`${INPUT_CLASS} mb-3`}
          />
          <div className="mb-6">
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              disabled={loading}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onAddressChange={setLocationText}
            />
          </div>

          <label className="block text-sm text-ink-soft mb-1">Photos (optional)</label>
          <div className="mb-6">
            <ImageDropzone files={images} onChange={setImages} disabled={loading} />
          </div>

          {duplicates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 border-l-4 border-flap-amber bg-paper-warm dark:bg-board-line"
            >
              <p className="text-sm font-medium text-ink dark:text-paper mb-2">
                This complaint appears similar to {duplicates.length === 1 ? 'an existing complaint' : 'existing complaints'}:
              </p>
              <ul className="text-sm text-ink-soft space-y-1 mb-3">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link to={`/complaints/${d.id}`} target="_blank" rel="noreferrer" className="underline text-ink dark:text-paper hover:text-brass">
                      #{d.id} — {d.title}
                    </Link>{' '}
                    <span className="text-xs font-mono text-ink-soft">({Math.round(d.similarity * 100)}% similar · {d.status})</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleSubmitAnyway}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-ink dark:border-paper-line text-ink dark:text-paper hover:bg-paper dark:hover:bg-board disabled:opacity-50"
              >
                Submit anyway
              </button>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || checkingDuplicates}
            className="w-full py-2 bg-ink text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {checkingDuplicates
              ? 'Checking for similar complaints...'
              : loading
              ? 'Submitting & classifying...'
              : 'Submit Complaint'}
          </button>
        </form>
      </PageTransition>
    </div>
  );
}
