import { ChevronDown } from 'lucide-react';
import type { ChangeEventHandler, ReactNode } from 'react';

interface MerchantFilterSelectProps {
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
}

export const MerchantFilterSelect = ({
  value,
  onChange,
  children,
  className = '',
  wrapperClassName = '',
  disabled = false,
}: MerchantFilterSelectProps) => {
  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full appearance-none rounded-2xl border border-border-subtle bg-black/30 px-4 py-3 pr-11 text-sm text-text-primary outline-none transition-all focus:border-brand/50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
    </div>
  );
};
