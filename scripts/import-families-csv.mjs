#!/usr/bin/env node
/**
 * One-time import of historical "خدمات من يديك أعطيناك إلى الأسر" records
 * (Google-Forms CSV exports) into the families module.
 *
 *   # 1. analyse only (no database writes) — always do this first
 *   node --env-file=.env.local scripts/import-families-csv.mjs data-import/a.csv data-import/b.csv
 *
 *   # 2. import
 *   node --env-file=.env.local scripts/import-families-csv.mjs --apply data-import/a.csv data-import/b.csv
 *
 * What it does
 *   - parses every CSV, cleans the values (digits, whitespace, invisible
 *     bidi marks, placeholders such as "0000" / "-----"), splits phones,
 *     separates ages from birth years, maps service types
 *   - excludes obvious test/junk rows (numbers typed into name/address/job)
 *   - detects true duplicates: identical meaningful content (the form
 *     timestamp is ignored); keeps one copy
 *   - keeps separate services of the same family as separate records
 *   - every record gets a deterministic import_key (SHA-256 of its
 *     meaningful content) → running the import twice never duplicates
 *   - writes through the service-role-only RPC `import_family_case`
 *     (server-side, never exposed to the browser)
 *   - writes an audit report (JSON) next to the first CSV file
 *
 * All records go to the families module ONLY (never to donations).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) {
  console.error("Usage: import-families-csv.mjs [--apply] <file.csv> [...]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Mapping of the old form's "نوع الخدمة" values to assistance type codes
// (codes from family_assistance_types). Only confident mappings; everything
// else goes to «أخرى» with the original wording kept in other_assistance.
// The original wording is always stored in source_service_type as well.
// ---------------------------------------------------------------------------
const TYPE_MAP = {
  "بناء بيوت و تشطيب": { codes: ["house_finishing"] },
  "مساعدات مادية للأسر": { codes: ["financial_aid"] },
  "عمليات و أدوية": { codes: ["medical"] },
  "مصاريف مدارس و كليات": { codes: ["education"] },
  "خدمات أخرى": { codes: ["other"] },
  // Not confidently equivalent to an existing type → «أخرى» + original wording
  "فرش البيوت": { codes: ["other"], other: "فرش البيوت" },
  "تجهيز عرايس": { codes: ["other"], other: "تجهيز عرايس" },
};

const COL = {
  recordedAt: "وقت السجل",
  fatherName: "اسم الأب",
  fatherAge: "سن الأب",
  fatherJob: "عمل الأب",
  motherName: "اسم الأم",
  motherAge: "سن الأم",
  motherJob: "عمل الأم",
  address: "العنوان",
  phone: "رقم التليفون",
  childrenCount: "عدد الأطفال",
  serviceDate: "تاريخ الخدمة",
  serviceType: "نوع الخدمة",
  expense: "المصاريف",
  notes: "ملاحظات",
};
const MAX_CHILDREN_COLUMNS = 6;
const UNKNOWN_CHILD = "(غير معروف)";
const NO_SPOUSE_VALUES = ["لا يوجد", "غير متزوج", "غير متزوجه", "غير متزوجة"];

// ---------------------------------------------------------------------------
// Cleaning helpers
// ---------------------------------------------------------------------------
const INVISIBLE = /[​-‏‪-‮⁦-⁩؜﻿ ]/g;

function latinDigits(s) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

/** Single-line field: remove invisible marks, collapse whitespace. */
function cleanLine(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

/** Only dashes / dots / underscores → placeholder for "unknown". */
const isPlaceholder = (s) => /^[\s\-–—_.]*$/.test(s);

function cleanText(v) {
  const s = cleanLine(v);
  return s === null || isPlaceholder(s) ? null : s;
}

/** Multi-line notes: keep every line, only trim line ends and drop invisible marks. */
function cleanNotes(v) {
  if (!v) return null;
  const s = String(v)
    .replace(INVISIBLE, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
  return s === "" ? null : s;
}

function cleanChildName(v) {
  const s = cleanLine(v);
  if (s === null) return null;
  if (isPlaceholder(s)) return UNKNOWN_CHILD;
  const leadingDashes = /^[-–—_]{2,}\s*/.test(s);
  const rest = s.replace(/[-–—_]{2,}/g, " ").replace(/\s+/g, " ").trim();
  if (!rest) return UNKNOWN_CHILD;
  return leadingDashes ? `${UNKNOWN_CHILD} ${rest}` : rest;
}

const CURRENT_YEAR = Number(new Intl.DateTimeFormat("en", { timeZone: "Africa/Cairo", year: "numeric" }).format(new Date()));
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date()); // YYYY-MM-DD

/**
 * Age or birth year. Returns { age, birth_year, issue }.
 *  - "0000", "00", "000001" … → unknown (form placeholders)
 *  - 1900..current year        → birth year (never treated as an age)
 *  - "9.0"                     → 9
 */
function parseAgeOrYear(raw, { min, max }) {
  const s = cleanLine(raw);
  if (s === null) return { age: null, birth_year: null };
  const d = latinDigits(s);
  const m = /^(\d+)(?:\.0+)?$/.exec(d);
  if (!m) return { age: null, birth_year: null, issue: `قيمة غير رقمية "${s}"` };
  const digits = m[1];
  if (/^0+$/.test(digits)) return { age: null, birth_year: null, placeholder: true };
  if (digits.length >= 2 && digits.startsWith("0")) return { age: null, birth_year: null, placeholder: true };
  const n = Number(digits);
  if (n >= 1900 && n <= CURRENT_YEAR) return { age: null, birth_year: n };
  if (n >= min && n <= max) return { age: n, birth_year: null };
  return { age: null, birth_year: null, issue: `قيمة غير منطقية "${s}"` };
}

function parsePhones(raw) {
  const s = cleanLine(raw);
  if (!s) return { phones: [], dropped: [] };
  const found = latinDigits(s).match(/\+?\d{3,}/g) ?? [];
  const phones = [];
  const dropped = [];
  for (const p of found) {
    const digits = p.replace(/^\+/, "");
    if (/^0+1?$/.test(digits) || digits.length < 6 || digits.length > 15) dropped.push(p);
    else if (!phones.includes(p)) phones.push(p);
  }
  return { phones, dropped };
}

function parseExpense(raw) {
  const s = cleanLine(raw);
  if (s === null) return { value: null };
  const d = latinDigits(s).replace(/[,،\s]/g, "").replace(/جنيه|ج\.?م/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(d)) return { value: null, issue: `مبلغ غير مفهوم "${s}"` };
  return { value: Number(d) };
}

function parseServiceDate(raw) {
  const s = cleanLine(raw);
  if (s === null) return { value: null };
  const d = latinDigits(s);
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d);
  if (!m) return { value: null, issue: `تاريخ غير مفهوم "${s}"` };
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) return { value: null, issue: `تاريخ غير صحيح "${s}"` };
  return { value: iso };
}

