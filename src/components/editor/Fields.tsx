'use client'

import { useRef, useState } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength = 60,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <input
      type="text"
      className="input"
      value={value ?? ''}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function NumberField({
  value,
  onChange,
  min = 0,
  max = 1000,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      className="input"
      value={Number.isFinite(value) ? value : min}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const parsed = Number.parseFloat(e.target.value)
        onChange(Number.isFinite(parsed) ? parsed : min)
      }}
    />
  )
}

export function SliderField({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  suffix = '',
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-600 accent-grass-500"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
      <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-300">
        {value}
        {suffix}
      </span>
    </div>
  )
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-ink-900">
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-left transition-colors hover:border-white/20"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] text-slate-500">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-grass-500' : 'bg-ink-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function ColorField({
  value,
  onChange,
  fallback = '#3fc95c',
}: {
  value: string | null
  onChange: (value: string | null) => void
  fallback?: string
}) {
  const presets = ['#3fc95c', '#4aa8ff', '#ffb545', '#ff6b6b', '#b06bff', '#2fd4c4', '#e0453f', '#888888']
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="color"
        className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
        value={value ?? fallback}
        onChange={(e) => onChange(e.target.value)}
      />
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onChange(preset)}
          className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
            (value ?? '') === preset ? 'border-white ring-2 ring-white/30' : 'border-white/10'
          }`}
          style={{ backgroundColor: preset }}
          aria-label={`Cor ${preset}`}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-md border px-2 py-1 text-[11px] ${
          value === null ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-slate-400'
        }`}
      >
        Automática
      </button>
    </div>
  )
}

/** Upload de PNG que vira data URL (máx. 1 MB, só image/png). */
export function ImageField({
  value,
  onChange,
  label = 'Textura PNG',
}: {
  value: string | null
  onChange: (value: string | null) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)
    if (!file) return
    if (file.size > 1_000_000) {
      setError('Imagem grande demais (máximo 1 MB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      if (!result.startsWith('data:image/png;base64,')) {
        setError('Envie um arquivo PNG (16x16, 32x32 ou 64x64).')
        return
      }
      onChange(result)
    }
    reader.onerror = () => setError('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[repeating-conic-gradient(#2a3549_0%_25%,#1d2637_0%_50%)] bg-[length:16px_16px]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Prévia da textura" className="h-full w-full object-contain [image-rendering:pixelated]" />
          ) : (
            <span className="text-[10px] text-slate-500">auto</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => inputRef.current?.click()}>
              {value ? 'Trocar PNG' : 'Enviar PNG'}
            </button>
            {value && (
              <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onChange(null)}>
                Usar automática
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            PNG de até 1 MB. Se não enviar, o CraftForge gera a textura.
          </p>
          {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png" className="hidden" onChange={onFile} />
    </div>
  )
}
