export default function CurveSelector({
  curves,
  selectedCurves,
  setSelectedCurves,
}) {
  const toggleCurve = (curve) => {
    setSelectedCurves((prev) =>
      prev.includes(curve) ? prev.filter((c) => c !== curve) : [...prev, curve],
    );
  };

  return (
    <>
      <h3>Select Curves</h3>
      <div className="curve-list">
        {curves.map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={selectedCurves.includes(c)}
              onChange={() => toggleCurve(c)}
            />
            <span>{c}</span>
          </label>
        ))}
      </div>
    </>
  );
}
