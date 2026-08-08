"use client";

import { useState } from "react";
import { NewsCard as NewsCardType } from "@/types";

export default function NewsCard({ card }: { card: NewsCardType }) {
  const [open, setOpen] = useState(false);
  const hasExplainer = card.eli5Background || card.eli5Explanation || card.eli5Consequences;
  const timeAgo = getTimeAgo(card.publishedAt);

  return (
    <>
      <article className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col">
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug mb-2 line-clamp-3">
            {card.headline}
          </h3>

          <p className="text-[13px] text-slate-600 leading-relaxed mb-3 flex-1">
            {card.summary}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span className="font-medium">{card.origin}</span>
            <div className="flex items-center gap-2">
              <span>{timeAgo}</span>
              <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 font-medium">
                Read ↗
              </a>
            </div>
          </div>
        </div>

        {hasExplainer && (
          <div className="border-t border-slate-100">
            <button
              onClick={() => setOpen(true)}
              className="w-full px-5 py-2.5 text-[12px] font-semibold text-left bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              💡 Break it down
            </button>
          </div>
        )}
      </article>

      {/* Modal overlay */}
      {open && hasExplainer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal card */}
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-bold text-slate-900 leading-snug">
                  {card.headline}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-lg"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{card.origin} · {timeAgo}</p>
            </div>

            {/* Explanation content */}
            <div className="px-6 py-5 space-y-4">
              {card.eli5Background && (
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">📜 How it started</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{card.eli5Background}</p>
                </div>
              )}
              {card.eli5Explanation && (
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">🧒 In simple words</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{card.eli5Explanation}</p>
                </div>
              )}
              {card.eli5Consequences && (
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">⚡ Why it matters</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{card.eli5Consequences}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-blue-600 hover:text-blue-800 font-medium"
              >
                Read full article ↗
              </a>
              <button
                onClick={() => setOpen(false)}
                className="text-[12px] text-slate-500 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
