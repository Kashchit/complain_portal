import axios from "axios";
import { getApiOrigin } from "../config";

const api = axios.create({
  baseURL: `${getApiOrigin()}/api`,
  withCredentials: true // Send session cookies with every request
});

export default api;
