export default function LoadingSpinner({ size = 32 }) {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[120px]">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke="#E2E8F0" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#0F2744" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
