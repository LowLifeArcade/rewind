import http from 'http';
import fs, { createWriteStream } from "fs";

/** @typedef { import('./rewind').KeywallRequest } KeywallRequest */
/** @typedef { import('./rewind').KeywallResponse } KeywallResponse */
/** @typedef { ((req: KeywallRequest, res: KeywallResponse, next: () => void) => void)[] } KeywallCbs */

/**
 * @param { string } path
 * @param { KeywallCbs } cbs
 */
function get(path, ...cbs) {
    return this.addRoute('GET', path, cbs);
}

/**
 * @param { string } path
 * @param { KeywallCbs } cbs
 */
function post(path, ...cbs) {
    return this.addRoute('POST', path, cbs);
}

/**
 * @param { string } path
 * @param { KeywallCbs } cbs
 */
function put(path, ...cbs) {
    return this.addRoute('PUT', path, cbs);
}

/**
 * @param { string } path
 * @param { KeywallCbs } cbs
 */
function patch(path, ...cbs) {
    return this.addRoute('PATCH', path, cbs);
}

/**
 * @param { string } path
 * @param { KeywallCbs } cbs
 */
function del(path, ...cbs) {
    return this.addRoute('DELETE', path, cbs);
}

function addRoute(method, path, cbs) {
    const endPoint = clean(this.base) + clean(path) || '/';
    this.routes.push([
        method, 
        endPoint, 
        cbs,
    ]);
}

function clean(url) {
    if (url?.length <= 1) {
        return '';
    }
    if (url.endsWith('/')) {
        url = url.slice(-1)
    }
    if (!url.startsWith('/')) {
        url = '/' + url
    }

    return url;
}

/**
 * @param {'info' | 'error' | 'request' | 'success' } type 
 * @param  { ...any } val 
 */
export function log(type, ...val) {
    let opts = type;
    let logType = type;
    let logMessage = `Log: ${ new Date().toISOString().split('T')[1] } - ${ logType }: ${ JSON.stringify(val) } \n`
    
    if (typeof logType !== 'string') {
        logType = opts.type;
    }
    
    switch (logType) {
        case 'info':
            console.info(`${logType}:`, ...val);
            break;
        case 'request':
            console.info(`${logType}:`, ...val); 
            break;
        case 'error':
            console.error(`${logType}:`, ...val);
            break;
        case 'success':
            console.log(`${logType}:`, ...val);
            break;
        default:
            console.log(`${logType}:`, ...val);
            break;
    }
    
    if (!this.logsEnabled) {
        return;
    }

    if (!fs.existsSync('./logs')){
        fs.mkdirSync('./logs');
    }
    
    try {
        fs.readFileSync(`./logs/rewind-log-${new Date().toISOString().split('T')[0]}.txt`, "utf8")
        fs.appendFile(`./logs/rewind-log-${new Date().toISOString().split('T')[0]}.txt`, 
        logMessage, 
        (err) => {
            if (err) {
                console.error('error writing logs',{err});
            }
            else {
                // console.log("\nLogs added:",
                // fs.readFileSync(`./logs/rewind-log-${new Date().toISOString().split('T')[0]}.txt`, "utf8"));
            }
          });
    } catch (error) {
        var writeStream = createWriteStream(`./logs/rewind-log-${new Date().toISOString().split('T')[0]}.txt`); 
        writeStream.write(`Logs for ${new Date().toISOString().split('T')[0]} \n`);
        writeStream.write(`\n`);
        writeStream.write(logMessage);
        writeStream.end();
    }
    // TODO: set a variable the use can set for clearing logs and how long they want to keep them
    // e.g. delete logs older than 90 days if user sets 90 day span
}

export function useRouter() {
    return {
        type: 'routes',
        base: '',
        setBase(base) {
            this.base = clean(base);
        },
        addRoute,
        get,
        post,
        put,
        patch,
        del,
        routes: [],
    }
}

/**
 * ## Keywall Rewind
 * A lightweight express clone without the bells and whistles
 * 
 * @param {{base: string, logsEnabled: boolean}} opts 
 */
