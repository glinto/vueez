import { BuildOptions, ServeOptions } from './base.js';

export async function build(options: BuildOptions) {
	const builderLib = await import('./build.js');
	const builder = new builderLib.VueezBuilder(options);
	return builder.build();
}

export async function serve(options: ServeOptions) {
	const serverLib = await import('./serve.js');
	return serverLib.VueezServer.serve(options);
}

export { type ServeOptions, type BuildOptions, type BuildOptionsFiles, type ServerRenderState } from './base.js';

export { type RouteHandler } from './handle.js';
