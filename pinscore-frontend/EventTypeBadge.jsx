// Maps event_type to color for visual differentiation
const TYPE_COLORS = {
  follow:        { bg: '#1A6B3C', text: '#AAFFCC' },
  share:         { bg: '#1A3A5C', text: '#99CCFF' },
  mention:       { bg: '#3D1A5C', text: '#CC99FF' },
  save:          { bg: '#3A2A00', text: '#FFD580' },
  comment:       { bg: '#1A3A1A', text: '#88DD88' },
  click:         { bg: '#2A1A00', text: '#FFAA44' },
  profile_visit: { bg: '#1A2A3A', text: '#88BBDD' },
  like:          { bg: '#3A1A1A', text: '#FF8888' },
  view:          { bg: '#2A2A2A', text: '#AAAAAA' },
};

export default function EventTypeBadge({ type }) {
  const colors = TYPE_COLORS[type] || { bg: '#333', text: '#CCC' };
  return (
    <span style={{
      background:    colors.bg,
      color:         colors.text,
      padding:       '2px 8px',
      borderRadius:  '4px',
      fontSize:      '12px',
      fontFamily:    'monospace',
      fontWeight:    '600',
      letterSpacing: '0.5px',
      whiteSpace:    'nowrap',
    }}>
      {type}
    </span>
  );
}
