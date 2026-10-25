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
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  const current = trackIndex(status);

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3">
        <StatusFlap label={t('Received')} tone="ink-soft" className="opacity-40" />
        <span className="w-4 h-px bg-paper-line dark:bg-board-line" />
        <StampBadge label={t('Rejected')} tone="stamp-red" size={64} className="text-[10px]" />
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-3">
      {TRACK_STEPS.map((step, i) => {
        const reached = current >= i;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <StatusFlap label={t(step.label)} tone={reached ? step.tone : 'ink-soft'} className={reached ? '' : 'opacity-40'} />
            {i < TRACK_STEPS.length - 1 && <span className="w-4 h-px bg-paper-line dark:bg-board-line" />}
          </div>
        );
      })}
      {status === 'resolved' && <StampBadge label={t('Resolved')} tone="seal-green" size={64} className="text-[10px] ml-1" />}
    </div>
  );
}

export default function ComplaintDetail() {
  const { t } = useLanguage();
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
  const backLabel = isStaff ? `← ${t('Back to all complaints')}` : `← ${t('Back to my complaints')}`;

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    if (feedbackRating === 0) {
      setFeedbackError(t('Please select a star rating'));
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
      const uploadedImages = Array.isArray(data) ? data : (data.images || []);
      const refreshed = data.complaint || (await apiClient.get(`/complaints/${id}`)).data;
      setComplaint((prev) => ({ ...prev, ...refreshed, images: [...(prev?.images || []), ...uploadedImages] }));
      setNewImages([]);
      toast.success(`${uploadedImages.length} photo${uploadedImages.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to upload images';
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmImageAssignment() {
    try {
      await apiClient.patch(`/complaints/${id}/confirm-image-assignment`);
      const { data } = await apiClient.get(`/complaints/${id}`);
      setComplaint(data);
      toast.success('Image-based department assignment confirmed after review');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm image-based assignment');
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
      <PageTransition className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Link to={backTo} className="text-sm font-medium text-civic hover:underline dark:text-seal-green">
          {backLabel}
        </Link>

        {error && <p className="text-stamp-red mt-4">{t(error)}</p>}
        {!complaint && !error && (
          <div className="mt-4">
            <SkeletonCard />
          </div>
        )}

        {complaint && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <NoticeCard className="mt-5 p-5 sm:p-8" pin={false}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-civic dark:text-seal-green">CIV-{String(complaint.id).padStart(5, '0')}</p>
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-paper sm:text-3xl">{complaint.title}</h1>
              </div>

              <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-2">{t('Ticket status')}</p>
              <TicketTracker status={complaint.status} />

              <p className="text-ink-soft mt-5 mb-4">{complaint.description}</p>

              {complaint.location_text && (
                <p className="text-sm text-ink-soft mb-2">📍 {complaint.location_text}</p>
              )}
              <p className="text-sm text-ink-soft mb-2">
                👤 {t('Assigned to')}: <span className="font-medium text-ink dark:text-paper">{complaint.assigned_officer_name || t('Unassigned')}</span>
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
                                title={d.source === 'civic-yolo-finetuned' ? t('Experimental civic image model score; verify manually') : d.source === 'opencv-heuristic' ? 'Heuristic candidate — not a verified finding' : 'Detected via pretrained YOLOv8n (COCO)'}
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                                  d.source === 'opencv-heuristic'
                                    ? 'bg-flap-amber/20 text-ink dark:text-paper border border-flap-amber/50'
                                    : 'bg-paper-warm dark:bg-board-line text-ink-soft'
                                }`}
                              >
                                {d.label} ({t('score')} {Number(d.confidence).toFixed(2)})
                              </span>
                            ))}
                          </div>
                        ) : (
                          !image.analysis_is_placeholder && image.analyzed_at && (
                            <p className="text-[10px] text-ink-soft mt-1">No objects detected.</p>
                          )
                        )}
                        {image.image_cross_check && (
                          <div className={`mt-2 rounded border p-2 text-xs ${image.image_cross_check.status === 'possible_mismatch' ? 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100' : 'border-paper-line bg-paper-warm/50 text-ink-soft dark:border-board-line dark:bg-board-line/30'}`}>
                            <p className="font-semibold">
                              {image.image_cross_check.status === 'consistent' ? t('Image and report appear broadly consistent') : image.image_cross_check.status === 'possible_mismatch' ? t('Review possible image/report mismatch') : t('Image/report comparison inconclusive')}
                            </p>
                            <p className="mt-1">{t('This is an AI review hint only; it does not verify the complaint.')}</p>
                          </div>
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
                    {t('Image model results are experimental department suggestions. Verify the photo and report manually; they are not confirmed findings.')}
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
                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{t('AI Analysis')}</h2>
                {complaint.assignment_source === 'image' && (
                  <div className="mb-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-semibold">
                      {complaint.image_assignment_review_required ? t('Image-based department suggestion — manual review required') : t('Image-based department assignment reviewed by staff')}
                    </p>
                    <p className="mt-1">
                      {t('Image suggestion')}: {complaint.image_suggested_department_name ? t(complaint.image_suggested_department_name) : t('Unavailable')}
                      {complaint.image_assignment_score != null && ` · ${t('Model score')}: ${Number(complaint.image_assignment_score).toFixed(2)}`}
                    </p>
                    <p className="mt-1">{t('This experimental model has limited accuracy. Check the photo and complaint before assigning an officer or moving the complaint forward.')}</p>
                    {complaint.image_assignment_review_required && isStaff && (
                      <button
                        type="button"
                        onClick={handleConfirmImageAssignment}
                        className="mt-2 rounded bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                      >
                        {t('I reviewed the photo and confirm this department')}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">{t('Suggested Category')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.ai_category ? t(complaint.ai_category) : 'N/A'}</span>
                  <span className="text-ink-soft ml-3">{t('Assigned Department')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.department_name ? t(complaint.department_name) : t('Unassigned')}</span>
                  {complaint.assignment_source === 'image' ? (
                    <span className="inline-flex rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
                      {complaint.image_assignment_review_required ? t('Image-routed · verify photo') : t('Image routing reviewed')}
                    </span>
                  ) : complaint.assignment_source === 'text' && complaint.department_id ? (
                    <span
                      className="inline-flex rounded-full border border-ai/25 bg-ai-soft px-2 py-0.5 text-[11px] font-medium text-ai dark:bg-ai/20"
                      title={t('Department selected using complaint title and description')}
                    >
                      {t('Text-routed · staff review')}
                    </span>
                  ) : complaint.assignment_source === 'staff' ? (
                    <span className="inline-flex rounded-full border border-paper-line bg-paper-warm px-2 py-0.5 text-[11px] font-medium text-ink-soft dark:border-board-line dark:bg-board">
                      {t('Staff Reassigned')}
                    </span>
                  ) : !complaint.department_id ? (
                    <span className="inline-flex rounded-full border border-paper-line bg-paper-warm px-2 py-0.5 text-[11px] font-medium text-ink-soft dark:border-board-line dark:bg-board">
                      {t('Unassigned · manual review')}
                    </span>
                  ) : null}
                  <span className="text-ink-soft ml-3">{t('Priority')}:</span>
                  <PriorityBadge priority={complaint.ai_priority} />
                  {complaint.sentiment ? (
                    <>
                      <span className="text-ink-soft ml-3">{t('Sentiment')}:</span>
                      <SentimentBadge sentiment={complaint.sentiment} />
                    </>
                  ) : complaint.source_language === 'hi' ? (
                    <>
                      <span className="text-ink-soft ml-3">{t('Sentiment')}:</span>
                      <span className="text-xs text-ink-soft">{t('Not analyzed for Hindi')}</span>
                    </>
                  ) : null}
                </div>
                {complaint.ai_confidence != null && (
                  <p className="text-xs font-mono text-ink-soft mt-2">
                    {t('Confidence')}: {(complaint.ai_confidence * 100).toFixed(1)}% ({t('legacy model probability')})
                  </p>
                )}
                {complaint.ai_category && (
                  <p className="mt-2 text-xs text-ink-soft" role="note">
                    {t('AI category and department routing are suggestions for staff review, not confirmed findings.')}
                  </p>
                )}
                {complaint.source_language === 'hi' && (
                  <p className="mt-1 text-xs text-ink-soft" role="note">
                    {t('Department classification supports English and Hindi. Sentiment analysis and resolution-time estimates are currently skipped for Hindi.')}
                  </p>
                )}
                {complaint.estimated_resolution_label ? (
                  <p className="text-sm text-ink-soft mt-2">
                    <span className="text-ink-soft">{t('Estimated Resolution')}:</span>{' '}
                    <span className="font-medium font-mono text-ink dark:text-paper">{complaint.estimated_resolution_label}</span>
                    <span className="text-xs text-ink-soft"> ({t('SLA-based estimate, not a guarantee')})</span>
                  </p>
                ) : complaint.source_language === 'hi' ? (
                  <p className="text-sm text-ink-soft mt-2">
                    <span className="text-ink-soft">{t('Estimated Resolution')}:</span>{' '}
                    <span className="text-xs text-ink-soft">{t('Not estimated for Hindi')}</span>
                  </p>
                ) : null}
              </div>

              {complaint.status === 'resolved' && (
                <div className="border-t border-paper-line dark:border-board-line pt-4 mt-4">
                  <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{t('Feedback')}</h2>

                  {complaint.feedback_rating ? (
                    <div>
                      <StarRating value={complaint.feedback_rating} readOnly />
                      {complaint.feedback_review && (
                        <p className="text-sm text-ink-soft mt-2">{complaint.feedback_review}</p>
                      )}
                      <p className="text-xs text-ink-soft mt-1">
                        {t('Rated')} {new Date(complaint.feedback_created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : isOwner ? (
                    <form onSubmit={handleSubmitFeedback}>
                      <p className="text-sm text-ink-soft mb-2">{t('How satisfied are you with the resolution?')}</p>
                      <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                      <textarea
                        value={feedbackReview}
                        onChange={(e) => setFeedbackReview(e.target.value)}
                        rows={3}
                        placeholder={t('Optional review...')}
                        className="w-full mt-3 px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper text-sm focus:outline-none focus:ring-2 focus:ring-brass placeholder:text-ink-soft"
                      />
                      {feedbackError && <p className="text-xs text-stamp-red mt-1">{feedbackError}</p>}
                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className="mt-3 px-4 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 disabled:opacity-50"
                      >
                        {submittingFeedback ? t('Submitting...') : t('Submit Feedback')}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-ink-soft">{t('No feedback submitted yet.')}</p>
                  )}
                </div>
              )}

              <p className="text-xs font-mono text-ink-soft mt-4">
                {t('Submitted')} {new Date(complaint.created_at).toLocaleString()}
              </p>
            </NoticeCard>
          </motion.div>
        )}
      </PageTransition>
    </div>
  );
}