/** "٢٦‏/٤‏/٢٠٢٦ ٨:٠٣:١١ م" (Africa/Cairo) → ISO timestamp with offset. */
function parseRecordedAt(raw) {
  const s = cleanLine(raw);
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*([صم])?$/.exec(latinDigits(s).replace(/\s*\/\s*/g, "/"));
  if (!m) return null;
  let [, dd, mm, yyyy, hh, mi, ss, ampm] = m;
  let h = Number(hh);
  if (ampm === "م" && h < 12) h += 12;
  if (ampm === "ص" && h === 12) h = 0;
  // Work out Cairo's UTC offset for that local time (handles DST).
  const asUtc = Date.UTC(+yyyy, +mm - 1, +dd, h, +mi, +ss);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(asUtc));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const cairoAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMin = Math.round((cairoAsUtc - asUtc) / 60000);
  return new Date(asUtc - offsetMin * 60000).toISOString();
}

/** Loose Arabic normalisation used only to group the same person. */
function personNorm(s) {
  return (s ?? "")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/[ئء]/g, "ي")
    .replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Row → record
// ---------------------------------------------------------------------------
function isJunkRow(r) {
  // Test submissions typed numbers into free-text fields (mother name,
  // jobs, address). Real rows never have ≥3 of these purely numeric.
  const fields = [r[COL.fatherJob], r[COL.motherName], r[COL.motherJob], r[COL.address]];
  const numeric = fields.filter((v) => v && /^\s*[\d٠-٩]+\s*$/.test(v)).length;
  return numeric >= 3;
}

