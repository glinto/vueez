export function log(...args: unknown[]) {
	console.log(`\x1b[36m[${new Date().toISOString()}]\x1b[0m`, ...args);
}
