import { log } from './utils.js';
import { RouteHandler } from './handle.js';
import { ServerResponse, IncomingMessage } from 'http';
import { App } from 'vue';
import { RouteRecordRaw, createMemoryHistory, createRouter, Router } from 'vue-router';
import { renderToString } from 'vue/server-renderer';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ServerRenderState } from './base.js';

export class RendererHandler implements RouteHandler {
	constructor(
		private readonly appCreatorFn: (state?: ServerRenderState) => App,
		private readonly routes: RouteRecordRaw[],
		private readonly templateFile: string,
		private readonly state?: ServerRenderState,
		private readonly renderSSR?: boolean
	) {}

	handle(url: URL, res: ServerResponse<IncomingMessage>): Promise<void> {
		let template = '';

		try {
			template = readFileSync(resolve(this.templateFile), 'utf-8');
		} catch (e) {
			log('Error reading template file', e);
			return Promise.reject(e);
		}

		const router = createRouter({
			history: createMemoryHistory(),
			routes: this.routes
		});

		if (this.renderSSR !== true) {
			return this.pushAndResolveRoute(router, url).then(() => {
				template = template.replaceAll(/[ \t\n]*\$\{html\}[ \t\n]*/g, '');
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html');
				res.end(this.mergeStateInto(template));
			});
		}

		const app = this.appCreatorFn(this.state);
		app.use(router);

		//log('Rendering', url.pathname);

		return this.pushAndResolveRoute(router, url)
			.then(() => renderToString(app))
			.then((html) => {
				template = template.replaceAll(/[ \t\n]*\$\{html\}[ \t\n]*/g, html);
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html');
				res.end(this.mergeStateInto(template));
			})
			.catch((e) => {
				log('Render error', e);
				res.statusCode = 500;
				res.end();
				throw e;
			});
	}

	private pushAndResolveRoute(router: Router, url: URL): Promise<void> {
		const queryObject = Object.fromEntries(url.searchParams);

		if (router.resolve({ path: url.pathname, query: queryObject }).matched.length === 0) {
			//log('Cannot resolve route', url.pathname, queryObject);
			return Promise.reject('Cannot resolve route');
		}
		return router
			.push(url.pathname + url.search + url.hash)
			.then(() => {
				return router.isReady();
			})
			.then(() => {
				if (router.currentRoute.value.matched.length === 0) {
					log('No matched routes', url.pathname, queryObject);
					return Promise.reject('No matched routes');
				}
				return;
			});
	}

	private mergeStateInto(document: string): string {
		let result = document;

		if (this.state !== undefined) {
			Object.entries(this.state).forEach((entry) => {
				result = result.replaceAll(`\${${entry[0]}}`, this.htmlSafe(entry[1].toString()));
			});
		}
		return result;
	}

	private htmlSafe(str: string): string {
		return str.replace(/[<>&'"]/gim, (i) => '&#' + i.charCodeAt(0) + ';');
	}
}
