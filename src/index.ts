import { IncomingMessage, Server, ServerResponse, createServer } from "http";
import { log } from "./utils";
import { StaticURLHandler, VuezzRouteHandler } from "./handler";

export type VuezzMode = 'development' | 'production';

export interface VueezOptions {
	port: number;
	mode: VuezzMode;
	defaultDocument: string;
}

export class Vueez {
	private options: VueezOptions = {
		port: 3000,
		mode: 'development',
		defaultDocument: 'index.html'
	};

	public handlers: VuezzRouteHandler[] = [];

	private server: Server;

	constructor(private readonly root: string, options: Partial<VueezOptions> = {}) {
		this.options = { ...this.options, ...options };

		this.handlers.push(new StaticURLHandler(this.root));

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
	}

	handleInQueue(url: URL, res: ServerResponse<IncomingMessage>, req?: IncomingMessage, index = 0): Promise<void> {
		let handler = this.handlers[index];
		if (handler === undefined) {
			return Promise.reject();
		}
		return handler.handle(url, res, req).catch(() => {
			return this.handleInQueue(url, res, req, index + 1);
		});
	}

	listen(port: number = this.options.port) {
		this.server.listen(this.options.port, () => {
			log(`Server running at http://localhost:${this.options.port}`);
		});
	}

	close() {
		this.server.close(() => {
			log('Server stopped');
		});
	}
}

