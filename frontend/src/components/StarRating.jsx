export default function StarRating({ value, onChange, readOnly = false, size = 'text-xl' }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`inline-flex gap-0.5 ${size}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`leading-none ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'} ${
            star <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
          }`}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
