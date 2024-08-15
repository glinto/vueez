import type { RouteRecordRaw } from 'vue-router';
import { App } from 'vue';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { log } from './utils.js';
import { RouteHandler, StaticHandler } from './handle.js';
import { RendererHandler, ServerRenderState } from './render.js';
import { resolve } from 'path';

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

export class VueezServer {
	public handlers: RouteHandler[] = [];

	private server: Server;

	private constructor(private options: ServeOptions) {
		this.server = createServer((req, res) => {
			const url = new URL(req.url || '/', `http://${req.headers.host}`);
			log('Request', url.pathname + url.search);
			this.handleInQueue(url, res, req).catch(() => {
				res.statusCode = 404;
				res.end();
			});
		});

		process.on('SIGTERM', () => {
			log('SIGTERM received');
			if (this.server.listening) {
				this.server.close(() => {
					log('Server stopped');
				});
			}
		});

		if (this.options.staticDir !== undefined) {
			this.handlers.push(new StaticHandler(resolve(this.options.staticDir)));
		}
		this.handlers.push(new StaticHandler(resolve(this.options.clientOutDir), '/js'));

		this.handlers.push(
			new RendererHandler(
				this.options.appCreator,
				this.options.routes,
				this.options.templateFile,
				this.options.serverState,
				this.options.devMode !== true
			)
		);
	}

	static serve(options: ServeOptions): Promise<VueezServer> {
		try {
			const s = new VueezServer(options);
			return s.listen().then(() => s);
		} catch (e: unknown) {
			return Promise.reject(e);
		}
	}

	private handleInQueue(
		url: URL,
		res: ServerResponse<IncomingMessage>,
		req?: IncomingMessage,
		index = 0
	): Promise<void> {
		const handler = this.handlers[index];
		if (handler === undefined) {
			return Promise.reject();
		}
		return handler.handle(url, res, req).catch(() => {
			return this.handleInQueue(url, res, req, index + 1);
		});
	}

	listen(port: number = this.options.port): Promise<void> {
		return new Promise((resolve, reject) => {
			const listenErrorHandler = (err: Error) => {
				log('Server cannot listen on port', port, err);
				this.server.off('error', listenErrorHandler);
				reject(err);
			};

			this.server.once('error', listenErrorHandler);

			this.server.listen(port, () => {
				log(`Server running at http://localhost:${port}`);
				this.server.off('error', listenErrorHandler);
				resolve();
			});
		});
	}

	close(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.server.close((err) => {
				if (err) {
					reject(err);
				} else {
					log('Server stopped');
					resolve();
				}
			});
		});
	}
}
