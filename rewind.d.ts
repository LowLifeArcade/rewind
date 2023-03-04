import { IncomingMessage, ServerResponse } from 'http';

export interface KeywallRequest extends IncomingMessage {
    query: string,
    reqUrl: string,
}

export interface KeywallResponse extends ServerResponse {
    setHeaders(headers: {[header:string]: string}): this;
    /**
     * #### Calls res.write(msg) and res.end()
     * Use this to send either a string or an object as a response
     */
    send: (msg: string | Object) => void
}

export type RequestHandler = (
    path: URL | string,
    cbs: ((req: KeywallRequest, res: KeywallResponse, next: () => void) => void)[],
) => void;
