import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface MarkdownRendererProps {
  content: string
  className?: string
  /** Set to true to render inline (without block elements like p, ul, ol) */
  inline?: boolean
  /** Set to true to disable interactive links (prevents nested <a> tags) */
  disableLinks?: boolean
}

/**
 * Reusable Markdown renderer with HTML support
 * Supports all common HTML tags and Markdown syntax
 */
export function MarkdownRenderer({ content, className = '', inline = false, disableLinks = false }: MarkdownRendererProps) {
  const defaultComponents = {
    // Block elements
    p: ({ children }: any) => inline ? <span>{children}</span> : <p className="mb-2">{children}</p>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-2 mt-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-semibold mb-2 mt-3">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-semibold mb-2 mt-2">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-sm font-semibold mb-1 mt-2">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-xs font-semibold mb-1 mt-2">{children}</h6>,

    // Lists
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="ml-4">{children}</li>,

    // Inline elements
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    u: ({ children }: any) => <u className="underline">{children}</u>,
    del: ({ children }: any) => <del className="line-through">{children}</del>,
    s: ({ children }: any) => <s className="line-through">{children}</s>,

    // Links - render as span if disableLinks is true to prevent nested <a> tags
    a: ({ children, href }: any) =>
      disableLinks ? (
        <span className="text-blue-600">{children}</span>
      ) : (
        <a
          href={href}
          className="text-blue-600 hover:text-blue-800 underline"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </a>
      ),

    // Code
    code: ({ children, inline: isInline }: any) =>
      isInline ? (
        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
      ) : (
        <code className="block bg-gray-100 p-2 rounded text-sm font-mono overflow-x-auto mb-2">{children}</code>
      ),
    pre: ({ children }: any) => <pre className="bg-gray-100 p-3 rounded mb-2 overflow-x-auto">{children}</pre>,

    // Blockquote
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-700">
        {children}
      </blockquote>
    ),

    // Table
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-2">
        <table className="min-w-full border-collapse border border-gray-300">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-gray-100">{children}</thead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => <tr className="border-b border-gray-300">{children}</tr>,
    th: ({ children }: any) => <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }: any) => <td className="border border-gray-300 px-3 py-2">{children}</td>,

    // Horizontal rule
    hr: () => <hr className="my-4 border-gray-300" />,

    // Line break
    br: () => <br />,
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={defaultComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
