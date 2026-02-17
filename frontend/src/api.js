import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.BACKEND_URL,
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
