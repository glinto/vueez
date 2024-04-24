import { Server, createServer } from "http";
import { log } from "./utils";

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

	private server: Server;

	constructor(private readonly root: string, options: Partial<VueezOptions> = {}) {
		this.options = { ...this.options, ...options };

		this.server = createServer((req, res) => {
			const url = new URL(req.url || '/', `http://${req.headers.host}`);
			res.statusCode = 200;
			res.end('ok');
			log('Request', url.pathname + url.search);
			//handlers.some((handler) => handler.handle(url, res, req));
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

