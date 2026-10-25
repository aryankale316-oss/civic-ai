import os

# 1. Update backend/src/routes/complaints.js
complaints_js_path = r"c:\Users\rushi\civic-ai\backend\src\routes\complaints.js"
with open(complaints_js_path, "r", encoding="utf-8") as f:
    c_content = f.read()

# Change 1: Pass combinedText (citizen's original text) to /classify and return null confidence on error
old_classify_call = """        axios
            .post(`${process.env.AI_SERVICE_URL}/classify`, { text: analysisText })
            .then((r) => r.data)
            .catch((err) => {
                console.error('AI classification call failed, falling back to defaults:', err.message);
                return { category: null, department: null, priority: 'Medium', confidence: 0 };
            }),"""

new_classify_call = """        axios
            .post(`${process.env.AI_SERVICE_URL}/classify`, { text: combinedText })
            .then((r) => r.data)
            .catch((err) => {
                console.error('AI classification call failed, falling back to defaults:', err.message);
                return { category: null, department: null, priority: 'Medium', confidence: null, is_suggestion: false };
            }),"""

assert old_classify_call in c_content, "old_classify_call not found in complaints.js"
c_content = c_content.replace(old_classify_call, new_classify_call, 1)

# Change 2: Query department for both languages if aiResult.department is present
old_dept_query = """    const [deptRow, resolutionResult] = await Promise.all([
        aiResult.department && textPreparation.source_language !== 'hi'
            ? pool.query('SELECT id FROM departments WHERE name = $1 AND is_active = true', [aiResult.department])
            : Promise.resolve({ rows: [] }),"""

new_dept_query = """    const [deptRow, resolutionResult] = await Promise.all([
        aiResult.department
            ? pool.query('SELECT id FROM departments WHERE name = $1 AND is_active = true', [aiResult.department])
            : Promise.resolve({ rows: [] }),"""

assert old_dept_query in c_content, "old_dept_query not found in complaints.js"
c_content = c_content.replace(old_dept_query, new_dept_query, 1)

# Change 3: Store aiResult.confidence if present, else null
old_confidence_insert = """            textPreparation.source_language === 'hi' ? null : aiResult.confidence,"""
new_confidence_insert = """            aiResult.confidence != null ? aiResult.confidence : null,"""

assert old_confidence_insert in c_content, "old_confidence_insert not found in complaints.js"
c_content = c_content.replace(old_confidence_insert, new_confidence_insert, 1)

