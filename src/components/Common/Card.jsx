export default function Card({ children, className = '', onClick, style }) {
  return (
    <div
      className={`bg-white rounded-[14px] border border-[#E2E8F0] shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
