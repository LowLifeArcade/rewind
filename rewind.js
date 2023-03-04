/** @typedef { import('./rewind').KeywallRequest } KeywallRequest */
/** @typedef { import('./rewind').KeywallResponse } KeywallResponse */
/** @typedef { ((req: KeywallRequest, res: KeywallResponse, next: () => void) => void)[] } KeywallCbs */

import http from 'http';
import fs, { createWriteStream } from "fs";


/**
    ## Keywall Rewind
    A lightweight express clone without the bells and whistles

    @param {{
        base: string, 
        loggingEnabled: boolean,
        logsPath: string,
        logTTL: string | number,
    }} opts 
 */
function rewind(opts = { }) {
    const { 
        base = '/', 
        loggingEnabled = true,
        logsPath = null,
        logTTL = null,
    } = opts;
    
    const { server } = setUp();

    function setUp() {
        loggingEnabled && console.clear();
        const server = http.createServer();
        return { server };
    }
    
    return {
        config: {
            cors: {
                origins: [],
                allowHeaders: [],
                allowMethods: '',
            },
            logs: {
                loggingEnabled,
                logTTL,
                logsPath: logsPath || './logs',
            },
        },
        currentCbChain: [],
        routes: [],
        nextCbIndex: 0,
        customErrorCb: null,
        get,
        post,
        put,
        patch,
        del,
        addRoute,
        server,
        base,
        log,
        __private: {
            /** @type { KeywallRequest } */
            req: null,
            /** @type { KeywallResponse } */
            res: null,
        },
        
        setCustomError(cb) {
            this.customErrorCb = cb;
        },
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
            try {
                this.__private.req = request;
                this.__private.res = response;
                this.configureMessages()
                this.onRequest();
            } catch (error) {
                this.log('error', 
                    'Application Error: ' + error.message,
                    'Error Stack Trace: ', ...error.stack.split('\n    '),
                )
            }
        },
        listen(port, listenCb) {
            this.server.listen(port);
            this.server.on('request', this.setupRequest.bind(this));
            this.config.logs.logTTL && clearLogsCron(logTTL);
            listenCb(this.server);
        },
        configureMessages() {
            const corsOrigins = 
                this.config.cors.origins.length ? 
                this.config.cors.origins : 
                null;
            const corsAllowHeaders = 
                this.config.cors.allowHeaders.length ? 
                this.config.cors.origins : 
                null;
            const corsAllowMethods = this.config.cors.allowMethods;
            let [ reqUrl, query ] = this.__private.req.url.split('?');
            this.__private.req.reqUrl = clean(reqUrl);
            this.__private.req.query = query;
            this.__private.res.setHeaders = function(obj) {
                const _this = this;
                for (const k in obj) {
                    if (Object.hasOwnProperty.call(obj, k)) {
                        const headerValue = obj[k];
                        _this.setHeader(k, headerValue);
                    }
                }
            }
            this.__private.res.setHeaders({
                'Access-Control-Allow-Origin': corsOrigins || ['*'],
                'Access-Control-Allow-Methods': corsAllowMethods || 'GET,PUT,POST,DELETE',
                'Access-Control-Allow-Headers': corsAllowHeaders || 'Content-Type',
            });
            this.__private.res.send = function (msg) {
                if (typeof msg === 'string') {
                    return this.end(msg);
                }
    
                if (typeof msg === 'object' && !Array.isArray(msg)) {
                    this.write(JSON.stringify({
                        ...msg
                    }))
                    return this.end();
                }

                this.write(msg.toString());
                return this.end();
            }
        },
        next() {
            if (this.nextCbIndex === this.currentCbChain.length - 1) {
                return this.__private.res.end();
            }
    
            this.nextCbIndex++;
            return this.currentCbChain[this.nextCbIndex](
                this.__private.req, 
                this.__private.res, 
                this.next.bind(this)
            );
        },
        handleErrorByType(err) {
            if (typeof err === 'string') {
                return this.__private.res.end(err);
            }
    
            if (typeof err === 'object' && !Array.isArray(err)) {
                return this.__private.res.end(JSON.stringify({
                    ...err
                }))
            }
        },
        handleError({ error, status = 404 }) {
            this.__private.res.writeHead(status, {
                'Content-Type': 'text/plain',
            });
    
            if (this.customErrorCb) {
                const customErrorMsg = this.customErrorCb(new Error(error));
                return this.handleErrorByType(customErrorMsg);
            }
    
            return this.__private.res.end(JSON.stringify({ error, status }));
        },
        onRequest(){
            let data = '';
            this.__private.req.on('data', chunk => {
                data += chunk.toString();
            });
            this.__private.req.on('end', () => {
                this.log('request', {
                    'request-url': this.__private.req.reqUrl,
                    'request-query': this.__private.req.query,
                    'request-method': this.__private.req.method,
                    'request-headers': this.__private.req.headers,
                    'response-headers': this.__private.res.getHeaders(),
                    'request-body': data,
                });
            });

            for (let i = 0; i < this.routes.length; i++) {
                const [ method, url ] = this.routes[i];
                this.currentCbChain = this.routes[i][2];

                if (
                    method === this.__private.req.method && 
                    url === this.__private.req.reqUrl
                ) {
                    return this.currentCbChain[0](
                        this.__private.req, 
                        this.__private.res, 
                        this.next.bind(this)
                    );
                };
            }
            return this.handleError({
                error: 'No results found',
                status: 404,
            });
        },
        cors(corsOrigins) {
            // TODO: Add more configuration options
            this.config.cors.origins = corsOrigins;
        },
        callExecutionStack(req, res) {
            // TODO:
            // stack [...modules, ...requestHandlers, ...errorHandlers]
            for (let i = 0; i < this.executionStack.length; i++) {
                const cb = this.executionStack[i];
                cb(req, res);
            }
        },
        clearLogsCron(logTTL) {
            // TODO: Write cron to clear logs
        },
    }
}

