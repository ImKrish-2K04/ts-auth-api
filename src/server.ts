import http from "http";
import app from "./app";
import connectDB from "./configs/db";
import { env } from "./configs/config";

const PORT = env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Error while starting the server", err);
  process.exit(1);
});
