import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import CardDeck from './CardDeck.jsx';
import RippleButton from './RippleButton.jsx';
import ProgressRing from './ProgressRing.jsx';
import Confetti from './Confetti.jsx';
import waitingForVotersImg from '../assets/waitingTillVotersJoin.png';

function computeConsensus(poll) {
  if (!poll?.revealed || !poll.votes) return null;
  const values = Object.values(poll.votes);
  if (values.length === 0) return null;
  const counts = {};
  values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  let best = null;
  for (const [value, count] of Object.entries(counts)) {
    if (!best || count > best.count) best = { value, count };
  }
  return { value: best.value, percent: (best.count / values.length) * 100 };
}

export default function PollPanel({ title, deck, poll, participants, isHost, canVote, onVote, onReveal, onReset, onSetFinal }) {
  const rowRef = useRef(null);
  const prevRevealed = useRef(poll?.revealed);
  const [burstKey, setBurstKey] = useState(0);
  const [customFinal, setCustomFinal] = useState('');

  const consensus = useMemo(() => computeConsensus(poll), [poll]);

  useEffect(() => {
    if (poll?.revealed && !prevRevealed.current) {
      const values = Object.values(poll.votes || {});
      const unanimous = values.length > 0 && new Set(values).size === 1;
      if (unanimous) setBurstKey((k) => k + 1);
    }
    prevRevealed.current = poll?.revealed;
  }, [poll?.revealed]);

  useEffect(() => {
    if (poll?.revealed && poll.final == null && consensus && isHost) {
      onSetFinal(consensus.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll?.revealed]);

  if (!poll) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 flex-1 min-w-0">
        <h3 className="font-semibold text-slate-700 mb-3">{title}</h3>
        <p className="text-slate-400 text-sm">No active item.</p>
      </div>
    );
  }

  const voters = participants.filter((p) => !p.isObserver);
  const noVoters = voters.length === 0;
  const distinctValues = poll.revealed ? [...new Set(Object.values(poll.votes || {}))] : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex-1 min-w-0 flex flex-col gap-4">
      <Confetti burstKey={burstKey} originRef={rowRef} />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {poll.final != null && (
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-1">
            Final: {poll.final}
          </span>
        )}
      </div>

      {isHost && !poll.revealed && !noVoters && (
        <div className="flex justify-center mt-4">
          <RippleButton
            onClick={onReveal}
            className="text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 rounded-lg px-5 py-2 shadow-sm transition-colors"
          >
            Reveal votes
          </RippleButton>
        </div>
      )}
      {!isHost && (
        <div className="bg-slate-50 rounded-[10px] p-3 text-center text-slate-400 text-sm">
          {poll.revealed ? 'Votes revealed' : 'Waiting on host to reveal cards…'}
        </div>
      )}

      {noVoters && (
        <div className="flex flex-col items-center justify-center py-4">
          <img src={waitingForVotersImg} alt="Waiting for voters to join" className="w-70 h-auto" />
        </div>
      )}

      <div ref={rowRef} className="flex flex-wrap justify-center gap-2">
        {!noVoters && voters.map((p) => {
          const voted = poll.votedIds.includes(p.id);
          const value = poll.revealed ? poll.votes?.[p.id] : null;
          const flipped = poll.revealed && voted;
          const isFinal = value != null && value === poll.final;

          if (!voted) {
            return <div key={p.id} className="w-14 h-20 rounded-[10px] border-2 border-dashed border-slate-200" />;
          }

          return (
            <div key={p.id} className="w-14 h-20" style={{ perspective: 700 }}>
              <div
                className="relative w-full h-full transition-transform duration-[350ms] ease-in-out"
                style={{ transformStyle: 'preserve-3d', transform: `rotateY(${flipped ? 180 : 0}deg)` }}
              >
                {/* face-down */}
                <div
                  className="absolute inset-0 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="w-2.5 h-2.5 rotate-45 bg-violet-200 rounded-[2px]" />
                </div>
                {/* revealed value */}
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => isHost && onSetFinal(value)}
                  title={isHost ? 'Set as final value' : undefined}
                  className={[
                    'absolute inset-0 rounded-[10px] flex items-center justify-center font-bold text-lg',
                    isFinal ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 border-2 border-violet-300',
                  ].join(' ')}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {value}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!noVoters && (
        <div className="flex flex-wrap justify-center gap-2">
          {voters.map((p) => (
            <div key={p.id} className="w-14 flex flex-col items-center gap-1">
              <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={32} />
              <span className="text-[10px] text-slate-500 truncate w-full text-center">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {poll.revealed && consensus && (
        <div className="flex items-center justify-center gap-3">
          <span className="bg-violet-600 text-white font-bold rounded-[10px] px-4 py-1.5 text-sm">
            {poll.final ?? consensus.value}
          </span>
          <ProgressRing percent={consensus.percent} />
        </div>
      )}

      {isHost && poll.revealed && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          {distinctValues.map((v) => (
            <button
              key={v}
              onClick={() => onSetFinal(v)}
              className={[
                'text-xs font-medium rounded-[10px] px-2 py-1.5',
                v === poll.final
                  ? 'bg-violet-600 text-white'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700',
              ].join(' ')}
            >
              Set {v}
            </button>
          ))}
          <input
            value={customFinal}
            onChange={(e) => setCustomFinal(e.target.value)}
            placeholder="custom"
            className="w-16 text-xs border border-slate-200 rounded-[10px] px-2 py-1.5"
          />
          <button
            onClick={() => customFinal.trim() && onSetFinal(customFinal.trim())}
            className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[10px] px-2 py-1.5"
          >
            Set
          </button>
        </div>
      )}

      {isHost && poll.revealed && (
        <div className="flex justify-center gap-2">
          <button
            onClick={onReset}
            className="text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-[10px] px-3 py-1.5"
          >
            ↺ Revote
          </button>
        </div>
      )}

      {canVote && !poll.revealed && (
        <div className="pt-2">
          <p className="text-center text-sm text-slate-500 mb-2">Choose your card</p>
          <CardDeck deck={deck} selected={poll.myVote} disabled={poll.revealed} onPick={onVote} />
        </div>
      )}
    </div>
  );
}
