// src/api/client.js
import axios from "axios";

const BASE_URL = "https://simdi-fertilizers.onrender.com";


// const BASE_URL = "http://localhost:5001";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export default api;


//FOR LOCAL DEVLOPMENT

// import axios from "axios";

// const BASE_URL = "http://10.0.2.2:5001";

// const api = axios.create({
//   baseURL: BASE_URL,
//   timeout: 15000,
//   headers: {
//     "Content-Type": "application/json",
//     Accept: "application/json",
//   },
// });

// export default api;
