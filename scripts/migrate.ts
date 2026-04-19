import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const environment = process.argv[2] || "local";
const dbName = process.env.DATABASE_NAME || "moemail-db";

interface D1Database {
  binding: string;
  database_name: string;
  database_id?: string;
}

interface WranglerConfig {
  d1_databases?: D1Database[];
}

// Load wrangler configuration
function loadWranglerConfig(): WranglerConfig {
  const configPath = path.resolve("wrangler.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`Wrangler configuration not found at ${configPath}`);
  }

  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent);
}

// Get database binding name
function getDatabaseBinding(): string {
  const config = loadWranglerConfig();
  
  if (!config.d1_databases || config.d1_databases.length === 0) {
    throw new Error("No D1 databases configured in wrangler.json");
  }

  return config.d1_databases[0].binding || dbName;
}

// Execute migrations
function executeMigrations(): void {
  try {
    const binding = getDatabaseBinding();
    console.log(`📝 Running ${environment} database migrations with binding: ${binding}...`);

    if (environment === "remote") {
      // For remote migrations, use wrangler to apply migrations
      execSync("wrangler migrations apply --remote", { 
        stdio: "inherit",
        cwd: path.resolve(),
        env: { ...process.env }
      });
    } else if (environment === "local") {
      // For local migrations, use wrangler dev with local D1
      execSync("wrangler migrations apply --local", { 
        stdio: "inherit",
        cwd: path.resolve(),
        env: { ...process.env }
      });
    } else {
      throw new Error(`Unknown environment: ${environment}. Use "local" or "remote".`);
    }

    console.log("✅ Database migrations completed successfully");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    throw error;
  }
}

// Main execution
try {
  executeMigrations();
} catch (error) {
  process.exit(1);
}