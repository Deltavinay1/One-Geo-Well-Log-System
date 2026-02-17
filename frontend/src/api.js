import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

export const interpretLogs = (wellId, curves, start, end) =>
  API.get("/interpret", {
    params: {
      wellId,
      start,
      end,
      curves: curves.join(","),
    },
  });

export const getCurves = (id) => API.get(`/curves/${id}`);

export const getLogs = (params) => API.get("/logs", { params });
