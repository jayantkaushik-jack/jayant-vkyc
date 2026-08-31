import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full min-h-screen md:min-h-0 md:max-w-[390px] md:rounded-[2rem] md:border-[10px] md:border-[#1A1523] md:shadow-2xl md:overflow-hidden md:h-[844px] md:flex md:flex-col bg-surface">
      {children}
    </div>
  );
}
