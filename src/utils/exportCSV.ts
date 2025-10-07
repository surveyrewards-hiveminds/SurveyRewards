export function exportCSV({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) =>
          typeof cell === "string"
            ? `"${cell.replace(/"/g, '""')}"`
            : cell ?? ""
        )
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
