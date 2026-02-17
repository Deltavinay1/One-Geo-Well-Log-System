export async function interpretLogs(pool, req, res) {
  try {
    const { wellId, start, end, curves } = req.query;

    if (!wellId || !start || !end || !curves) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const curveList = curves.split(",");
    let interpretations = [];

    for (const curve of curveList) {
      const result = await pool.query(
        `
        SELECT 
          AVG(value) AS avg,
          MIN(value) AS min,
          MAX(value) AS max,
          STDDEV(value) AS std
        FROM logs
        WHERE well_id = $1
          AND depth BETWEEN $2 AND $3
          AND curve_name = $4
        `,
        [wellId, start, end, curve]
      );

      const { avg, std } = result.rows[0];

      if (avg === null) {
        interpretations.push(
          `${curve}: No sufficient data available in this depth interval.`
        );
        continue;
      }

      let text = "";

      if (avg < 1) {
        text = "very low values suggesting minimal hydrocarbon presence.";
      } else if (avg < 10) {
        text = "moderate values indicating minor hydrocarbon shows.";
      } else {
        text = "high values indicating potential hydrocarbon-bearing zones.";
      }

      if (std && std > avg * 0.5) {
        text += " High variability suggests heterogeneous formations.";
      }

      interpretations.push(`${curve}: ${text}`);
    }

    res.json({
      wellId,
      depthRange: `${start} – ${end}`,
      interpretation: interpretations.join(" "),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Interpretation failed" });
  }
}
