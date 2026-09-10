import { useState } from 'react';
import Avatar from './Avatar.jsx';
import CardDeck from './CardDeck.jsx';

export default function PollPanel({ title, deck, poll, participants, isHost, canVote, onVote, onReveal, onReset, onSetFinal }) {
  const [customFinal, setCustomFinal] = useState('');

  if (!poll) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 flex-1 min-w-0">
        <h3 className="font-semibold text-slate-700 mb-3">{title}</h3>
        <p className="text-slate-400 text-sm">No active item.</p>
      </div>
    );
  }

  const voters = participants.filter((p) => !p.isObserver);
  const distinctValues = poll.revealed ? [...new Set(Object.values(poll.votes || {}))] : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex-1 min-w-0 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {poll.final != null && (
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-1">
            Final: {poll.final}
          </span>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400 text-sm">
        {poll.revealed ? 'Votes revealed' : 'Waiting on host…'}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {voters.map((p) => {
            const voted = poll.votedIds.includes(p.id);
            const value = poll.revealed ? poll.votes?.[p.id] : null;
            return (
              <div key={p.id} className="w-14 h-16 flex items-center justify-center">
                {poll.revealed ? (
                  <div className="w-12 h-16 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold">
                    {value ?? '–'}
                  </div>
                ) : voted ? (
                  <div className="w-12 h-16 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xl">
                    👍
                  </div>
                ) : (
                  <div className="w-12 h-16 rounded-lg border-2 border-dashed border-slate-200" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {voters.map((p) => (
            <div key={p.id} className="w-14 flex flex-col items-center gap-1">
              <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={32} />
              <span className="text-[10px] text-slate-500 truncate w-full text-center">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={onReveal}
              disabled={poll.revealed}
              className="text-xs font-medium bg-violet-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5"
            >
              Reveal
            </button>
            <button
              onClick={onReset}
              className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1.5"
            >
              Reset
            </button>
          </div>
          {poll.revealed && (
            <div className="flex flex-wrap items-center justify-center gap-1">
              {distinctValues.map((v) => (
                <button
                  key={v}
                  onClick={() => onSetFinal(v)}
                  className="text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg px-2 py-1.5"
                >
                  Set {v}
                </button>
              ))}
              <input
                value={customFinal}
                onChange={(e) => setCustomFinal(e.target.value)}
                placeholder="custom"
                className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
              <button
                onClick={() => customFinal.trim() && onSetFinal(customFinal.trim())}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-2 py-1.5"
              >
                Set
              </button>
            </div>
          )}
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
