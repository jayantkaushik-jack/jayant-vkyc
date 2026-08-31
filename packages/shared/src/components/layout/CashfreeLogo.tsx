import logoUrl from '../../assets/cashfree-logo.png';

export function CashfreeLogo({ variant = 'default', showText = true }: { variant?: 'default' | 'white'; showText?: boolean }) {
  const isWhite = variant === 'white';
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoUrl}
        alt="Cashfree Payments"
        className="h-7 w-auto object-contain"
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-sm font-semibold ${isWhite ? 'text-white' : 'text-text'}`}>
            Cashfree
          </span>
          <span className={`text-[10px] ${isWhite ? 'text-white/70' : 'text-text-muted'}`}>
            Payments
          </span>
        </div>
      )}
    </div>
  );
}