with open(complaints_js_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(c_content)
print("Updated backend/src/routes/complaints.js successfully!")

# 2. Update frontend/src/pages/ComplaintDetail.jsx
detail_jsx_path = r"c:\Users\rushi\civic-ai\frontend\src\pages\ComplaintDetail.jsx"
with open(detail_jsx_path, "r", encoding="utf-8") as f:
    d_content = f.read()

old_detail_section = """                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{t('AI Analysis')}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">{t('Category')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.ai_category ? t(complaint.ai_category) : 'N/A'}</span>
                  <span className="text-ink-soft ml-3">{t('Department')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.department_name ? t(complaint.department_name) : t('Unassigned')}</span>
                  <span className="text-ink-soft ml-3">{t('Priority')}:</span>
                  <PriorityBadge priority={complaint.ai_priority} />
                  {complaint.sentiment && (
                    <>
                      <span className="text-ink-soft ml-3">{t('Sentiment')}:</span>
                      <SentimentBadge sentiment={complaint.sentiment} />
                    </>
                  )}
                </div>
                {complaint.ai_confidence != null && (
                  <p className="text-xs font-mono text-ink-soft mt-2">
                  {t('Confidence')}: {(complaint.ai_confidence * 100).toFixed(1)}%
                  </p>
                )}
                {complaint.source_language === 'hi' && (
                  <p className="mt-2 text-xs text-ink-soft" role="note">
                    {complaint.ai_translation_used
                      ? t('Experimental Hindi-to-English translation was used. AI text predictions are unvalidated; staff must review the original complaint before acting.')
                      : t('Hindi translation was unavailable for this complaint; AI text results may be unreliable.')}
                  </p>
                )}"""

new_detail_section = """                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">{t('AI Analysis')}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">{t('Suggested Category')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.ai_category ? t(complaint.ai_category) : 'N/A'}</span>
                  <span className="text-ink-soft ml-3">{t('Assigned Department')}:</span>
                  <span className="font-medium text-ink dark:text-paper">{complaint.department_name ? t(complaint.department_name) : t('Unassigned')}</span>
                  <span className="text-ink-soft ml-3">{t('Priority')}:</span>
                  <PriorityBadge priority={complaint.ai_priority} />
                  {complaint.sentiment && (
                    <>
                      <span className="text-ink-soft ml-3">{t('Sentiment')}:</span>
                      <SentimentBadge sentiment={complaint.sentiment} />
                    </>
                  )}
                </div>
                {complaint.ai_confidence != null && (
                  <p className="text-xs font-mono text-ink-soft mt-2">
                  {t('Confidence')}: {(complaint.ai_confidence * 100).toFixed(1)}%
                  </p>
                )}
                {complaint.ai_category && (
                  <p className="mt-2 text-xs text-ink-soft" role="note">
                    {t('AI category and department are suggestions for staff review, not confirmed findings.')}
                  </p>
                )}"""

assert old_detail_section in d_content, "old_detail_section not found in ComplaintDetail.jsx"
d_content = d_content.replace(old_detail_section, new_detail_section, 1)

with open(detail_jsx_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(d_content)
print("Updated frontend/src/pages/ComplaintDetail.jsx successfully!")

# 3. Update frontend/src/pages/AdminDashboard.jsx
admin_jsx_path = r"c:\Users\rushi\civic-ai\frontend\src\pages\AdminDashboard.jsx"
with open(admin_jsx_path, "r", encoding="utf-8") as f:
    a_content = f.read()

old_admin_badge = """                  {c.ai_confidence != null && (
                    <span className="ml-2 inline-flex rounded-full border border-ai/25 bg-ai-soft px-2 py-1 text-[11px] font-semibold text-ai dark:bg-ai/20">
                      AI {Math.round(c.ai_confidence * 100)}%
                    </span>
                  )}"""

new_admin_badge = """                  {c.ai_category && (
                    <span
                      className="ml-2 inline-flex rounded-full border border-ai/25 bg-ai-soft px-2 py-0.5 text-[11px] font-medium text-ai dark:bg-ai/20"
                      title={t('AI department suggestion for staff review (unverified)')}
                    >
                      {t('AI Suggestion')}
                    </span>
                  )}"""

assert old_admin_badge in a_content, "old_admin_badge not found in AdminDashboard.jsx"
a_content = a_content.replace(old_admin_badge, new_admin_badge, 1)

with open(admin_jsx_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(a_content)
print("Updated frontend/src/pages/AdminDashboard.jsx successfully!")

# 4. Update frontend/src/context/LanguageContext.jsx
lang_jsx_path = r"c:\Users\rushi\civic-ai\frontend\src\context\LanguageContext.jsx"
with open(lang_jsx_path, "r", encoding="utf-8") as f:
    l_content = f.read()

# Add translation mappings to additionalTranslations in LanguageContext.jsx
old_add_trans = """const additionalTranslations = {"""
new_add_trans = """const additionalTranslations = {
  'Suggested Category': { hi: 'सुझाई गई श्रेणी' },
  'Assigned Department': { hi: 'नियुक्त विभाग' },
  'AI Suggestion': { hi: 'AI सुझाव' },
  'AI department suggestion for staff review (unverified)': { hi: 'कर्मचारियों की समीक्षा के लिए AI विभाग का सुझाव (अपुष्ट)' },
  'AI category and department are suggestions for staff review, not confirmed findings.': { hi: 'AI श्रेणी और विभाग कर्मचारियों की समीक्षा के लिए सुझाव हैं, पुष्टि किए गए निष्कर्ष नहीं।' },"""

assert old_add_trans in l_content, "additionalTranslations not found in LanguageContext.jsx"
l_content = l_content.replace(old_add_trans, new_add_trans, 1)

with open(lang_jsx_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(l_content)
print("Updated frontend/src/context/LanguageContext.jsx successfully!")
