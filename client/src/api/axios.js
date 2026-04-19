import axios from "axios";
import { getApiOrigin } from "../config";

const api = axios.create({
  baseURL: `${getApiOrigin()}/api`
});

export default api;
