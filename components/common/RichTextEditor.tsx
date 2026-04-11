'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

interface RichTextEditorProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  maxLength?: number
  className?: string
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Enter your text here...',
  height = 300,
  maxLength,
  className = ''
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleChange = (val?: string) => {
    const newValue = val || ''
    if (maxLength && newValue.length > maxLength) {
      return // Don't update if exceeds max length
    }
    onChange(newValue)
  }

  if (!mounted) {
    return (
      <div 
        className={`border border-gray-300 rounded-md p-4 bg-gray-50 ${className}`}
        style={{ height }}
      >
        <p className="text-gray-500 text-sm">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div data-color-mode="light">
        <MDEditor
          value={value}
          onChange={handleChange}
          preview="edit"
          hideToolbar={false}
          visibleDragbar={false}
          textareaProps={{
            placeholder,
            style: { fontSize: 14, lineHeight: 1.5 }
          }}
          height={height}
        />
      </div>
      {maxLength && (
        <p className="text-sm text-gray-500 mt-1">
          {value.length}/{maxLength} characters
        </p>
      )}
    </div>
  )
}