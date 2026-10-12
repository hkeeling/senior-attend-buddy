import type { Attendee } from "@/lib/attendance.functions";

// Spreadsheet apps treat cells starting with these as formulas. Student-typed
// names and comments must never run as formulas when the instructor opens the
// file, so such cells get a leading apostrophe (OWASP CSV-injection guidance).
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | null) {
  let s = value ?? "";
  if (FORMULA_START.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Local time as "YYYY-MM-DD HH:mm": sortable and the same in every locale.
function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toCsv(attendees: Attendee[]) {
  const header = "Name,Student ID,Checked In,Comment";
  const rows = attendees.map((a) =>
    [cell(a.name), cell(a.studentId), cell(formatTimestamp(a.checkedInAt)), cell(a.comment)].join(
      ",",
    ),
  );
  // RFC 4180 line endings.
  return [header, ...rows].join("\r\n");
}

// e.g. "csci-491-senior-project-i-attendance-2026-10-12.csv"
export function attendanceFilename(className: string, sessionDateIso: string) {
  const slug = className
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date(sessionDateIso).toLocaleDateString("en-CA");
  return `${slug}-attendance-${date}.csv`;
}

export function downloadCsv(filename: string, csv: string) {
  // The BOM makes Excel on Windows read the file as UTF-8 (accented names).
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
