import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient, { assetBaseURL } from '../api/client';
import Navbar from '../components/Navbar';
import ImageDropzone from '../components/ImageDropzone';
import ComplaintMap from '../components/ComplaintMap';
import { PriorityBadge, StatusBadge, SentimentBadge } from '../components/Badges';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/ui/Skeleton';
import PageTransition from '../components/ui/PageTransition';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackReview, setFeedbackReview] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    apiClient
      .get(`/complaints/${id}`)
      .then(({ data }) => setComplaint(data))
      .catch(() => setError('Failed to load complaint'));
  }, [id]);

  const canManage = complaint && user && (user.role === 'admin' || user.id === complaint.user_id);
  const isOwner = complaint && user && user.id === complaint.user_id;

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    if (feedbackRating === 0) {
      setFeedbackError('Please select a star rating');
      return;
    }
    setFeedbackError('');
    setSubmittingFeedback(true);
    try {
      const { data } = await apiClient.post(`/complaints/${id}/feedback`, {
        rating: feedbackRating,
        review: feedbackReview,
      });
      setComplaint(data);
      toast.success('Thanks for your feedback');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to submit feedback';
      setFeedbackError(message);
      toast.error(message);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handleUpload() {
    if (newImages.length === 0) return;
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      newImages.forEach((file) => formData.append('images', file));
      const { data } = await apiClient.post(`/complaints/${id}/images`, formData);
      setComplaint((prev) => ({ ...prev, images: [...prev.images, ...data] }));
      setNewImages([]);
      toast.success(`${data.length} photo${data.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to upload images';
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId) {
    setDeletingId(imageId);
    try {
      await apiClient.delete(`/complaints/${id}/images/${imageId}`);
      setComplaint((prev) => ({ ...prev, images: prev.images.filter((img) => img.id !== imageId) }));
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <PageTransition className="max-w-2xl mx-auto px-6 py-8">
        <Link to="/dashboard" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
          &larr; Back to my complaints
        </Link>

        {error && <p className="text-red-600 dark:text-red-400 mt-4">{error}</p>}
        {!complaint && !error && (
          <div className="mt-4">
            <SkeletonCard />
          </div>
        )}

        {complaint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 mt-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{complaint.title}</h1>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">{complaint.description}</p>

            {complaint.location_text && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">📍 {complaint.location_text}</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              👤 Assigned to: <span className="font-medium text-slate-900 dark:text-slate-100">{complaint.assigned_officer_name || 'Unassigned'}</span>
            </p>
            {complaint.latitude != null && complaint.longitude != null && (
              <div className="mb-4">
                <ComplaintMap
                  latitude={complaint.latitude}
                  longitude={complaint.longitude}
                  address={complaint.location_text}
                />
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Photos</h2>

              {complaint.images.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-1">
                  {complaint.images.map((image) => (
                    <div key={image.id}>
                      <div className="relative group">
                        <a href={`${assetBaseURL}${image.file_path}`} target="_blank" rel="noreferrer">
                          <img
                            src={`${assetBaseURL}${image.file_path}`}
                            alt={image.original_name || 'Complaint photo'}
                            className="w-full aspect-square object-cover rounded-md border border-slate-200 dark:border-slate-700"
                          />
                        </a>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(image.id)}
                            disabled={deletingId === image.id}
                            className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-900 dark:bg-slate-600 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            aria-label="Delete photo"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {image.detected_objects?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {image.detected_objects.map((d, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                              {d.label} ({Math.round(d.confidence * 100)}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">No photos attached.</p>
              )}

              {complaint.images.some((img) => img.analysis_is_placeholder) && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                  Automated photo analysis (potholes, garbage, leaks, etc.) isn't configured for this deployment yet — no detection model is trained.
                </p>
              )}

              {canManage && (
                <div>
                  <ImageDropzone files={newImages} onChange={setNewImages} disabled={uploading} />
                  {uploadError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{uploadError}</p>}
                  {newImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-3 px-4 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : `Upload ${newImages.length} photo${newImages.length > 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">AI Analysis</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Category:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{complaint.ai_category || 'N/A'}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-3">Department:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{complaint.department_name || 'Unassigned'}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-3">Priority:</span>
                <PriorityBadge priority={complaint.ai_priority} />
                {complaint.sentiment && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400 ml-3">Sentiment:</span>
                    <SentimentBadge sentiment={complaint.sentiment} />
                  </>
                )}
              </div>
              {complaint.ai_confidence != null && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Confidence: {(complaint.ai_confidence * 100).toFixed(1)}%
                </p>
              )}
              {complaint.estimated_resolution_label && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  <span className="text-slate-500 dark:text-slate-400">Estimated Resolution:</span>{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{complaint.estimated_resolution_label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500"> (SLA-based estimate, not a guarantee)</span>
                </p>
              )}
            </div>

            {complaint.status === 'resolved' && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Feedback</h2>

                {complaint.feedback_rating ? (
                  <div>
                    <StarRating value={complaint.feedback_rating} readOnly />
                    {complaint.feedback_review && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{complaint.feedback_review}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Rated {new Date(complaint.feedback_created_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : isOwner ? (
                  <form onSubmit={handleSubmitFeedback}>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">How satisfied are you with the resolution?</p>
                    <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                    <textarea
                      value={feedbackReview}
                      onChange={(e) => setFeedbackReview(e.target.value)}
                      rows={3}
                      placeholder="Optional review..."
                      className="w-full mt-3 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    {feedbackError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{feedbackError}</p>}
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="mt-3 px-4 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-50"
                    >
                      {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No feedback submitted yet.</p>
                )}
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              Submitted {new Date(complaint.created_at).toLocaleString()}
            </p>
          </motion.div>
        )}
      </PageTransition>
    </div>
  );
}
