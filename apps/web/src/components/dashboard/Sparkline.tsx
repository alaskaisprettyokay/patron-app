"use client";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  values,
  width = 320,
  height = 80,
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--onda-line, rgba(13,13,13,0.12))"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // smooth path via Catmull-Rom-ish curve
  const coords = points.split(" ").map((p) => p.split(",").map(Number) as [number, number]);
  let d = `M ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i];
    const [x1, y1] = coords[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--onda-rust, #B8621B)"
        strokeOpacity={0.35}
        strokeWidth={3}
      />
      <path
        d={d}
        fill="none"
        stroke="var(--onda-ink, #0D0D0D)"
        strokeWidth={1.25}
      />
    </svg>
  );
}