function toRecord(r, source) {
  const warnings = [];

  const fatherName = cleanText(r[COL.fatherName]);
  const motherName = cleanText(r[COL.motherName]);
  const father = parseAgeOrYear(r[COL.fatherAge], { min: 12, max: 120 });
  let mother = parseAgeOrYear(r[COL.motherAge], { min: 12, max: 120 });
  if (father.issue) warnings.push(`سن الأب: ${father.issue} — لم يُستورد`);
  if (mother.issue) warnings.push(`سن الأم: ${mother.issue} — لم يُستورد`);
  if (motherName && NO_SPOUSE_VALUES.includes(motherName) && (mother.age || mother.birth_year)) {
    warnings.push(`سن الأم "${cleanLine(r[COL.motherAge])}" تم تجاهله لأن اسم الأم "${motherName}"`);
    mother = { age: null, birth_year: null };
  }

  const children = [];
  for (let i = 1; i <= MAX_CHILDREN_COLUMNS; i++) {
    const rawName = r[`اسم الطفل ${i}`];
    const rawAge = r[`سن الطفل ${i}`];
    if (!cleanLine(rawName) && !cleanLine(rawAge)) continue;
    const name = cleanChildName(rawName) ?? UNKNOWN_CHILD;
    const age = parseAgeOrYear(rawAge, { min: 1, max: 100 });
    if (age.issue) warnings.push(`سن الطفل ${i}: ${age.issue} — لم يُستورد`);
    children.push({ name, age: age.age, birth_year: age.birth_year, education_stage: null });
  }
  const declaredChildren = Number(latinDigits(cleanLine(r[COL.childrenCount]) ?? "")) || 0;
  if (declaredChildren !== children.length) {
    warnings.push(`عدد الأطفال المسجل ${declaredChildren} بينما تم العثور على ${children.length}`);
  }

  const { phones, dropped } = parsePhones(r[COL.phone]);
  if (dropped.length) warnings.push(`أرقام غير صالحة/افتراضية تم تجاهلها: ${dropped.join("، ")}`);

  const serviceDate = parseServiceDate(r[COL.serviceDate]);
  if (serviceDate.issue) warnings.push(`تاريخ الخدمة: ${serviceDate.issue}`);
  const recordedAt = parseRecordedAt(r[COL.recordedAt]);
  const futureDate = serviceDate.value && serviceDate.value > TODAY;
  if (futureDate) warnings.push(`تاريخ الخدمة ${serviceDate.value} في المستقبل (ربما تم تبديل اليوم والشهر) — تم الاحتفاظ به كما هو`);

  const expense = parseExpense(r[COL.expense]);
  if (expense.issue) warnings.push(`المصاريف: ${expense.issue}`);

  const sourceType = cleanLine(r[COL.serviceType]);
  const mapping = sourceType ? TYPE_MAP[sourceType] : null;
  const typeCodes = mapping ? mapping.codes : ["other"];
  const otherAssistance = mapping ? (mapping.other ?? null) : sourceType;
  if (sourceType && !mapping) warnings.push(`نوع خدمة غير معروف "${sourceType}" — سُجل تحت «أخرى»`);

  const payload = {
    father_name: fatherName,
    father_age: father.age,
    father_birth_year: father.birth_year,
    father_job: cleanText(r[COL.fatherJob]),
    mother_name: motherName,
    mother_age: mother.age,
    mother_birth_year: mother.birth_year,
    mother_job: cleanText(r[COL.motherJob]),
    address: cleanText(r[COL.address]),
    phones,
    children,
    type_codes: typeCodes,
    other_assistance: otherAssistance,
    service_date: serviceDate.value,
    expense_amount: expense.value,
    notes: cleanNotes(r[COL.notes]),
    source_service_type: sourceType,
    source_recorded_at: recordedAt,
  };

  // Meaningful content for duplicate detection / idempotency: everything
  // except the form timestamp. Whitespace inside notes is collapsed so a
  // re-submitted copy with different line breaks is still a duplicate.
  const identity = {
    ...payload,
    notes: payload.notes ? payload.notes.replace(/\s+/g, " ") : null,
    source_recorded_at: undefined,
  };
  payload.import_key = createHash("sha256").update(JSON.stringify(identity)).digest("hex");

  return { source, payload, warnings, futureDate };
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
const perFile = [];
const junk = [];
const all = [];

for (const file of files) {
  const rows = parse(fs.readFileSync(file), { columns: true, bom: true, relax_column_count: true, skip_empty_lines: true });
  perFile.push({ file: path.basename(file), rows: rows.length });
  rows.forEach((r, i) => {
    const source = `${path.basename(file)}:${i + 2}`; // +2 → spreadsheet line (header is line 1)
    if (isJunkRow(r)) {
      junk.push({ source, father_name: cleanLine(r[COL.fatherName]), notes: cleanLine(r[COL.notes]) });
      return;
    }
    all.push(toRecord(r, source));
  });
}

const byKey = new Map();
const duplicates = [];
for (const rec of all) {
  const existing = byKey.get(rec.payload.import_key);
  if (existing) {
    existing.duplicates.push(rec.source);
    duplicates.push({ kept: existing.source, duplicate: rec.source, father_name: rec.payload.father_name });
  } else {
    byKey.set(rec.payload.import_key, { ...rec, duplicates: [] });
  }
}
const unique = [...byKey.values()].sort((a, b) =>
  (a.payload.source_recorded_at ?? "").localeCompare(b.payload.source_recorded_at ?? ""),
);

// Same family/person with several (different) services.
const groups = new Map();
for (const rec of unique) {
  const keys = [
    `name:${personNorm(rec.payload.father_name)}|${personNorm(rec.payload.mother_name)}`,
    ...rec.payload.phones.map((p) => `phone:${p}`),
  ];
  let group = keys.map((k) => groups.get(k)).find(Boolean);
  if (!group) group = { members: [] };
  group.members.push(rec);
  keys.forEach((k) => groups.set(k, group));
}
const multiService = [...new Set(groups.values())]
  .filter((g) => g.members.length > 1)
  .map((g) => ({
    father_name: g.members[0].payload.father_name,
    mother_name: g.members[0].payload.mother_name,
    records: g.members.map((m) => ({
      source: m.source,
      service_date: m.payload.service_date,
      service_type: m.payload.source_service_type,
      expense: m.payload.expense_amount,
    })),
  }));

const report = {
  generated_at: new Date().toISOString(),
  mode: APPLY ? "apply" : "dry-run",
  files: perFile,
  total_source_rows: perFile.reduce((s, f) => s + f.rows, 0),
  excluded_junk_rows: junk,
  true_duplicates_removed: duplicates,
  unique_records: unique.length,
  same_family_multiple_services: multiService,
  records_with_warnings: unique
    .filter((u) => u.warnings.length)
    .map((u) => ({ source: u.source, father_name: u.payload.father_name, warnings: u.warnings })),
  type_mapping: Object.fromEntries(
    [...new Set(unique.map((u) => u.payload.source_service_type))].map((t) => [t, TYPE_MAP[t] ?? { codes: ["other"], other: t }]),
  ),
};

console.log("══════════ Import analysis ══════════");
for (const f of perFile) console.log(`  ${f.file}: ${f.rows} rows`);
console.log(`  Total source rows:          ${report.total_source_rows}`);
console.log(`  Excluded test/junk rows:    ${junk.length}  ${junk.map((j) => `${j.source} «${j.father_name}»`).join(", ")}`);
console.log(`  True duplicates removed:    ${duplicates.length}`);
for (const d of duplicates) console.log(`      ${d.duplicate} = ${d.kept}  «${d.father_name}»`);
console.log(`  Unique records to import:   ${unique.length}`);
console.log(`  Families with >1 service:   ${multiService.length}`);
for (const g of multiService) {
  console.log(`      «${g.father_name} / ${g.mother_name}»`);
  for (const r of g.records) console.log(`         ${r.source}  ${r.service_date}  ${r.service_type}  ${r.expense} ج.م`);
}
console.log("  Service type mapping:");
for (const [t, m] of Object.entries(report.type_mapping)) console.log(`      ${t}  →  ${m.codes.join(",")}${m.other ? ` (أخرى: ${m.other})` : ""}`);
console.log(`  Records with cleaning notes: ${report.records_with_warnings.length} (details in the JSON report)`);

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------
if (APPLY) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✖ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (run with --env-file=.env.local).");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = { inserted: 0, skipped: 0, failed: [] };
  for (const rec of unique) {
    const { data, error } = await supabase.rpc("import_family_case", { p_data: rec.payload });
    if (error) results.failed.push({ source: rec.source, error: error.message });
    else results[data === "inserted" ? "inserted" : "skipped"]++;
  }
  report.result = results;
  console.log("══════════ Import result ══════════");
  console.log(`  Inserted: ${results.inserted}`);
  console.log(`  Skipped (already imported): ${results.skipped}`);
  console.log(`  Failed: ${results.failed.length}`);
  for (const f of results.failed) console.log(`      ${f.source}: ${f.error}`);
  if (results.failed.length) process.exitCode = 1;
} else {
  console.log("\n(dry run — nothing was written. Re-run with --apply to import.)");
}

if (process.env.DUMP_PAYLOADS) fs.writeFileSync(path.join(path.dirname(files[0]), "payloads.json"), JSON.stringify(unique.map((u) => ({ source: u.source, ...u.payload })), null, 2));
const reportPath = path.join(path.dirname(files[0]), `import-report-${APPLY ? "apply" : "dry-run"}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`  Report: ${reportPath}`);
