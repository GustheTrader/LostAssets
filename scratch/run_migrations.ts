import { runMigrations, seedRegulations } from "../db/migrate";

try {
  console.log("Running migrations...");
  runMigrations();
  console.log("Seeding regulations...");
  seedRegulations();
  console.log("Database migrations and regulations seeded successfully!");
} catch (error: any) {
  console.error("Migration/Seeding failed:", error.message);
  process.exit(1);
}
