import path from "node:path";
import dotenv from "dotenv";

let loaded = false;

/**
 * Loads env vars for scripts.
 *
 * Supports:
 * - `startomatic/.env.local` (preferred)
 * - `startomatic/.env` (fallback)
 *
 * Never logs the values.
 */
export function loadScriptEnv() {
	if (loaded) return;
	loaded = true;

	const cwd = process.cwd();
	const candidates = [
		path.join(cwd, ".env.local"),
		path.join(cwd, ".env"),
	];

	for (const envPath of candidates) {
		const result = dotenv.config({ path: envPath });
		if (!result.error) break;
	}
}
