export type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = "No data.",
}: Props<T>) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)} className="px-4 py-2 text-left font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border hover:bg-muted/30">
              {columns.map((c) => (
                <td key={String(c.key)} className="px-4 py-2">
                  {c.render
                    ? c.render(row)
                    : String(row[c.key as keyof T] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
