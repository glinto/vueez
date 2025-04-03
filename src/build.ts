import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import esbuild, { BuildOptions, type Plugin } from 'esbuild';
import fs from 'fs';
import { log } from './utils.js';
import path from 'path';
//import pluginVue from 'esbuild-plugin-vue-next';
import pluginVue3 from 'esbuild-plugin-vue3';
import { MandatoryBuildOptions, VueezBuildOptions } from './base.js';
import { CompilerOptions } from 'vue/compiler-sfc';

export class VueezBuilder {
	serverChildProcess: ChildProcessWithoutNullStreams | null = null;

	constructor(private options: VueezBuildOptions) {}

	async build() {
		if (this.options.devMode) {
			log('Entering watch mode...');
		}

		if (this.options.clientOptions !== undefined) {
			const ctx = await this.prepareClient({
				outfile: 'build/client/client.js',
				...this.options.clientOptions
			});
			if (this.options.devMode) await ctx.watch();
			else {
				log(`Building client ${this.options.clientOptions.outfile} in ${process.cwd()}...`);
				await ctx.rebuild();
				await ctx.dispose();
			}
		}

		if (this.options.serverOptions !== undefined) {
			const ctx = await this.prepareServer({
				outfile: 'build/server/server.js',
				...this.options.serverOptions
			});
			if (this.options.devMode) await ctx.watch();
			else {
				log(`Building server ${this.options.serverOptions.outfile} in ${process.cwd()}...`);
				await ctx.rebuild();
				await ctx.dispose();
			}
		}
	}

	private createVuePlugin(): esbuild.Plugin {
		pluginVue3({ disableOptionsApi: false, enableDevTools: true, enableHydrationMismatchDetails: true });
		return (
			pluginVue3 as unknown as (opts?: {
				compilerOptions: CompilerOptions;
				disableOptionsApi: boolean;
				enableDevTools: boolean;
				enableHydrationMismatchDetails: boolean;
			}) => Plugin
		)({
			compilerOptions: this.options.vueCompilerOptions ?? {},
			disableOptionsApi: !this.options.devMode,
			enableDevTools: this.options.devMode ?? false,
			enableHydrationMismatchDetails: this.options.devMode ?? false
		});
	}

	private async prepareClient(opts: MandatoryBuildOptions): Promise<esbuild.BuildContext> {
		const clientDefine: Record<string, string> = this.options.devMode
			? {
					__VUE_PROD_DEVTOOLS__: 'true',
					__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
					__VUE_OPTIONS_API__: 'true'
				}
			: {};

		const plugins = Array.isArray(opts.plugins) ? opts.plugins : [];

		const defaultOpts: BuildOptions = {
			...opts,
			bundle: true,
			minify: opts.minify ?? !this.options.devMode, // Minify when building for production
			format: opts.format ?? 'esm',
			logLevel: opts.logLevel ?? 'info',
			define: {
				...(opts.define ?? {}),
				...clientDefine
			},
			plugins: [
				this.createVuePlugin(),
				{
					name: 'rebuild-log',
					setup({ onStart, onEnd }) {
						let d: number;
						onStart(() => {
							d = Date.now().valueOf();
						});
						onEnd((result) => {
							if (result.errors.length === 0) {
								log(`Client bundle size ${outFileStats(opts.outfile)}, built in ${new Date().valueOf() - d}ms.`);
							}
						});
					}
				},
				...plugins
			]
		};

		const ctx = await esbuild.context(defaultOpts);

		return ctx;
	}

	private async prepareServer(opts: MandatoryBuildOptions): Promise<esbuild.BuildContext> {
		//const builder = this;

		const external = Array.isArray(opts.external) ? opts.external : [];
		const plugins = Array.isArray(opts.plugins) ? opts.plugins : [];

		const defaultOpts: BuildOptions = {
			...opts,
			bundle: true,
			minify: opts.minify ?? true,
			platform: opts.platform ?? 'node',
			format: opts.format ?? 'esm',
			logLevel: opts.logLevel ?? 'info',
			external: ['@vue/compiler-sfc', 'esbuild-plugin-vue-next', 'esbuild', ...external],
			plugins: [
				this.createVuePlugin(),
				{
					name: 'rebuild-log',
					setup: ({ onStart, onEnd }) => {
						let d: number;
						onStart(() => {
							d = Date.now().valueOf();
						});
						onEnd((result) => {
							if (result.errors.length === 0) {
								log(`Server bundle size ${outFileStats(opts.outfile)}, built in ${new Date().valueOf() - d}ms.`);
								if (this.options.devMode) {
									if (this.serverChildProcess) {
										log('Killing dev server...');
										this.serverChildProcess.on('close', () => {
											setImmediate(() => {
												log('Starting dev server...', path.resolve(opts.outfile));
												this.serverChildProcess = spawn('node', [opts.outfile]);
												this.serverChildProcess.stdout.pipe(process.stdout);
											});
										});
										this.serverChildProcess.kill();
									} else {
										setImmediate(() => {
											log('Starting dev server...', path.resolve(opts.outfile));
											this.serverChildProcess = spawn('node', [opts.outfile]);
											this.serverChildProcess.stdout.pipe(process.stdout);
										});
									}
								}
							}
						});
					}
				},
				...plugins
			]
		};

		const ctx = await esbuild.context(defaultOpts);

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
