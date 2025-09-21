//

interface Tab {
  key: string;
  label: string;
  count?: number;
}
interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: Props) {
  return (
    <div className={`w-full overflow-x-auto no-scrollbar ${className ?? ''}`}>
      <div className='flex gap-2 sm:gap-3 p-1 sm:p-2 rounded-xl bg-white/5 backdrop-blur border border-white/10'>
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base transition ${
                isActive ? 'bg-white/20 text-white shadow-inner' : 'hover:bg-white/10 text-white/80'
              }`}
              aria-pressed={isActive}
            >
              <span>{t.label}</span>
              {typeof t.count === 'number' && (
                <span className='ml-2 text-xs opacity-80'>({t.count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Tabs;
