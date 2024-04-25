import { readFile, stat } from "fs/promises";
import { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { log } from "./utils";

export interface VuezzRouteHandler {
	handle(url: URL, res: ServerResponse<IncomingMessage>, req?: IncomingMessage): Promise<void>;
}

export class NotFoundHandler implements VuezzRouteHandler {
	handle(_url: URL, res: ServerResponse<IncomingMessage>): Promise<void> {
		res.statusCode = 404;
		res.end();
		return Promise.resolve();
	}
}

export class StaticURLHandler implements VuezzRouteHandler {

	readonly mimeMappings: { [key: string]: string } = {
		'.svg': 'image/svg+xml',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.html': 'text/html',
		'.json': 'application/json',
		'.txt': 'text/plain'
	}

	constructor(private readonly rootPath: string, private readonly mapTo?: string) { }

	handle(url: URL, res: ServerResponse<IncomingMessage>): Promise<void> {
		if (url.pathname === '/') return Promise.reject();

		// remove +semver from the pathname, e.g. stylle+1.2.3.css -> style.css
		let filePath = url.pathname.replace(/\+\d+(\.\d+)*/, '');


		if (this.mapTo !== undefined) {
			// Check if filePath begins with mapTo
			if (filePath.startsWith(this.mapTo)) {
				//remove mapTo from the filePath start
				filePath = filePath.slice(this.mapTo.length);
			}
			else {
				return Promise.reject();
			}
		}

		const staticPath = path.join(this.rootPath, filePath);
		if (!staticPath.startsWith(this.rootPath)) {
			log('Rejecting path outside root', staticPath, this.rootPath);
			return Promise.reject();
		}

		return stat(staticPath)
			.then(stats => {
				if (stats.isDirectory()) {
					log('Rejecting static directory request', url.pathname);
					return Promise.reject();
				}
				return readFile(staticPath);
			})
			.then(data => {
				Object.keys(this.mimeMappings).some(key => {
					if (staticPath.match(new RegExp(`.*\.${key}$`))) {
						res.setHeader('Content-Type', this.mimeMappings[key] as string);
						return true;
					}
					return false;
				});
				res.statusCode = 200;
				res.end(data);
			});
	}
}