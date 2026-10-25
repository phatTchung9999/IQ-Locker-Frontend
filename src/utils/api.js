import axios from 'axios';

export const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:3005').replace(/\/$/, ''),
  timeout: 15000,
});
