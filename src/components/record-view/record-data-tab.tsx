interface RecordDataTabProps {
  data: Record<string, unknown>;
}

export function RecordDataTab({ data }: RecordDataTabProps) {
  const entries = Object.entries(data).filter(
    ([key]) => !key.startsWith("_") && typeof data[key] !== "object",
  );

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Raw Field Attributes</h3>
        <span className="text-xs text-muted-foreground">{entries.length} attributes</span>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden text-xs">
        <div className="divide-y divide-border">
          {entries.map(([key, val]) => (
            <div key={key} className="flex py-2 px-3 justify-between items-center hover:bg-muted/30 transition-colors">
              <span className="font-mono text-muted-foreground">{key}</span>
              <span className="font-medium text-foreground">{String(val ?? "—")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
