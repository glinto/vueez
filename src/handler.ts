import { IncomingMessage, ServerResponse } from "http";

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