require("dotenv").config();
const app = require("./app");
const { connectMongo } = require("./lib/mongo");

const PORT = process.env.PORT || 4000;

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
