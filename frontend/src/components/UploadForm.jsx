import { useState } from "react";
import axios from "axios";

function UploadForm({ onUploadSuccess }) {
  const [file, setFile] = useState(null);

  const upload = async () => {
    if (!file) return alert("Select LAS file");

    const form = new FormData();
    form.append("file", file);

    const res = await axios.post("http://localhost:5000/upload", form);
    onUploadSuccess(res.data.wellId);
  };

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button className="button" onClick={upload}>
        Upload LAS
      </button>
    </div>
  );
}

export default UploadForm;
