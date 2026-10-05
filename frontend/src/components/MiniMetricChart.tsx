interface Props {
  values: number[];
  color?: string;
  label: string;
  value: string;
  sub?: string;
}

export function MiniMetricChart({
  values,
  color = "#006A65",
  label,
  value,
  sub,
}: Props) {
  if (values.length === 0) values = [0, 0];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-surface-container-lowest/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest uppercase text-outline">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-title-lg text-title-lg font-bold text-on-surface tabular-nums">
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-on-surface-variant">{sub}</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-8"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* last point marker */}
        {(() => {
          const lastX = width;
          const lastY = height - ((values[values.length - 1] - min) / range) * height;
          return (
            <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
          );
        })()}
      </svg>
    </div>
  );
}