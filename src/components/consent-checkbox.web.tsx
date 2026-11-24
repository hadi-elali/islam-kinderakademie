import { Palette } from '@/constants/design';
import type { ConsentCheckboxProps } from './consent-checkbox';

export function ConsentCheckbox({ label, checked, disabled = false, onChange }: ConsentCheckboxProps) {
  return <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, cursor: disabled ? 'default' : 'pointer', color: Palette.ink, font: '1rem/1.5 system-ui, sans-serif' }}>
    <input type="checkbox" role="checkbox" aria-label={label} aria-checked={checked}
      checked={checked} disabled={disabled} onChange={onChange}
      style={{ width: 24, height: 24, margin: 0, flexShrink: 0, accentColor: Palette.forest, cursor: 'inherit' }} />
    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
  </label>;
}
