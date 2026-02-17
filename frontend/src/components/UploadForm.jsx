import { useState } from "react";
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return alert("Select LAS file");

    try {
      setLoading(true);

      const form = new FormData();
      form.append("file", file);

      const res = await API.post("/upload", form);

      onUploadSuccess(res.data.wellId);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={upload} disabled={loading}>
        {loading ? "Uploading..." : "Upload LAS"}
      </button>
    </div>
  );
}

export default UploadForm;
