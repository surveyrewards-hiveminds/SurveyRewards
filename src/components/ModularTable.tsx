import React from "react";
import { getTranslation } from "../i18n";
import { useLanguage } from "../context/LanguageContext";

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  actions?: (row: T) => React.ReactNode;
};

export function ModularTable<T extends object>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  actions,
}: TableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const { language } = useLanguage();

  return (
    <div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}
        className="border border-sm border-gray-200 rounded-md"
      >
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #e5e7eb",
                  textAlign: "left",
                }}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th
                style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}
              ></th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}
                >
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
              {actions && (
                <td style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "none",
            background: page === 1 ? "#e5e7eb" : "#6366f1",
            color: page === 1 ? "#888" : "#fff",
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
          onClick={() => page > 1 && onPageChange(page - 1)}
          disabled={page === 1}
        >
          {getTranslation("pagination.previous", language)}
        </button>
        <span>
          {getTranslation("pagination.pageOf", language)
            .replace("{current}", page.toString())
            .replace("{total}", Math.ceil(totalPages).toString())}
        </span>
        <button
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "none",
            background: page === totalPages ? "#e5e7eb" : "#6366f1",
            color: page === totalPages ? "#888" : "#fff",
            cursor: page === totalPages ? "not-allowed" : "pointer",
          }}
          onClick={() => page < totalPages && onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          {getTranslation("pagination.next", language)}
        </button>
      </div>
    </div>
  );
}
