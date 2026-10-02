// Same palette/layout as UnsavedVotesModal (from "Manage session – switch item with
// unsaved votes-html/Main.dc.html"), stripped down to a generic title/message/confirm
// dialog — used wherever the app needs to replace a native window.confirm().
const DM_SANS = { fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" };

function WarningTriangleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function ConfirmModal({ open, title, message, cancelLabel = 'Cancel', confirmLabel = 'Confirm', onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      style={{ background: 'rgba(23,27,40,0.48)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...DM_SANS,
          width: 500,
          background: '#FFFFFF',
          borderRadius: 18,
          boxShadow: '0 24px 60px rgba(23,27,40,0.30)',
          padding: '28px 28px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <span
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: 24,
              background: '#FEF3C7',
              color: '#B45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WarningTriangleIcon />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1 }}>
            <h2 id="confirm-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1F2433' }}>
              {title}
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#4A5064' }}>{message}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: 'none',
              background: 'transparent',
              color: '#6B7185',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 6 }}>
          <button
            onClick={onCancel}
            style={{
              height: 46,
              padding: '0 22px',
              border: '1.5px solid #D5D8E3',
              borderRadius: 10,
              background: '#FFFFFF',
              color: '#1F2433',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: 46,
              padding: '0 22px',
              border: 'none',
              borderRadius: 10,
              background: '#B91C1C',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
