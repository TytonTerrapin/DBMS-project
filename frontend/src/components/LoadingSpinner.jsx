export default function LoadingSpinner({ size = 'md' }) {
  const dims = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  return (
    <div className={`relative ${dims}`}>
      <div className={`absolute inset-0 rounded-full border-2 border-cyan-500/40 border-t-cyan-300 animate-spin`} />
    </div>
  )
}
