import { useEffect, useRef, useState } from 'react';
import Avatar from './avatar/Avatar.jsx';
import CardDeck from './CardDeck.jsx';
import RippleButton from './RippleButton.jsx';
import Confetti from './Confetti.jsx';
import waitingForVotersImg from '../assets/illustrations/waiting-for-voters-with-text.svg';

// Exact palette/typography from ManageSession.dc.html.
const SPACE_GROTESK = { fontFamily: "'Space Grotesk', sans-serif" };
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

// Groups revealed votes by value (see Main.dc.html's "Final value picker" mock) so the
// host can confirm a value by group instead of per-participant. Sorted by vote count,
// then by the deck's own card order so custom (non-numeric) decks still sort sensibly.
function buildGroups(poll, participants, deck, selectedValue) {
  const votes = poll?.votes || {};
  const byId = new Map(participants.map((p) => [p.id, p]));
  const deckOrder = new Map((deck || []).map((v, i) => [String(v), i]));

  const map = new Map();
  for (const [participantId, value] of Object.entries(votes)) {
    const key = String(value);
    if (!map.has(key)) map.set(key, { value, voters: [] });
    const person = byId.get(participantId);
    map.get(key).voters.push({ id: participantId, name: person?.name || '?', avatarId: person?.avatarId });
  }

  const groups = Array.from(map.values());
  if (groups.length === 0) return [];

  groups.forEach((g) => { g.count = g.voters.length; });
  groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const orderA = deckOrder.has(String(a.value)) ? deckOrder.get(String(a.value)) : Infinity;
    const orderB = deckOrder.has(String(b.value)) ? deckOrder.get(String(b.value)) : Infinity;
    return orderA - orderB;
  });

  const maxCount = groups[0].count;
  const topGroups = groups.filter((g) => g.count === maxCount);
  const isTie = topGroups.length > 1;
  const unanimous = groups.length === 1;

  return groups.map((g) => {
    const isMajority = !isTie && !unanimous && g.count === maxCount;
    return {
      id: String(g.value),
      value: g.value,
      count: g.count,
      voters: g.voters,
      isSelected: selectedValue === String(g.value),
      badgeText: unanimous ? 'Unanimous' : isMajority ? 'Majority' : '',
      countLabel: g.count === 1 ? '1 vote' : `${g.count} votes`,
    };
  });
}

