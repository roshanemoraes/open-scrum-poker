import Avatar from './avatar/Avatar.jsx';
import participantsLogo from '../assets/icons/participants.png';
import eyeLogo from '../assets/icons/eye.png';

// Exact palette/typography from ManageSession.dc.html.
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

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

function Row({ p, selfId, currentItem, pollTypes, showStatus }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={32} />
      <span className="text-[13.5px] font-medium text-[#1B1D29] truncate">
        {p.name}
        {p.id === selfId && <span className="text-[#6E6B85] font-normal"> (you)</span>}
      </span>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {showStatus && currentItem && (
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
        {p.isHost && (
          <span className="text-[11px] font-bold text-[#A9761A] bg-[#FDF1DD] px-[9px] py-[3px] rounded-full">
            Host
          </span>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ participants, currentItem, pollConfig, selfId }) {
  const voters = participants.filter((p) => !p.isObserver);
  const observers = participants.filter((p) => p.isObserver);
  const pollTypes = Object.entries(pollConfig || {});

  return (
    <div
      className="bg-white border border-[#E4E1F2] rounded-[20px] p-6 shadow-[0_1px_2px_rgba(27,29,41,0.04)] w-64 shrink-0 flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] overflow-y-auto"
      style={PLEX_SANS}
    >
      <div>
        <div className="flex items-center gap-2 mb-[14px]">
          <img src={participantsLogo} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-[14px] font-semibold text-[#1B1D29]">Participants</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {voters.map((p) => (
            <Row key={p.id} p={p} selfId={selfId} currentItem={currentItem} pollTypes={pollTypes} showStatus />
          ))}
          {voters.length === 0 && (
            <div className="flex items-center gap-2.5 py-2.5">
              <div className="w-8 h-8 rounded-full border-[1.5px] border-dashed border-[#C9C5E6] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2v8M2 6h8" stroke="#B4AEDD" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[13px] text-[#6E6B85]">Waiting for players to join</span>
            </div>
          )}
        </div>
      </div>

      {observers.length > 0 && (
        <>
          <div className="h-px bg-[#E4E1F2] my-[18px]" />
          <div>
            <div className="flex items-center gap-2 mb-[14px]">
              <img src={eyeLogo} alt="" className="w-4 h-4 shrink-0" />
              <span className="text-[14px] font-semibold text-[#1B1D29]">Observers</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {observers.map((p) => (
                <Row key={p.id} p={p} selfId={selfId} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
