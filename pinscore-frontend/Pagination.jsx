export default function Pagination({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || loading}
        style={btnStyle(page <= 1 || loading)}
      >
        ← Prev
      </button>

      <span style={{ color: '#888', fontSize: '14px' }}>
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages || loading}
        style={btnStyle(page >= totalPages || loading)}
      >
        Next →
      </button>
    </div>
  );
}

function btnStyle(disabled) {
  return {
    padding:       '6px 14px',
    background:    disabled ? '#1A1A1A' : '#2C4770',
    color:         disabled ? '#555' : '#FFF',
    border:        '1px solid #333',
    borderRadius:  '6px',
    cursor:        disabled ? 'not-allowed' : 'pointer',
    fontSize:      '13px',
  };
}
