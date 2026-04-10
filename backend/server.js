const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = 5000;

app.use(cors());

// Mount the modular routes
app.use("/api", apiRoutes);

app.listen(PORT, () =>
  console.log(`Backend server running on http://localhost:${PORT}`)
);
