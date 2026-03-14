"use client";

import { useState } from "react";

export type PanelItem = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primary?: string;
  secondary?: string;
  meta?: string;
  tone?: "normal" | "success" | "danger";
};

type PaginatedPanelProps = {
  title: string;
  description?: string;
  items: PanelItem[];
  pageSize?: number;
  headerAction?: React.ReactNode;
  emptyText?: string;
};

export function PaginatedPanel({
  title,
  description,
  items,
  pageSize = 3,
  headerAction,
  emptyText = "暂无记录",
}: PaginatedPanelProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const visible = items.slice(page * pageSize, page * pageSize + pageSize);
  // Pad to pageSize so the card height is fixed
  const padded = [
    ...visible,
    ...Array.from({ length: Math.max(0, pageSize - visible.length) }, () => null as null),
  ];

  return (
    <article className="panel rounded-[28px] p-5 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 shrink-0 mb-4">
        <div className="min-w-0">
          <h3 className="section-title text-lg font-semibold text-[var(--color-ink-900)] truncate">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)] line-clamp-1">{description}</p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      {/* Items — fixed at pageSize rows */}
      <div className="flex flex-col gap-2.5 flex-1 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-[20px] border border-dashed border-[var(--border-soft)]">
            <p className="text-xs text-[var(--muted)]">{emptyText}</p>
          </div>
        ) : (
          padded.map((item, idx) =>
            item ? (
              <div
                key={item.id}
                className={`flex-1 rounded-[18px] border px-4 py-3 flex flex-col justify-between ${
                  item.tone === "danger"
                    ? "border-[rgba(165,63,43,0.2)] bg-[rgba(165,63,43,0.04)]"
                    : item.tone === "success"
                      ? "border-[rgba(53,95,59,0.2)] bg-[rgba(53,95,59,0.04)]"
                      : "border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {item.eyebrow ? (
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)] truncate">
                        {item.eyebrow}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink-900)] truncate">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-xs text-[var(--muted)] truncate">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    {item.primary ? (
                      <p className="text-sm font-semibold text-[var(--color-ink-900)] whitespace-nowrap">{item.primary}</p>
                    ) : null}
                    {item.secondary ? (
                      <p className="mt-0.5 text-xs text-[var(--muted)] whitespace-nowrap">{item.secondary}</p>
                    ) : null}
                  </div>
                </div>
                {item.meta ? (
                  <p className="mt-1.5 text-[10px] text-[var(--muted)] truncate">{item.meta}</p>
                ) : null}
              </div>
            ) : (
              /* Empty placeholder row to keep height fixed */
              <div
                key={`empty-${idx}`}
                className="flex-1 rounded-[18px] border border-dashed border-[var(--border-soft)] opacity-0"
              />
            )
          )
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-4 shrink-0">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] text-[var(--color-ink-700)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="上一页"
        >
          ‹
        </button>
        <span className="text-xs text-[var(--muted)]">
          {items.length === 0 ? "0 条" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, items.length)} / ${items.length} 条`}
        </span>
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] text-[var(--color-ink-700)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="下一页"
        >
          ›
        </button>
      </div>
    </article>
  );
}
