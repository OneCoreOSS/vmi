const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { createProxyMiddleware } = require('http-proxy-middleware')
const { spawn } = require('child_process');

const GetVMIVersion = require('./core/version')
const VMIPath = require('./core/vmipath');

const argv = require('minimist')(process.argv.slice(2), {
	alias: {
		'web-directory': 'WD',
		'certkey': 'CK',
		'certfile': 'CF',
		'no-http': 'NHTTP',
		'log-directory': 'LOGDIR',
		'websockify-directory': 'WSDIR'
	},
	unknown: (arg) => {
		return true;
	}
});

if (!argv.WD || !argv.CK || !argv.CF) {
	console.error(`usage: ./index.js --web-directory=<path> --certkey=<path> --certfile=<path> [--log-directory=<path>] [--websockify-directory=<path>] [--no-http] [httpsPort] [httpPort]`);
	return;
}

const WebDir = path.resolve(argv.WD);
const SSL_CertKey = path.resolve(argv.CK);
const SSL_CertFile = path.resolve(argv.CF);
const NoHTTP = (argv.NHTTP == "on");
const LogDir = argv.LOGDIR ? require('path').resolve(argv.LOGDIR) : '/var/log/vmi';
const WSockifyDir = argv.WSDIR ? require('path').resolve(argv.WSDIR) : '/vmi/websockify';

const HTTPSPort = Number(argv._[0] ?? 443);
const HTTPPort  = Number(argv._[1] ?? 80);

console.log(`
******************************************************************************
** OneCoreVMI v${GetVMIVersion()}
**
** Running @ ${VMIPath}
** Logs    @ ${LogDir}
******************************************************************************
`);

fs.mkdirSync(LogDir, { recursive: true })
fs.mkdirSync(path.join(VMIPath, 'assigned'), { recursive: true })
fs.mkdirSync(path.join(VMIPath, 'vms', 'vnclist'), { recursive: true })

/* Run Websockify (as child) */

const WSockify_Args = [`--cert=${SSL_CertFile}`, `--key=${SSL_CertKey}`, `--token-plugin=TokenFile`, `--token-source=${VMIPath}/vms/vnclist`, `127.0.0.1:6080`];
const WSockify_Logs = fs.openSync(path.resolve(LogDir, 'wsockify.log'), 'a');

const WSockify_Child = spawn('python3', ['-m', 'websockify', ...WSockify_Args], {
	cwd: WSockifyDir,
	stdio: ["ignore", WSockify_Logs, WSockify_Logs],
	detached: false
});

WSockify_Child.on('exit', code => process.exit(code));

['exit', 'SIGINT', 'SIGTERM', 'uncaughtException'].forEach(event => {
	process.on(event, (err) => {
		if (event === 'uncaughtException') console.error(err);
		WSockify_Child.kill('SIGTERM');
		setTimeout(() => WSockify_Child.kill('SIGKILL'), 5000);
		if (event !== 'exit') process.exit(1);
	});
});

function LogAPI(req) {
	const Now = new Date()
	const DateStr = Now.toISOString().slice(2, 10).replace(/-/g, '')
	const LogPath = path.join(LogDir, `${dateStr}-api.log`)
	const LogEntry = `[${Now.toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} UA="${req.get('User-Agent') || ''}"\n`
	fs.appendFile(LogPath, LogEntry, () => {})
}


const app = express()
const Ports = { https: HTTPSPort, http: HTTPPort }

//const QMPClients = new Map();

/* VMI Server Security */
app.use(helmet())
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				connectSrc: [
					"'self'",
					"ws://localhost:*", "wss://localhost:*",
					"http://localhost:*", "https://localhost:*"
				]
			}
		}
}));

/* Logging */
app.use(morgan('dev'))
app.use((req, res, next) => {
	req.startTime = Date.now()
	next()
})

app.use(express.json())
app.use(express.static(WebDir))

/* Rate limit */

const API_RTLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false
});

const WSockifyProxy = createProxyMiddleware({
	target: 'https://127.0.0.1:6080',
	ws: true,
	secure: false,
	changeOrigin: true,
	pathRewrite: { '^/novnc/websockify': '' }
})
app.use('/novnc/websockify', WSockifyProxy)

const VMIAPI_V1 = require("./core/api/v1/global");

VMIAPI_V1.use(API_RTLimit)
VMIAPI_V1.use((req, res, next) => { LogAPI(req); next() })

app.use('/api/v1', VMIAPI_V1);

/* VMI Server Config */

const SSLCfg = {
	key: fs.readFileSync(SSL_CertKey),
	cert: fs.readFileSync(SSL_CertFile)
}

const ServerHTTPS = https.createServer(SSLCfg, app)
ServerHTTPS.on('upgrade', WSockifyProxy.upgrade)
ServerHTTPS.listen(Ports.https, () => {
	console.log(`HTTPS listening on :${Ports.https}`)
})


if(!NoHTTP){
	http.createServer((req, res) => {
		const host = req.headers.host.split(':')[0]
		res.writeHead(301, { Location: `https://${host}:${Ports.https}${req.url}` })
		res.end()
	}).listen(Ports.http, () => {
		console.log(`HTTP -> HTTPS redirect on port :${Ports.http}`)
	})
}
