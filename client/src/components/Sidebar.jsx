import Avatar from './Avatar.jsx';

function StatusDot({ label, voted, revealed }) {
  return (
    <span
      title={`${label}: ${revealed ? 'revealed' : voted ? 'voted' : 'waiting'}`}
      className={[
        'w-2.5 h-2.5 rounded-full inline-block',
        revealed ? 'bg-emerald-500' : voted ? 'bg-violet-500' : 'bg-slate-200',
      ].join(' ')}
    />
  );
}

export default function Sidebar({ participants, currentItem }) {
  const voters = participants.filter((p) => !p.isObserver);
  const observers = participants.filter((p) => p.isObserver);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-64 shrink-0 flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Participants</h3>
        <div className="flex flex-col gap-2">
          {voters.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar id={p.id} name={p.name} size={30} />
              <span className="text-sm text-slate-700 truncate flex-1">
                {p.name}
                {p.isHost && <span className="text-violet-500 text-[10px] font-semibold ml-1">HOST</span>}
              </span>
              {currentItem && (
                <div className="flex gap-1">
                  <StatusDot label="RCI" voted={currentItem.rci?.votedIds.includes(p.id)} revealed={currentItem.rci?.revealed} />
                  <StatusDot label="Effort" voted={currentItem.effort?.votedIds.includes(p.id)} revealed={currentItem.effort?.revealed} />
                </div>
              )}
            </div>
          ))}
          {voters.length === 0 && <p className="text-sm text-slate-300">No one yet</p>}
        </div>
      </div>

      {observers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">Observers</h3>
          <div className="flex flex-col gap-2">
            {observers.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar id={p.id} name={p.name} size={30} />
                <span className="text-sm text-slate-500 truncate">
                  {p.name}
                  {p.isHost && <span className="text-violet-500 text-[10px] font-semibold ml-1">HOST</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
