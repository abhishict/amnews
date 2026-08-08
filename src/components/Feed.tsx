"use client";

import { useState } from "react";
import { NewsCard as NewsCardType } from "@/types";
import NewsCard from "./NewsCard";

interface FeedProps {
  initialCards: NewsCardType[];
}

export default function Feed({ initialCards }: FeedProps) {
  const [cards] = useState<NewsCardType[]>(initialCards);
  const [searchResults, setSearchResults] = useState<NewsCardType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchedFor, setSearchedFor] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearchedFor(query.trim());
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });
      if (!res.ok) { alert("Search failed"); return; }
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSearchResults(data.cards.map((c: any) => ({
        ...c,
        publishedAt: new Date(c.publishedAt),
        processedAt: new Date(c.processedAt),
        expiresAt: new Date(c.expiresAt),
      })));
    } catch {
      alert("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setQuery("");
    setSearchedFor("");
  };

  const displayCards = searchResults ?? cards;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <button onClick={clearSearch} className="text-xl font-bold tracking-tight text-slate-900 hover:opacity-70 transition-opacity">
              AM<span className="text-blue-600">News</span>
            </button>

            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full max-w-sm ml-6">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search any topic..."
                  className="w-full rounded-lg bg-slate-100 border-0 pl-9 pr-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : "Search"}
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Section header */}
        {searchResults !== null ? (
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Results for &ldquo;{searchedFor}&rdquo;
              </h2>
              <p className="text-sm text-slate-500">{displayCards.length} articles found</p>
            </div>
            <button onClick={clearSearch} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              ← Back to headlines
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Headlines</h2>
              <p className="text-sm text-slate-500">Updated every morning at 7 AM</p>
            </div>
            <div className="text-2xl animate-bounce" title="AMNews hamster is working hard!">
              🐹
            </div>
          </div>
        )}

        {/* Cards grid */}
        {displayCards.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
            <p className="text-slate-400 text-sm">
              {loading ? "Searching..." : searchResults ? "No results found." : "No headlines yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCards.map((card, i) => (
              <NewsCard key={card.id || card.sourceUrl || i} card={card} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
