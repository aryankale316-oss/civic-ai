import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelect({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft dark:text-paper ${className}`}>
      <span className="sr-only">{t('Language')}</span>
      <span aria-hidden="true">文</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label={t('Language')}
        className="max-w-28 rounded-md border border-paper-line bg-white px-2 py-2 text-xs text-ink dark:border-board-line dark:bg-board dark:text-paper"
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
      </select>
    </label>
  );
}
