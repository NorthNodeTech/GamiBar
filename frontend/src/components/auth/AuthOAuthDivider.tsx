export function AuthOAuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[#E5E7EB]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-xs font-medium uppercase tracking-wider text-[#737373]">{label}</span>
      </div>
    </div>
  );
}
