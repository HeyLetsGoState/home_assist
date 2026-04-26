import { useState, useCallback, useRef } from 'react'
import { TermFrame, T } from './TermFrame'

function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#ffffff'
  return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function LightRow({ entity, state, toggleLight, setLightBrightness, setLightColor, isLast }) {
  const isOn = state?.state === 'on'
  const brightness = state?.attributes?.brightness ?? 0
  const brightnessPercent = Math.round((brightness / 255) * 100)
  const rgbColor = state?.attributes?.rgb_color
  const currentHex = rgbToHex(rgbColor)
  const colorInputRef = useRef(null)

  const [localBrightness, setLocalBrightness] = useState(brightnessPercent)
  const [isDragging, setIsDragging] = useState(false)
  const [toggling, setToggling] = useState(false)

  const displayBrightness = isDragging ? localBrightness : brightnessPercent

  const handleToggle = async () => {
    setToggling(true)
    try { await toggleLight(entity.id) } finally { setToggling(false) }
  }

  const handleSliderChange = useCallback((e) => {
    setLocalBrightness(Number(e.target.value))
    setIsDragging(true)
  }, [])

  const handleSliderCommit = useCallback(async (e) => {
    const val = Number(e.target.value)
    setIsDragging(false)
    await setLightBrightness(entity.id, Math.round((val / 100) * 255))
  }, [entity.id, setLightBrightness])

  const handleColorChange = useCallback(async (e) => {
    await setLightColor(entity.id, e.target.value)
  }, [entity.id, setLightColor])

  return (
    <div style={{ padding: '8px 0', borderBottom: isLast ? 'none' : `1px dotted ${T.border}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr auto auto', gap: 8, alignItems: 'center' }}>
        {/* Terminal-style toggle square */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={`Toggle ${entity.name}`}
          style={{
            width: 13, height: 13,
            border: `1px solid ${isOn ? T.amber : T.dim}`,
            background: isOn ? T.amber : 'transparent',
            boxShadow: isOn ? `0 0 8px ${T.amber}` : 'none',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            transition: 'all 0.15s',
          }}
        />

        <span style={{ color: isOn ? T.amber : T.dim, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
          {entity.name}
        </span>

        <span style={{ color: isOn ? T.cyan : T.dim, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
          {isOn ? `${displayBrightness}%` : 'OFF'}
        </span>

        {/* Color swatch */}
        {isOn ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => colorInputRef.current?.click()}
              title="Change color"
              style={{
                width: 14, height: 14,
                background: currentHex,
                border: `1px solid ${T.border}`,
                cursor: 'pointer', display: 'block',
              }}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={currentHex}
              onChange={handleColorChange}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
          </div>
        ) : <div style={{ width: 14 }} />}
      </div>

      {isOn && (
        <input
          type="range" min={1} max={100}
          value={displayBrightness}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          style={{ width: '100%', marginTop: 6, accentColor: T.amber }}
          aria-label={`${entity.name} brightness`}
        />
      )}
    </div>
  )
}

export function LightCard({ entities, states, toggleLight, setLightBrightness, setLightColor }) {
  const onCount = entities.filter((e) => states[e.id]?.state === 'on').length

  return (
    <TermFrame title="LIGHT.CTRL" accent={T.amber} right={`${onCount}/${entities.length} ACTIVE`}>
      {entities.map((entity, i) => (
        <LightRow
          key={entity.id}
          entity={entity}
          state={states[entity.id]}
          toggleLight={toggleLight}
          setLightBrightness={setLightBrightness}
          setLightColor={setLightColor}
          isLast={i === entities.length - 1}
        />
      ))}
    </TermFrame>
  )
}
