import Plot from "react-plotly.js";

export default function LogPlot({ data, curves }) {
  if (!data || data.length === 0 || curves.length === 0) {
    return <div className="empty">Load logs to visualize</div>;
  }

  const traces = curves.map((curve, i) => ({
    x: data.map((d) => d[curve]),
    y: data.map((d) => d.depth),
    type: "scatter",
    mode: "lines",
    name: curve,
    line: { width: 2 },
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: "Well Log Visualization",
        autosize: true,
        xaxis: {
          title: "Value",
          tickformat: ".2s",
          automargin: true,
        },
        yaxis: {
          title: "Depth",
          autorange: "reversed",
        },
        legend: {
          orientation: "h",
          x: 0,
          y: -0.15,
          xanchor: "left",
          yanchor: "top",
          font: { size: 12 },
        },
        height: 600,
        margin: { l: 60, r: 20, t: 50, b: 100 },
        paper_bgcolor: "#151515",
        plot_bgcolor: "#151515",
        font: { color: "#ffffff" },
      }}
      style={{ width: "100%", height: "100%" }}
      config={{ responsive: true }}
    />
  );
}
