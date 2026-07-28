import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient, { assetBaseURL } from '../api/client';
import Navbar from '../components/Navbar';
import ImageDropzone from '../components/ImageDropzone';
import ComplaintMap from '../components/ComplaintMap';
import { PriorityBadge, SentimentBadge } from '../components/Badges';
import { StatusFlap, StampBadge, NoticeCard } from '../components/civic';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/ui/Skeleton';
import PageTransition from '../components/ui/PageTransition';

const TRACK_STEPS = [
  { key: 'submitted', label: 'Received', tone: 'brass' },
  { key: 'in_progress', label: 'In Progress', tone: 'flap-amber' },
  { key: 'resolved', label: 'Resolved', tone: 'seal-green' },
];

function trackIndex(status) {
  if (status === 'rejected') return -1;
  return TRACK_STEPS.findIndex((s) => s.key === status);
}

function TicketTracker({ status }) {
  const current = trackIndex(status);

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3">
        <StatusFlap label="Received" tone="ink-soft" className="opacity-40" />
        <span className="w-4 h-px bg-paper-line dark:bg-board-line" />
        <StampBadge label="Rejected" tone="stamp-red" size={64} className="text-[10px]" />
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-3">
      {TRACK_STEPS.map((step, i) => {
        const reached = current >= i;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <StatusFlap label={step.label} tone={reached ? step.tone : 'ink-soft'} className={reached ? '' : 'opacity-40'} />
            {i < TRACK_STEPS.length - 1 && <span className="w-4 h-px bg-paper-line dark:bg-board-line" />}
          </div>
        );
      })}
      {status === 'resolved' && <StampBadge label="Resolved" tone="seal-green" size={64} className="text-[10px] ml-1" />}
    </div>
  );
}

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
  const isStaff = user && (user.role === 'admin' || user.role === 'dept_admin');
  const backTo = isStaff ? '/admin/dashboard' : '/dashboard';
  const backLabel = isStaff ? '← Back to all complaints' : '← Back to my complaints';

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
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="max-w-2xl mx-auto px-6 py-8">
        <Link to={backTo} className="text-sm text-ink-soft hover:text-ink dark:hover:text-paper">
          {backLabel}
        </Link>

        {error && <p className="text-stamp-red mt-4">{error}</p>}
        {!complaint && !error && (
          <div className="mt-4">
            <SkeletonCard />
          </div>
        )}

        {complaint && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <NoticeCard className="mt-4" pin={false}>
              <p className="font-mono text-xs text-stamp-red mb-1">№ {complaint.id}</p>
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-xl font-display font-semibold text-ink dark:text-paper">{complaint.title}</h1>
              </div>

              <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-2">Ticket status</p>
              <TicketTracker status={complaint.status} />

              <p className="text-ink-soft mt-5 mb-4">{complaint.description}</p>

              {complaint.location_text && (
                <p className="text-sm text-ink-soft mb-2">📍 {complaint.location_text}</p>
              )}
              <p className="text-sm text-ink-soft mb-2">
                👤 Assigned to: <span className="font-medium text-ink dark:text-paper">{complaint.assigned_officer_name || 'Unassigned'}</span>
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

              <div className="border-t border-paper-line dark:border-board-line pt-4 mt-4">
                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">Photos</h2>

                {complaint.images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-1">
                    {complaint.images.map((image) => (
                      <div key={image.id}>
                        <div className="relative group">
                          <a href={`${assetBaseURL}${image.file_path}`} target="_blank" rel="noreferrer">
                            <img
                              src={`${assetBaseURL}${image.file_path}`}
                              alt={image.original_name || 'Complaint photo'}
                              className="w-full aspect-square object-cover border border-paper-line dark:border-board-line"
                            />
                          </a>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDelete(image.id)}
                              disabled={deletingId === image.id}
                              className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-ink text-paper text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              aria-label="Delete photo"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {image.detected_objects?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {image.detected_objects.map((d, i) => (
                              <span
                                key={i}
                                title={d.source === 'opencv-heuristic' ? 'Heuristic candidate — not a verified finding' : 'Detected via pretrained YOLOv8n (COCO)'}
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                                  d.source === 'opencv-heuristic'
                                    ? 'bg-flap-amber/20 text-ink dark:text-paper border border-flap-amber/50'
                                    : 'bg-paper-warm dark:bg-board-line text-ink-soft'
                                }`}
                              >
                                {d.label} ({Math.round(d.confidence * 100)}%)
                              </span>
                            ))}
                          </div>
                        ) : (
                          !image.analysis_is_placeholder && image.analyzed_at && (
                            <p className="text-[10px] text-ink-soft mt-1">No objects detected.</p>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft mb-3">No photos attached.</p>
                )}

                {complaint.images.some((img) => img.analysis_is_placeholder) && (
                  <p className="text-xs text-ink-soft mb-3">
                    Photo analysis for these images predates this deployment's detection model — re-upload to get fresh results.
                  </p>
                )}
                {complaint.images.some((img) => !img.analysis_is_placeholder && img.analyzed_at) && (
                  <p className="text-xs text-ink-soft mb-3">
                    Amber tags are rough OpenCV heuristic candidates (potholes, garbage, water-logging) — not verified findings. Other tags come from a pretrained general object-detection model.
                  </p>
                )}

                {canManage && (
                  <div>
                    <ImageDropzone files={newImages} onChange={setNewImages} disabled={uploading} />
                    {uploadError && <p className="text-xs text-stamp-red mt-2">{uploadError}</p>}
                    {newImages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        className="mt-3 px-4 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 disabled:opacity-50"
                      >
                        {uploading ? 'Uploading...' : `Upload ${newImages.length} photo${newImages.length > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-paper-line dark:border-board-line pt-4 mt-4">
                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">AI Analysis</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">Category:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.ai_category || 'N/A'}</span>
                  <span className="text-ink-soft ml-3">Department:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.department_name || 'Unassigned'}</span>
                  <span className="text-ink-soft ml-3">Priority:</span>
                  <PriorityBadge priority={complaint.ai_priority} />
                  {complaint.sentiment && (
                    <>
                      <span className="text-ink-soft ml-3">Sentiment:</span>
                      <SentimentBadge sentiment={complaint.sentiment} />
                    </>
                  )}
                </div>
                {complaint.ai_confidence != null && (
                  <p className="text-xs font-mono text-ink-soft mt-2">
                    Confidence: {(complaint.ai_confidence * 100).toFixed(1)}%
                  </p>
                )}
                {complaint.estimated_resolution_label && (
                  <p className="text-sm text-ink-soft mt-2">
                    <span className="text-ink-soft">Estimated Resolution:</span>{' '}
                    <span className="font-medium font-mono text-ink dark:text-paper">{complaint.estimated_resolution_label}</span>
                    <span className="text-xs text-ink-soft"> (SLA-based estimate, not a guarantee)</span>
                  </p>
                )}
              </div>

              {complaint.status === 'resolved' && (
                <div className="border-t border-paper-line dark:border-board-line pt-4 mt-4">
                  <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">Feedback</h2>

                  {complaint.feedback_rating ? (
                    <div>
                      <StarRating value={complaint.feedback_rating} readOnly />
                      {complaint.feedback_review && (
                        <p className="text-sm text-ink-soft mt-2">{complaint.feedback_review}</p>
                      )}
                      <p className="text-xs text-ink-soft mt-1">
                        Rated {new Date(complaint.feedback_created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : isOwner ? (
                    <form onSubmit={handleSubmitFeedback}>
                      <p className="text-sm text-ink-soft mb-2">How satisfied are you with the resolution?</p>
                      <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                      <textarea
                        value={feedbackReview}
                        onChange={(e) => setFeedbackReview(e.target.value)}
                        rows={3}
                        placeholder="Optional review..."
                        className="w-full mt-3 px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass placeholder:text-ink-soft"
                      />
                      {feedbackError && <p className="text-xs text-stamp-red mt-1">{feedbackError}</p>}
                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className="mt-3 px-4 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 disabled:opacity-50"
                      >
                        {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-ink-soft">No feedback submitted yet.</p>
                  )}
                </div>
              )}

              <p className="text-xs font-mono text-ink-soft mt-4">
                Submitted {new Date(complaint.created_at).toLocaleString()}
              </p>
            </NoticeCard>
          </motion.div>
        )}
      </PageTransition>
    </div>
  );
}
