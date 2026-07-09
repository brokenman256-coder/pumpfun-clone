import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, timeAgo } from '../lib/format'

export function ThreadSection({ tokenId }: { tokenId: string }) {
  const comments = useStore((s) => s.comments.filter((c) => c.tokenId === tokenId))
  const addComment = useStore((s) => s.addComment)
  const likeComment = useStore((s) => s.likeComment)
  const { connected, openModal } = useWallet()
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [showImg, setShowImg] = useState(false)

  function onFile(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  function post() {
    if (!connected) {
      openModal()
      return
    }
    if (!text.trim() && !imageUrl) return
    addComment(tokenId, text || '📷', imageUrl || undefined)
    setText('')
    setImageUrl('')
    setShowImg(false)
  }

  return (
    <div>
      <div className="mb-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={connected ? 'add a reply…' : 'connect wallet to reply'}
            className="flex-1 rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2 text-sm outline-none focus:border-[#86efac]/40"
            onKeyDown={(e) => e.key === 'Enter' && post()}
          />
          <button
            type="button"
            onClick={() => setShowImg((v) => !v)}
            className="rounded-lg border border-[#26272e] px-3 text-sm hover:border-[#86efac]/40"
            title="attach image"
          >
            📷
          </button>
          <button
            type="button"
            onClick={post}
            className="btn-press rounded-lg bg-[#86efac] px-4 py-2 text-sm font-bold text-black"
          >
            post
          </button>
        </div>
        {showImg && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-dashed border-[#26272e] px-3 py-2 text-xs text-[#8b8d97] hover:border-[#86efac]/40">
              upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <input
              value={imageUrl.startsWith('data:') ? '' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="or image URL"
              className="min-w-[180px] flex-1 rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2 text-xs outline-none"
            />
            {imageUrl && (
              <img src={imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-[#8b8d97]">be the first to reply 💬</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="fade-up rounded-lg bg-[#0e0f13] p-3">
            <div className="flex items-center justify-between text-[11px] text-[#8b8d97]">
              <span className="text-[#86efac]">{shortAddr(c.author)}</span>
              <span>{timeAgo(c.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-[#e8e8ed]">{c.text}</p>
            {c.imageUrl && (
              <img
                src={c.imageUrl}
                alt=""
                className="mt-2 max-h-40 rounded-lg border border-[#26272e] object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => likeComment(c.id)}
              className="mt-2 text-xs text-[#8b8d97] transition hover:text-[#86efac]"
            >
              ❤️ {c.likes}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
