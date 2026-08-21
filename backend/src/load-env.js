import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
const result = dotenv.config({ path: envPath });
if (result.error && result.error.code !== "ENOENT") {
  console.warn("Could not read the local backend .env file:", result.error.message);
} else if (!result.error && process.env.NODE_ENV !== "production") {
  console.log("Successfully loaded .env file from:", envPath);
}
