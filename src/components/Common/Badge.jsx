const variants = {
  blue:   'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
  green:  'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
  amber:  'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  red:    'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
  purple: 'bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]',
  gray:   'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]',
  navy:   'bg-[#0F2744] text-white border border-[#0F2744]',
};

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-sans uppercase tracking-wider ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  );
}
