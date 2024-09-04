import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import esbuild, { type Plugin } from 'esbuild';
import fs from 'fs';
import { log } from './utils.js';
import path from 'path';
import pluginVue from 'esbuild-plugin-vue-next';
import { BuildOptions, BuildOptionsFiles } from './base.js';

export class VueezBuilder {
	serverChildProcess: ChildProcessWithoutNullStreams | null = null;

	constructor(private options: BuildOptions) {}

	async build() {
		if (this.options.devMode) {
			log('Entering watch mode...');
		}

		if (this.options.clientOptions !== undefined) {
			const ctx = await this.prepareClient(this.options.clientOptions);
			if (this.options.devMode) await ctx.watch();
			else {
				log(`Building client ${this.options.clientOptions.outfile} in ${process.cwd()}...`);
				await ctx.rebuild();
				await ctx.dispose();
			}
		}

		if (this.options.serverOptions !== undefined) {
			const ctx = await this.prepareServer(this.options.serverOptions);
			if (this.options.devMode) await ctx.watch();
			else {
				log(`Building server ${this.options.serverOptions.outfile} in ${process.cwd()}...`);
				await ctx.rebuild();
				await ctx.dispose();
			}
		}
	}

	private async prepareClient(files: BuildOptionsFiles): Promise<esbuild.BuildContext> {
		const external = Array.isArray(files.external) ? files.external : [];
		const clientDefine: Record<string, string> = this.options.devMode
			? {
					__VUE_PROD_DEVTOOLS__: 'true',
					__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
					__VUE_OPTIONS_API__: 'true'
				}
			: {};

		const ctx = await esbuild.context({
			entryPoints: files.entryPoints,
			bundle: true,
			minify: !this.options.devMode, // Minify when building for production
			outfile: files.outfile,
			format: 'esm',
			logLevel: 'info',
			external: [...external],
			tsconfig: files.tsconfig ? files.tsconfig : 'tsconfig.json',
			define: clientDefine,
			plugins: [
				(pluginVue as unknown as () => Plugin)(),
				{
					name: 'rebuild-log',
					setup({ onStart, onEnd }) {
						let d: number;
						onStart(() => {
							d = Date.now().valueOf();
						});
						onEnd((result) => {
							if (result.errors.length === 0) {
								log(`Client bundle size ${outFileStats(files.outfile)}, built in ${new Date().valueOf() - d}ms.`);
							}
						});
					}
				}
			]
		});

		return ctx;
	}

	private async prepareServer(files: BuildOptionsFiles): Promise<esbuild.BuildContext> {
		//const builder = this;

		const external = Array.isArray(files.external) ? files.external : [];

		const ctx = await esbuild.context({
			entryPoints: files.entryPoints,
			bundle: true,
			minify: true,
			platform: 'node',
			format: 'esm',
			outfile: files.outfile,
			logLevel: 'info',
			external: ['@vue/compiler-sfc', 'esbuild-plugin-vue-next', 'esbuild', ...external],
			plugins: [
				(pluginVue as unknown as () => Plugin)(),
				{
					name: 'rebuild-log',
					setup: ({ onStart, onEnd }) => {
						let d: number;
						onStart(() => {
							d = Date.now().valueOf();
						});
						onEnd((result) => {
							if (result.errors.length === 0) {
								log(`Server bundle size ${outFileStats(files.outfile)}, built in ${new Date().valueOf() - d}ms.`);
								if (this.options.devMode) {
									if (this.serverChildProcess) {
										log('Killing dev server...');
										this.serverChildProcess.on('close', () => {
											setImmediate(() => {
												log('Starting dev server...', path.resolve(files.outfile));
												this.serverChildProcess = spawn('node', [files.outfile]);
												this.serverChildProcess.stdout.pipe(process.stdout);
											});
										});
										this.serverChildProcess.kill();
									} else {
										setImmediate(() => {
											log('Starting dev server...', path.resolve(files.outfile));
											this.serverChildProcess = spawn('node', [files.outfile]);
											this.serverChildProcess.stdout.pipe(process.stdout);
										});
									}
								}
							}
						});
					}
				}
			]
		});

		return ctx;
	}
}

function outFileStats(filePath: string) {
	const stats = fs.statSync(path.resolve(filePath));
	return numberToBytes(stats.size);
}

function numberToBytes(num: number) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (num > 1024) {
		num /= 1024;
		i++;
	}
	return `${num.toFixed(2)} ${units[i]}`;
}
