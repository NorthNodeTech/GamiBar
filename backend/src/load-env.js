import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Failed to load .env file from:", envPath, result.error);
} else {
  console.log("Successfully loaded .env file from:", envPath);
}
