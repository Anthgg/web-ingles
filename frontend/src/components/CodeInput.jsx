import React, { useEffect, useMemo, useRef } from 'react';

const CodeInput = ({ length = 6, value = '', onChange, disabled = false, autoFocus = false, inputMode = 'numeric' }) => {
  const slots = useMemo(() => Array.from({ length }, (_, i) => i), [length]);
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus();
      refs.current[0].select?.();
    }
  }, [autoFocus]);

  const norm = (String(value || '')).replace(/[^0-9]/g, '').slice(0, length);

  const moveFocus = (index, dir) => {
    const next = index + dir;
    if (next >= 0 && next < length && refs.current[next]) {
      refs.current[next].focus();
      refs.current[next].select?.();
    }
  };

  const setCharAt = (idx, ch) => {
    const chars = norm.split('');
    chars[idx] = ch;
    const next = chars.join('').slice(0, length).replace(/undefined/g, '');
    onChange && onChange(next);
  };

  const handleChange = (e, idx) => {
    const raw = (e.target.value || '').replace(/\D/g, '');
    if (!raw) {
      setCharAt(idx, '');
      return;
    }
    if (raw.length === 1) {
      setCharAt(idx, raw);
      moveFocus(idx, 1);
      return;
    }
    // Handle paste of multiple digits
    const chars = norm.split('');
    for (let i = 0; i < raw.length && (idx + i) < length; i++) {
      chars[idx + i] = raw[i];
    }
    const combined = chars.join('').slice(0, length).replace(/undefined/g, '');
    onChange && onChange(combined);
    const last = Math.min(idx + raw.length, length - 1);
    if (refs.current[last]) refs.current[last].focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (norm[idx]) {
        setCharAt(idx, '');
      } else {
        moveFocus(idx, -1);
        if (idx > 0 && !norm[idx - 1]) setCharAt(idx - 1, '');
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(idx, -1);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(idx, 1);
      return;
    }
  };

  const handlePaste = (e, idx) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const chars = norm.split('');
    for (let i = 0; i < text.length && (idx + i) < length; i++) {
      chars[idx + i] = text[i];
    }
    const combined = chars.join('').slice(0, length).replace(/undefined/g, '');
    onChange && onChange(combined);
    const last = Math.min(idx + text.length, length - 1);
    if (refs.current[last]) refs.current[last].focus();
  };

  return (
    <div className="d-flex gap-2">
      {slots.map((i) => (
        <input
          key={i}
          type="text"
          inputMode={inputMode}
          pattern="[0-9]*"
          className="form-control text-center"
          style={{ width: 46, height: 46, fontSize: 18, borderRadius: 10 }}
          maxLength={1}
          value={norm[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          ref={(el) => (refs.current[i] = el)}
          disabled={disabled}
          aria-label={`Codigo ${i + 1}`}
        />
      ))}
    </div>
  );
};

export default CodeInput;

