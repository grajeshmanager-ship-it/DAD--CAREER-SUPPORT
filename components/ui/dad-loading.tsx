export function DadLoading({ message = "DAD is on it..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative w-56 h-20 mx-auto overflow-hidden">
          <div className="absolute bottom-0 flex items-end gap-1 animate-[dadchase_1.2s_ease-in-out_infinite]">
            <span className="text-5xl">🏃</span>
            <span className="text-4xl -ml-2">👨</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold">{message}</p>
          <p className="text-muted-foreground text-sm">Just a moment...</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes dadchase {
          0%   { transform: translateX(-60px); }
          50%  { transform: translateX(60px); }
          100% { transform: translateX(-60px); }
        }
      `}</style>
    </div>
  );
}
