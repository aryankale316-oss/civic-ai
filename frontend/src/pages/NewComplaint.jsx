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
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500';

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Submit a New Complaint</h1>
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6"
        >
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pothole on Main Street"
            className={`${INPUT_CLASS} mb-4`}
          />

          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-slate-600 dark:text-slate-400">Description</label>
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

          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Location</label>
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

          <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Photos (optional)</label>
          <div className="mb-6">
            <ImageDropzone files={images} onChange={setImages} disabled={loading} />
          </div>

          {duplicates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/10 rounded-md"
            >
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                This complaint appears similar to {duplicates.length === 1 ? 'an existing complaint' : 'existing complaints'}:
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1 mb-3">
                {duplicates.map((d) => (
                  <li key={d.id}>
                    <Link to={`/complaints/${d.id}`} target="_blank" rel="noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-200">
                      #{d.id} — {d.title}
                    </Link>{' '}
                    <span className="text-xs text-amber-500 dark:text-amber-500">({Math.round(d.similarity * 100)}% similar · {d.status})</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleSubmitAnyway}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-amber-800 dark:bg-amber-700 text-white rounded-md hover:bg-amber-900 dark:hover:bg-amber-600 disabled:opacity-50"
              >
                Submit anyway
              </button>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || checkingDuplicates}
            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
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