function summaryFor(poll, groups) {
  const total = Object.keys(poll?.votes || {}).length;
  if (groups.length === 0) return 'No votes were cast for this round.';
  if (groups.length === 1) return `All ${total} votes agree on ${groups[0].value}`;
  const majority = groups.find((g) => g.badgeText === 'Majority');
  if (majority) return `Majority: ${majority.value} (${majority.count} of ${total})`;
  const values = groups.map((g) => g.value).join(' & ');
  return `No clear majority — tie between ${values}`;
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0F8A4B" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function RevoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B4F5E" strokeWidth="2.4">
      <path d="M3 12a9 9 0 1 0 2.6-6.4" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export default function PollPanel({ title, deck, poll, participants, isHost, canVote, onVote, onReveal, onReset, onSetFinal }) {
  const rowRef = useRef(null);
  const prevRevealed = useRef(poll?.revealed);
  const [burstKey, setBurstKey] = useState(0);
  const [selectedValue, setSelectedValue] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFinal, setCustomFinal] = useState('');

  useEffect(() => {
    if (poll?.revealed && !prevRevealed.current) {
      const values = Object.values(poll.votes || {});
      const unanimous = values.length > 0 && new Set(values).size === 1;
      if (unanimous) setBurstKey((k) => k + 1);
      // Fresh reveal — clear out any picker state left over from the previous round.
      setSelectedValue(null);
      setCustomOpen(false);
      setCustomFinal('');
    }
    prevRevealed.current = poll?.revealed;
  }, [poll?.revealed]);

  if (!poll) {
    return (
      <div className="bg-white border border-[#E4E1F2] rounded-[20px] p-[22px_24px_26px] shadow-[0_1px_2px_rgba(27,29,41,0.04)] flex-1 min-w-0" style={PLEX_SANS}>
        <h3 className="text-[17px] font-semibold text-[#1B1D29] mb-3" style={SPACE_GROTESK}>{title}</h3>
        <p className="text-[#6E6B85] text-sm">No active item.</p>
      </div>
    );
  }

  const voters = participants.filter((p) => !p.isObserver);
  const noVoters = voters.length === 0;
  const groups = buildGroups(poll, participants, deck, selectedValue);
  const hasVotes = groups.length > 0;
  const summaryText = summaryFor(poll, groups);

  const selectedGroup = groups.find((g) => g.isSelected);
  const customTrim = customFinal.trim();
  const hasCustom = customOpen && customTrim !== '';
  const confirmEnabled = !!selectedGroup || hasCustom;
  let confirmLabel = 'Select a value to confirm';
  if (selectedGroup) confirmLabel = `Confirm final: ${selectedGroup.value}`;
  else if (hasCustom) confirmLabel = `Confirm final: ${customTrim}`;

  function selectGroup(id) {
    setSelectedValue(id);
    setCustomOpen(false);
    setCustomFinal('');
  }

  function openCustom() {
    setCustomOpen(true);
    setSelectedValue(null);
  }

  function cancelCustom() {
    setCustomOpen(false);
    setCustomFinal('');
  }

  function confirm() {
    if (!confirmEnabled) return;
    onSetFinal(selectedGroup ? selectedGroup.value : customTrim);
  }

  const customInputId = `custom-final-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="bg-white border border-[#E4E1F2] rounded-[20px] p-[22px_24px_26px] shadow-[0_1px_2px_rgba(27,29,41,0.04)] flex-1 min-w-0 flex flex-col gap-4" style={PLEX_SANS}>
      <Confetti burstKey={burstKey} originRef={rowRef} />

      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold text-[#1B1D29]" style={SPACE_GROTESK}>{title}</h3>
        {poll.revealed && (
          poll.final != null ? (
            <span
              className="text-xs font-bold rounded-full px-3 py-[5px] flex items-center gap-[5px]"
              style={{ background: '#E7F8EF', color: '#0F8A4B' }}
            >
              <CheckIcon /> Final: {poll.final}
            </span>
          ) : (
            <span className="text-xs font-bold rounded-full px-3 py-[5px]" style={{ background: '#FFF3D6', color: '#946200' }}>
              Needs confirmation
            </span>
          )
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
          <img src={waitingForVotersImg} alt="Waiting for voters to join" className="w-60 h-auto" />
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

      {poll.revealed && poll.final != null && (
        <div className="flex items-center gap-4 rounded-[14px] p-4" style={{ background: '#FAFAFD', border: '1px solid #EEEFF4' }}>
          <div
            className="w-[52px] h-[52px] rounded-xl flex items-center justify-center text-white font-extrabold text-[22px] shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            {poll.final}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[#1E2130]">This is the final value</div>
            <div className="text-[13px] mt-0.5" style={{ color: '#8A8DA0' }}>{summaryText}</div>
          </div>
          {isHost && (
            <button type="button" onClick={() => onSetFinal(null)} className="text-sm font-bold shrink-0" style={{ background: 'none', border: 'none', color: 'var(--accent)' }}>
              Change
            </button>
          )}
        </div>
      )}

      {isHost && poll.revealed && poll.final == null && (
        <div className="flex flex-col gap-[18px]">
          {hasVotes ? (
            <div className="flex flex-wrap gap-3.5">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => selectGroup(g.id)}
                  aria-pressed={g.isSelected}
                  className="relative text-left rounded-2xl flex flex-col gap-2.5 px-[18px] py-4"
                  style={{
                    minWidth: 132,
                    background: g.isSelected ? 'var(--accent)' : '#F8F7FD',
                    border: `2px solid ${g.isSelected ? 'var(--accent)' : '#E7E8F0'}`,
                  }}
                >
                  {g.badgeText && (
                    <span
                      className="absolute -top-[11px] right-3 text-[10px] font-extrabold rounded-full px-2 py-[2px]"
                      style={{ letterSpacing: '0.03em', background: '#fff', color: 'var(--accent)', border: '1.5px solid var(--accent)' }}
                    >
                      {g.badgeText}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[30px] font-extrabold" style={{ color: g.isSelected ? '#fff' : '#1E2130' }}>
                      {g.value}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: g.isSelected ? 'rgba(255,255,255,0.85)' : '#8A8DA0' }}>
                      {g.countLabel}
                    </span>
                  </div>
                  <div className="flex">
                    {g.voters.map((v, i) => (
                      <span
                        key={v.id}
                        className="rounded-full"
                        style={{
                          border: `2px solid ${g.isSelected ? 'var(--accent)' : '#fff'}`,
                          marginLeft: i === 0 ? 0 : -6,
                          display: 'inline-flex',
                        }}
                      >
                        <Avatar id={v.id} avatarId={v.avatarId} name={v.name} size={20} />
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#8A8DA0' }}>No votes were cast for this round.</p>
          )}

          <div className="h-px" style={{ background: '#EEEFF4' }} />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            {!customOpen ? (
              <button
                type="button"
                onClick={openCustom}
                className="text-sm font-bold p-0"
                style={{ background: 'none', border: 'none', color: 'var(--accent)' }}
              >
                Use a custom value instead
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <label htmlFor={customInputId} className="sr-only">Custom value for {title}</label>
                <input
                  id={customInputId}
                  type="number"
                  value={customFinal}
                  onChange={(e) => setCustomFinal(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-[88px] px-3 py-[9px] rounded-[10px] text-sm font-semibold box-border"
                  style={{ border: '1.5px solid #DADCE6' }}
                />
                <button type="button" onClick={cancelCustom} className="text-[13px] font-bold" style={{ background: 'none', border: 'none', color: '#9CA0AE' }}>
                  Cancel
                </button>
              </div>
            )}
            <span className="text-[13px] font-semibold" style={{ color: '#8A8DA0' }}>{summaryText}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-[7px] text-sm font-bold rounded-[10px] px-[18px] py-[10px] bg-white"
              style={{ border: '1.5px solid #E7E8F0', color: '#4B4F5E' }}
            >
              <RevoteIcon /> Revote
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!confirmEnabled}
              className="text-sm font-bold rounded-[10px] px-5 py-[10px]"
              style={{ background: confirmEnabled ? 'var(--accent)' : '#EEEFF4', color: confirmEnabled ? '#fff' : '#A3A6B3' }}
            >
              {confirmLabel}
            </button>
          </div>
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
