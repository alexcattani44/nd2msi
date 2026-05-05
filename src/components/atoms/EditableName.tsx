"use client";

import React, { useState, useRef, useEffect } from "react";

interface EditableNameProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

export function EditableName({ value, onChange, className = "" }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`bg-bg-primary border border-accent-primary rounded px-1.5 py-0.5 text-accent-primary font-display font-bold outline-none ${className}`}
      />
    );
  }

  return (
    <span
      className={`font-display font-bold text-accent-primary tracking-wide cursor-pointer hover:text-accent-tertiary transition-colors ${className}`}
      onDoubleClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}
