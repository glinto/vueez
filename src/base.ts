import type { RouteRecordRaw } from 'vue-router';
import { App } from 'vue';

export interface BuildOptionsFiles {
	/**
	 * Location of all source file paths
	 */
	entryPoints: string[];
	/**
	 * Destination file path for the bundle
	 */
	outfile: string;
	/**
	 * An optional tsconfig file locations. If not provided, 'tsconfig.json' will be assumed
	 */
	tsconfig?: string;

	/**
	 * External dependencies that should not be bundled. See: https://esbuild.github.io/api/#external
	 */
	external?: string[];
}

export interface BuildOptions {
	/**
	 * Whether to build in development mode. In dev mode:
	 * - The client and server bundles are not minified
	 * - The client bundle will include Vue Devtools for debugging
	 * - The client and server bundles will be watched for changes
	 * - A dev server will be started for the server bundle and restarted on changes
	 */
	devMode?: boolean;
	/**
	 * Source and destination file locations for the client build
	 */
	clientOptions?: BuildOptionsFiles;
	/**
	 *Source and destination file locations for the server build
	 */
	serverOptions?: BuildOptionsFiles;
}

export interface ServeOptions {
	/**
	 * Whether to serve in development mode. In dev mode the server will not do SSR rendering
	 */
	devMode?: boolean;
	/**
	 * A function which will create the Vue application that needs to be rendered with SSR. SSR needs a new
	 * App instance everytime it renders HTML.
	 */
	appCreator: () => App;
	/**
	 * Route records, on which the App will be server side rendered and served.
	 */
	routes: RouteRecordRaw[];
	/**
	 * The root directory of static files
	 */
	staticDir?: string;
	/**
	 * The index template file into which the rendered app will be inserted by replacing the `${html}`
	 * placeholder
	 */
	templateFile: string;
	/**
	 * The location of the client bundle files, which will be served under /js/*
	 */
	clientOutDir: string;
	/**
	 * The TCP port on which the app server will listen
	 */
	port: number;
	/**
	 * A ServerRenderState object wchich will be provided to the servers ide instantiated app. After rendering
	 * this state will be compiled into the resulting HTML file where the client can parse it
	 */
	serverState?: ServerRenderState;
}

export type ServerRenderState = Record<string, string | number | boolean>;
