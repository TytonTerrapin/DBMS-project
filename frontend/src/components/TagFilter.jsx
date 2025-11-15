import { useState } from 'react'

export default function TagFilter({ tags, selectedTag, onTagSelect }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>Filter by Tags</h3>
      
      {/* Search input */}
      <input
        type="text"
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-field mb-3"
      />

      {/* Tags list */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        <button
          onClick={() => onTagSelect(null)}
          className="w-full text-left px-3 py-2 transition-colors"
          style={{
            background: !selectedTag ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
            color: !selectedTag ? 'var(--accent)' : 'var(--text)',
            fontWeight: !selectedTag ? '500' : '400',
            borderRadius: 'var(--radius)'
          }}
        >
          All Photos
        </button>
        
        {filteredTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagSelect(tag)}
            className="w-full text-left px-3 py-2 transition-colors hover:bg-gray-50"
            style={{
              background: selectedTag === tag ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
              color: selectedTag === tag ? 'var(--accent)' : 'var(--text)',
              fontWeight: selectedTag === tag ? '500' : '400',
              borderRadius: 'var(--radius)'
            }}
          >
            {tag}
          </button>
        ))}
        
        {filteredTags.length === 0 && searchQuery && (
          <p className="text-sm px-3 py-2" style={{ color: 'var(--muted)' }}>No tags found</p>
        )}
      </div>
    </div>
  )
}
