export default function CardDeck({ deck, selected, disabled, onPick }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {deck.map((value) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onPick(value)}
            className={[
              'w-14 h-20 rounded-xl border-2 font-bold text-lg transition shadow-sm',
              isSelected
                ? 'bg-violet-600 border-violet-600 text-white -translate-y-2'
                : 'bg-white border-slate-200 text-violet-700 hover:-translate-y-1 hover:border-violet-300',
              disabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'cursor-pointer',
            ].join(' ')}
          >
            {value === '?' ? '❔' : value}
          </button>
        );
      })}
    </div>
  );
}
