import Avatar from './avatar/Avatar.jsx';
import participantsLogo from '../assets/icons/participants.png';
import binocularsLogo from '../assets/icons/binoculars.png';

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

export default function Sidebar({ participants, currentItem, pollConfig, selfId }) {
  const voters = participants.filter((p) => !p.isObserver);
  const observers = participants.filter((p) => p.isObserver);
  const pollTypes = Object.entries(pollConfig || {});

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 w-64 shrink-0 flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <img src={participantsLogo} alt="" className="w-4 h-4 shrink-0" />
          <h3 className="text-xs font-semibold text-slate-400 uppercase">Participants</h3>
        </div>
        <div className="flex flex-col gap-2">
          {voters.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={30} />
              <span className="text-sm text-slate-700 truncate flex-1">
                {p.name}
                {p.id === selfId && <span className="text-slate-400 font-normal"> (me)</span>}
                {p.isHost && <span className="text-violet-500 text-[10px] font-semibold ml-1">HOST</span>}
              </span>
              {currentItem && (
                <div className="flex gap-1">
                  {pollTypes.map(([type, poll]) => (
                    <StatusDot
                      key={type}
                      label={poll.label}
                      voted={currentItem[type]?.votedIds.includes(p.id)}
                      revealed={currentItem[type]?.revealed}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {voters.length === 0 && <p className="text-sm text-slate-300">No one yet</p>}
        </div>
      </div>

      {observers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <img src={binocularsLogo} alt="" className="w-4 h-4 shrink-0" />
            <h3 className="text-xs font-semibold text-slate-400 uppercase">Observers</h3>
          </div>
          <div className="flex flex-col gap-2">
            {observers.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={30} />
                <span className="text-sm text-slate-500 truncate">
                  {p.name}
                  {p.id === selfId && <span className="text-slate-400 font-normal"> (me)</span>}
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
