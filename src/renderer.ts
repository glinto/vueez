import { log } from "console";
import { VueezRouteHandler } from "./handler";
import { ServerResponse, IncomingMessage } from "http";
import { App, createSSRApp } from "vue";
import { RouteRecordRaw, createMemoryHistory, createRouter } from "vue-router";
import { renderToString } from "vue/server-renderer";

const AppConfigSymbol = Symbol('app-config');

export type AppMode = 'development' | 'production';

export interface AppConfig {
	version?: string;
	mode?: AppMode;
	[AppConfigSymbol]: true;
}

export interface AppMeta extends AppConfig {
	name: string;
	title: string;
	description: string;
	url: string;
}

export function isAppConfig(value: any): value is AppConfig {
	return value[AppConfigSymbol] === true;
}

export function isAppMeta(value: any): value is AppMeta {
	return typeof value.name === 'string'
		&& typeof value.title === 'string'
		&& typeof value.description === 'string'
		&& typeof value.url === 'string'
		&& isAppConfig(value);
}

/* 
The renderer will take a Vue app, a RouteRecordRaw[] array, and optional config params which extend either the 
AppMeta or AppConfig interfaces 

const meta: AppMeta = {...};
const app = createApp({...});
render(app, routes, meta);

*/

export class VueezRendererHandler implements VueezRouteHandler {
	constructor(private readonly app: App,
		private readonly routes: RouteRecordRaw[],
		private readonly config: AppConfig | AppMeta,
		private readonly template: string = '${html}') {
	}

	handle(url: URL, res: ServerResponse<IncomingMessage>, req?: IncomingMessage | undefined): Promise<void> {

		const router = createRouter({
			history: createMemoryHistory(),
			routes: this.routes
		});
		this.app.use(router);
		const queryObject = Object.fromEntries(url.searchParams);

		if (router.resolve({ path: url.pathname, query: queryObject }).matched.length === 0) {
			return Promise.reject('No matched routes');
		}

		return router.push({ path: url.pathname, query: queryObject })
			.then((result) => {
				if (result) return Promise.reject(result);
				return router.isReady();
			})
			.then(() => {
				if (router.currentRoute.value.matched.length === 0) {
					return Promise.reject('No matched routes');
				}
			})
			.then(() => renderToString(this.app))
			.then((html) => {
				html = this.template
					.replace('${html}', html)
					.replace('${version}', this.config.version || '')
					.replace('${mode}', this.config.mode || 'production');

				if (isAppMeta(this.config)) {
					html = html
						.replace('${name}', this.config.name)
						.replace('${title}', this.config.title)
						.replace('${description}', this.config.description)
						.replace('${url}', this.config.url);
				}
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html');
				res.end(html);
			});
	}
}