function rewind(opts = { }) {
    let { base = '/', enableLogs = false } = opts;
    const { server } = setUp();

    function setUp() {
        console.clear();
        const server = http.createServer();
        return { server };
    }
    
    return {
        /** @type { KeywallRequest } */
        req: null,
        /** @type { KeywallResponse } */
        res: null,
        currentCbChain: [],
        routes: [],
        nextCbIndex: 0,
        customErrorCb: null,
        setCustomError(cb) {
            this.customErrorCb = cb;
        },
        config: {
            corsOrigins: [],
            corsAllowHeaders: [],
            corsAllowMethods: '',
        },
        server,
        base,
        log,
        logsEnabled,
        use(_module = null) {
            // log('use: ', _module.routes);
            if (_module.type === 'routes') {
                const routes = _module.routes;

                for (let i = 0; i < routes.length; i++) {
                    const [ method, path, cbs ] = routes[i];
                    // e.g. this.get(path, ...cbs)
                    this[method.toLowerCase()](path, ...cbs)
                } 
            }
        },
        setupRequest(request, response) {
            this.req = request;
            this.res = response;
            this.configureMessages()
            this.onRequest();
        },
        listen(port, listenCb) {
            this.server.listen(port);
            this.server.on('request', this.setupRequest.bind(this))
            listenCb(this.server);
        },
        configureMessages() {
            const corsOrigins = this.config.corsOrigins.length ? 
                this.config.corsOrigins : 
                null;
            const corsAllowHeaders = this.config.corsAllowHeaders.length ? 
                this.config.corsOrigins : 
                null;
            const corsAllowMethods = this.config.corsAllowMethods;
            let [ reqUrl, query ] = this.req.url.split('?');
            this.req.reqUrl = clean(reqUrl);
            this.req.query = query;
            this.res.setHeaders = function(obj) {
                const _this = this;
                for (const k in obj) {
                    if (Object.hasOwnProperty.call(obj, k)) {
                        const headerValue = obj[k];
                        _this.setHeader(k, headerValue);
                    }
                }
            }
            this.res.setHeaders({
                'Access-Control-Allow-Origin': corsOrigins || ['*'],
                'Access-Control-Allow-Methods': corsAllowMethods || 'GET,PUT,POST,DELETE',
                'Access-Control-Allow-Headers': corsAllowHeaders || 'Content-Type',
            });
            this.res.send = function (msg) {
                if (typeof msg === 'string') {
                    return this.end(msg);
                }
    
                if (typeof msg === 'object' && !Array.isArray(msg)) {
                    this.write(JSON.stringify({
                        ...msg
                    }))
                    return this.end()
                }

                this.write(msg);
                return this.end();
            }
        },
        get,
        post,
        put,
        patch,
        del,
        addRoute,
        callExecutionStack(req, res) {
            // TODO:
            // stack [...modules, ...requestHandlers, ...errorHandlers]
            for (let i = 0; i < this.executionStack.length; i++) {
                const cb = this.executionStack[i];
                cb(req, res);
            }
        },
        next() {
            if (this.nextCbIndex === this.currentCbChain.length - 1) {
                return this.res.end();
            }
    
            this.nextCbIndex++;
            return this.currentCbChain[this.nextCbIndex](
                this.req, 
                this.res, 
                this.next.bind(this)
            );
        },
        handleErrorByType(err) {
            if (typeof err === 'string') {
                return this.res.end(err);
            }
    
            if (typeof err === 'object' && !Array.isArray(err)) {
                return this.res.end(JSON.stringify({
                    ...err
                }))
            }
        },
        handleError({ error, status = 404 }) {
            this.res.writeHead(status, {
                'Content-Type': 'text/plain',
            });
    
            if (this.customErrorCb) {
                const customErrorMsg = this.customErrorCb(new Error(error));
                return this.handleErrorByType(customErrorMsg);
            }
    
            return this.res.end(JSON.stringify({ error, status }));
        },
        cors(corsOrigins) {
            // TODO: Add more configuration options
            this.config.corsOrigins = corsOrigins;
        },
        onRequest(){
            this.log('request', {
                'request-url': this.req.reqUrl,
                'request-query': this.req.query,
                'request-method': this.req.method,
                'request-headers': this.req.headers,
                'response-headers': this.res.getHeaders(),
            })

            for (let i = 0; i < this.routes.length; i++) {
                const [ method, url ] = this.routes[i];
                this.currentCbChain = this.routes[i][2];
                // this.log("request", "all routes: ", '\n route: ',method, url, '\n req: ',this.req.method, this.req.reqUrl)
                if (
                    method === this.req.method && 
                    url === this.req.reqUrl
                ) {
                    return this.currentCbChain[0](
                        this.req, 
                        this.res, 
                        this.next.bind(this)
                    );
                };
            }
            return this.handleError({
                error: 'No results found',
                status: 404,
            });
        },
    }
}

export default rewind;