/** @type { (path: string, ...cbs: KeywallCbs) => void } */
function get(path, ...cbs) {
    return this.addRoute('GET', path, cbs);
}

/** @type { (path: string, ...cbs: KeywallCbs) => void } */
function post(path, ...cbs) {
    return this.addRoute('POST', path, cbs);
}

/** @type { (path: string, ...cbs: KeywallCbs) => void } */
function put(path, ...cbs) {
    return this.addRoute('PUT', path, cbs);
}

/** @type { (path: string, ...cbs: KeywallCbs) => void } */
function patch(path, ...cbs) {
    return this.addRoute('PATCH', path, cbs);
}

/** @type { (path: string, ...cbs: KeywallCbs) => void } */
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
    const sc = ['.', '~'];

    if (url?.length <= 1) {
        return '';
    }
    if (url.endsWith('/') && !sc.includes(url.split('').at(-2))) {
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
export function log(logType, ...val) {
    if (!this.config.logs.loggingEnabled) {
        return;
    }

    let logTime = new Date().toISOString().split('T')[1];
    let logDate = new Date().toISOString().split('T')[0];
    let logMessage = `Log: [${ logTime }] - [${ logType }]: ${ JSON.stringify(val, null, 2) },\n`;
    let logRoot = this.config.logs.logsPath;
    let logPath = `${ logRoot }/${ logType }`;
    let logFileName = `${ logPath }/rewind-log-${ logDate }.log`;
    
    if (!fs.existsSync(logPath)){
        // FIXME: so recursively builds path as it will error if multiple levels
        if(!fs.existsSync(logRoot)) {
            fs.mkdirSync(logRoot);
        }

        fs.mkdirSync(logPath + '/');
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
    
    try {
        fs.readFileSync(logFileName, "utf8")
        fs.appendFile(logFileName,
        logMessage, 
        (err) => {
            if (err) {
                console.error('error writing logs',{err});
            }
          });
    } catch (error) {
        let writeStream = createWriteStream(logFileName); 
        writeStream.write(`${ logType.charAt(0).toUpperCase() + logType.slice(1) } logs for [${ logDate }] starting at [${ logTime }]\n`);
        writeStream.write(`\n`);
        writeStream.write(logMessage);
        writeStream.end();
    }
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

export default rewind;
