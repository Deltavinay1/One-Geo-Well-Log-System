import { useState } from "react";
import UploadForm from "./components/UploadForm";
import CurveSelector from "./components/CurveSelector";
import LogPlot from "./components/LogPlot";
import { getCurves, getLogs, interpretLogs } from "./api";
import "./App.css";

export default function App() {
  const [wellId, setWellId] = useState(null);
  const [curves, setCurves] = useState([]);
  const [selectedCurves, setSelectedCurves] = useState([]);
  const [logs, setLogs] = useState([]);
  const [startDepth, setStartDepth] = useState("");
  const [endDepth, setEndDepth] = useState("");
  const [aiText, setAiText] = useState("");
  const [loadingCurves, setLoadingCurves] = useState(false);

  //Upload
  const handleUploadSuccess = async (id) => {
    setWellId(id);
    setSelectedCurves([]);
    setLogs([]);
    setAiText("");
    setCurves([]);
    setLoadingCurves(true);

    //backend parses LAS in background
    let attempts = 10;

    const pollCurves = async () => {
      try {
        const res = await getCurves(id);
        if (res.data.curves && res.data.curves.length > 0) {
          setCurves(res.data.curves);
          setLoadingCurves(false);
        } else if (attempts > 0) {
          attempts--;
          setTimeout(pollCurves, 1000);
        } else {
          setLoadingCurves(false);
        }
      } catch (err) {
        console.error(err);
        setLoadingCurves(false);
      }
    };

    pollCurves();
  };

  //Load logs
  const loadLogs = async () => {
    if (!wellId || !selectedCurves.length || !startDepth || !endDepth) {
      alert("Select curves and depth range");
      return;
    }

    const res = await getLogs({
      wellId,
      start: startDepth,
      end: endDepth,
      curves: selectedCurves.join(","),
    });

    setLogs(res.data.logs || []);
    setAiText("");
  };

  //AI Interpret
  const runAI = async () => {
    if (!wellId || !selectedCurves.length || !startDepth || !endDepth) {
      alert("Select curves and depth range");
      return;
    }

    const res = await interpretLogs(
      wellId,
      selectedCurves,
      startDepth,
      endDepth,
    );

    setAiText(res.data.interpretation);
  };

  return (
    <div className="app">
      <h1>Well Log System</h1>

      <div className="layout">
        <div className="sidebar">
          <UploadForm onUploadSuccess={handleUploadSuccess} />

          {wellId && (
            <p>
              <b>Well ID:</b> {wellId}
            </p>
          )}

          {loadingCurves && <p>Loading curves…</p>}

          {!loadingCurves && curves.length > 0 && (
            <CurveSelector
              curves={curves}
              selectedCurves={selectedCurves}
              setSelectedCurves={setSelectedCurves}
            />
          )}

          <input
            placeholder="Start Depth"
            value={startDepth}
            onChange={(e) => setStartDepth(e.target.value)}
          />

          <input
            placeholder="End Depth"
            value={endDepth}
            onChange={(e) => setEndDepth(e.target.value)}
          />

          <button onClick={loadLogs}>Load Logs</button>
          <button onClick={runAI}>AI Interpret</button>
        </div>
        <div className="plot">
          {logs.length === 0 ? (
            <div className="plot-placeholder">
              <p>Load logs to visualize</p>
            </div>
          ) : (
            <LogPlot data={logs} curves={selectedCurves} />
          )}

          {aiText && (
            <div className="ai-box">
              <h3>AI Interpretation</h3>
              {aiText
                .split(". ")
                .map(
                  (sentence, i) =>
                    sentence.trim() && <p key={i}>{sentence.trim()}.</p>,
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
