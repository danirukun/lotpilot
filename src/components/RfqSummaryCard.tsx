"use client";

import { CATEGORY_KEYWORDS } from "@/lib/parseBrief";
import type { Category } from "@/lib/types";

import { useState } from "react";
import { rfqChips, rfqSummaryLine } from "@/lib/rfq/format";
import type { RfqPatch } from "@/lib/rfq/resolve";
import type { Rfq, RfqGradeLetter } from "@/lib/rfq/types";

const SOURCE_LABEL: Record<Rfq["source"], string> = {
  deterministic: "Parsed by rules",
  llm: "Parsed by LLM",
  edited: "Edited by you"
};

const GRADE_HINT: Record<RfqGradeLetter, string> = {
  A: "A",
  B: "AB, B",
  C: "Mixed"
};

export function RfqSummaryCard({
  rfq,
  onEdit,
  disabled
}: {
  rfq: Rfq;
  onEdit?: (patch: RfqPatch) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="card animate-fade-up p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="label-eyebrow">Request for quote</span>
          <p className="mt-1 text-sm text-paper/90">
            <span className="text-paper/55">Your RFQ: </span>
            <span className="font-semibold">{rfqSummaryLine(rfq)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip text-[11px]">{SOURCE_LABEL[rfq.source]}</span>
          {onEdit && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              disabled={disabled}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              {editing ? "Close" : "Edit RFQ"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {rfqChips(rfq).map((c) => (
          <span
            key={c.id}
            className={`chip text-[11px] ${c.set ? "border-brand-500/40 text-brand-100" : "text-paper/45"}`}
          >
            <span className="text-paper/45">{c.label}</span>
            {c.value}
          </span>
        ))}
      </div>

      {editing && onEdit && (
        <RfqEditForm
          rfq={rfq}
          disabled={disabled}
          onSubmit={(patch) => {
            setEditing(false);
            onEdit(patch);
          }}
        />
      )}
    </div>
  );
}

function RfqEditForm({
  rfq,
  onSubmit,
  disabled
}: {
  rfq: Rfq;
  onSubmit: (patch: RfqPatch) => void;
  disabled?: boolean;
}) {
  const [min, setMin] = useState(rfq.pieceRange.min?.toString() ?? "");
  const [max, setMax] = useState(rfq.pieceRange.max?.toString() ?? "");
  const [price, setPrice] = useState(rfq.maxPricePerPiece?.toString() ?? "");
  const [budget, setBudget] = useState(rfq.budget?.toString() ?? "");
  const [letters, setLetters] = useState<RfqGradeLetter[]>(rfq.gradeLetters);
  const [categories, setCategories] = useState<Category[]>(rfq.categories);
  const [brands, setBrands] = useState(rfq.brands.join(", "));

  const toggle = (l: RfqGradeLetter) =>
    setLetters((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s));

  return (
    <form
      className="mt-4 grid gap-3 rounded-xl border border-ink-line bg-ink/40 p-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          categories,
          pieceRange: { min: toNum(min), max: toNum(max) },
          maxPricePerPiece: toNum(price) ?? null,
          budget: toNum(budget) ?? null,
          gradeLetters: letters,
          brands: brands
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean)
        });
      }}
    >
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-xs text-paper/65">Confirm your current product categories</legend>
        <div className="flex flex-wrap gap-2">{Object.keys(CATEGORY_KEYWORDS).map(c => <label key={c} className="chip cursor-pointer">
          <input type="checkbox" checked={categories.includes(c as Category)} onChange={e => setCategories(previous => e.target.checked ? [...previous, c as Category] : previous.filter(value => value !== c))} className="mr-1" />{c}
        </label>)}</div>
      </fieldset>
      <Field label="Pieces per lot">
        <div className="flex items-center gap-2">
          <NumberInput value={min} onChange={setMin} placeholder="min" />
          <span className="text-paper/40">–</span>
          <NumberInput value={max} onChange={setMax} placeholder="max" />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max £ / piece">
          <NumberInput value={price} onChange={setPrice} placeholder="any" step="0.5" />
        </Field>
        <Field label="Budget £">
          <NumberInput value={budget} onChange={setBudget} placeholder="2000" step="50" />
        </Field>
      </div>
      <Field label="Grades accepted">
        <div className="flex gap-2">
          {(["A", "B", "C"] as RfqGradeLetter[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggle(l)}
              title={`Catalog grades: ${GRADE_HINT[l]}`}
              className={`chip ${letters.includes(l) ? "border-brand-500/70 bg-brand-500/20 text-brand-100" : ""}`}
            >
              Grade {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Brand hints">
        <input
          value={brands}
          onChange={(e) => setBrands(e.target.value)}
          placeholder="Levi's, Wrangler"
          className="w-full rounded-lg border border-ink-line bg-ink px-3 py-1.5 text-sm text-paper placeholder:text-paper/35 focus:border-brand-500/60 focus:outline-none"
        />
      </Field>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-[11px] text-paper/45">No grade selected means any grade.</p>
        <button type="submit" disabled={disabled} className="btn-primary px-4 py-2 text-xs">
          Re-run with this RFQ
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-paper/45">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step = "1"
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-ink-line bg-ink px-3 py-1.5 text-sm text-paper placeholder:text-paper/35 focus:border-brand-500/60 focus:outline-none"
    />
  );
}
