import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import type { LocationTreeNode } from './dashboard.types';
import { cn } from '../../lib/cn';

export function Cascader({
  locationTree,
  value,
  onChange,
}: {
  locationTree: LocationTreeNode[];
  value: { country: string; province: string; city: string };
  onChange: (value: { country: string; province: string; city: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string | null>(value.country || locationTree[0]?.label || null);
  const [activeProvince, setActiveProvince] = useState<string | null>(value.province || null);

  useEffect(() => {
    if (!activeCountry && locationTree[0]?.label) {
      setActiveCountry(locationTree[0].label);
    }
  }, [activeCountry, locationTree]);

  const displayValue = value.city
    ? `${value.country} / ${value.province} / ${value.city}`
    : value.province
      ? `${value.country} / ${value.province}`
      : value.country || '所有区域';

  const currentCountryData = locationTree.find((country) => country.label === activeCountry);
  const currentProvinceData = currentCountryData?.children.find((province) => province.label === activeProvince);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary hover:border-brand/50 transition-all min-w-[180px] justify-between"
      >
        <div className="flex items-center space-x-2">
          <MapPin className="w-3 h-3 text-brand" />
          <span className="truncate max-w-[140px]">{displayValue}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 text-text-secondary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-50 flex bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left">
            <div className="w-28 border-r border-border-subtle py-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onChange({ country: '', province: '', city: '' });
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors',
                  !value.country ? 'text-brand bg-brand/5' : 'text-text-secondary'
                )}
              >
                所有区域
              </button>
              {locationTree.map((country) => (
                <button
                  key={country.label}
                  onMouseEnter={() => {
                    setActiveCountry(country.label);
                    setActiveProvince(null);
                  }}
                  onClick={() => {
                    onChange({ country: country.label, province: '', city: '' });
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between group',
                    activeCountry === country.label ? 'text-brand bg-brand/5' : 'text-text-secondary'
                  )}
                >
                  <span>{country.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>

            {activeCountry && (
              <div className="w-32 border-r border-border-subtle py-2 max-h-64 overflow-y-auto bg-black/10">
                {currentCountryData?.children.map((province) => (
                  <button
                    key={province.label}
                    onMouseEnter={() => setActiveProvince(province.label)}
                    onClick={() => {
                      if (province.children.length === 0) {
                        onChange({ country: activeCountry, province: province.label, city: '' });
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between group',
                      activeProvince === province.label ? 'text-brand bg-brand/5' : 'text-text-secondary'
                    )}
                  >
                    <span>{province.label}</span>
                    {province.children.length > 0 && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                  </button>
                ))}
              </div>
            )}

            {activeProvince && currentProvinceData && currentProvinceData.children.length > 0 && (
              <div className="w-32 py-2 max-h-64 overflow-y-auto bg-black/20">
                {currentProvinceData.children.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onChange({ country: activeCountry!, province: activeProvince, city });
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between',
                      value.city === city ? 'text-brand bg-brand/5' : 'text-text-secondary'
                    )}
                  >
                    <span>{city}</span>
                    {value.city === city && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-black/40 light:bg-black/[0.03] border border-border-subtle rounded-xl text-[10px] font-mono text-text-primary hover:border-brand/50 transition-all min-w-[100px] justify-between"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={cn('w-3 h-3 text-text-secondary transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-50 w-full bg-bg-card border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left py-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-[10px] font-mono hover:bg-brand/10 transition-colors flex items-center justify-between',
                  value === option.value ? 'text-brand bg-brand/5' : 'text-text-secondary'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function StatCard({
  title,
  value,
  subText,
}: {
  title: string;
  value: string;
  subText: string;
}) {
  return (
    <div className="glass-dark p-6 rounded-2xl border border-border-subtle relative overflow-hidden group hover:border-brand/50 hover:brand-glow transition-all cursor-pointer hover:-translate-y-1 light:shadow-[0_4px_20px_rgba(0,0,0,0.03)] light:hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Activity className="w-12 h-12 text-text-primary" />
      </div>
      <div className="relative">
        <p className="text-text-secondary text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4">{title}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-display font-black text-text-primary leading-none">{value}</h3>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] text-text-secondary font-medium">{subText}</span>
          <div className="w-8 h-1 bg-white/5 light:bg-black/[0.03] rounded-full overflow-hidden">
            <div className="h-full bg-brand" style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
