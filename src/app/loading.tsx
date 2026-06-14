export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-900/30" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-600 dark:border-t-emerald-400 animate-spin" />
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <p className="text-lg font-medium text-foreground">
            جاري التحميل...
          </p>
          <p className="text-sm text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    </div>
  );
}
