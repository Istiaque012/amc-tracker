const variants = {
  primary:   'bg-[#0F2744] text-white hover:bg-[#1D4ED8] active:bg-[#1D4ED8]',
  secondary: 'bg-white text-[#0F2744] border border-[#E2E8F0] hover:bg-[#F1F5F9]',
  success:   'bg-[#10B981] text-white hover:bg-[#059669]',
  danger:    'bg-[#EF4444] text-white hover:bg-[#DC2626]',
  amber:     'bg-[#F59E0B] text-white hover:bg-[#D97706]',
  ghost:     'bg-transparent text-[#64748B] hover:bg-[#F1F5F9]',
};

const sizes = {
  sm:  'px-3 py-1.5 text-sm',
  md:  'px-4 py-2 text-sm',
  lg:  'px-5 py-2.5 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-sans font-semibold rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
