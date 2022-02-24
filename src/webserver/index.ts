import cluster from 'cluster';
import compression from 'compression';
import mongostore from 'connect-mongodb-session';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import {cpus} from 'os';

import {mongo as mongoURL, port, sessionSecret} from '../config/keys.js';
import {request} from '../helpers/request.js';
import {DBError, IUser} from '../struct/index.js';
import {api, auth} from './routes/index.js';
import {handleLogin} from './routes/auth.js';

declare module 'express-session' {
	interface SessionData {
		token?: string;
		csrf?: {
			state: string;
			redirect?: string;
			expires: number;
		};
	}
}

declare module 'express-serve-static-core' {
	interface Request {
		user?: IUser;
	}
}

const app = express();

let numClusters = parseInt(process.env.CLUSTERS || '0') || cpus().length;

if (numClusters > 1 && cluster.isPrimary) {
	for (let i = 0; i < numClusters; i++) {
		cluster.fork();
	}
} else {
	app.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

const MongoDBStore = mongostore(session);

const store = new MongoDBStore({
	uri: mongoURL,
	collection: 'sessions',
});

app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(compression());

app.use(
	session({
		secret: sessionSecret,
		store,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 30,
			secure: process.env.NODE_ENV === 'production',
		},
	}),
);

app.use('/auth', auth);
app.use('/api', api);

app.use(['/login', '/logout', '/signin', '/signout'], (req, res) => {
	res.redirect(`/auth${req.originalUrl}`);
});

function servePage(res: express.Response) {
	res.setHeader('Cache-Control', 'no-cache, max-age=604800');
	res.sendFile(
		new URL('../../frontend/build/index.html', import.meta.url).pathname,
	);
}

app.get(
	'/student',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('STUDENT')) servePage(res);
		else if (req.user) res.redirect('/');
		else
			handleLogin(req, res, {
				redirect: true,
				hint: true,
			});
	},
);

app.get(
	'/staff',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('STAFF')) servePage(res);
		else if (req.user) res.redirect('/');
		else
			handleLogin(req, res, {
				redirect: true,
				hint: true,
			});
	},
);

app.get(
	'/admin',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('ADMIN')) servePage(res);
		else if (req.user) res.redirect('/');
		else
			handleLogin(req, res, {
				redirect: true,
				hint: true,
			});
	},
);

app.use(
	'/schema',
	express.static(new URL('../schema', import.meta.url).pathname),
);

app.get('/home', (req, res) => res.redirect('/'));

app.get(
	'/',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user) {
			if (req.user.hasRole('STAFF')) return res.redirect('/staff');
			else if (req.user.hasRole('ADMIN')) return res.redirect('/admin');
			else if (req.user.hasRole('STUDENT'))
				return res.redirect('/student');
		}

		servePage(res);
	},
);

app.use(
	express.static(new URL('../../frontend/build', import.meta.url).pathname, {
		setHeaders: res => res.setHeader('Cache-Control', 'public'),
	}),
);

app.use(async (err, req, res, next) => {
	if (err) {
		try {
			const error = await DBError.generate(
				{
					request: req,
					error: err instanceof Error ? err : undefined,
				},
				{
					user: req.user?.id,
				},
			);
			res.status(500).send(`Something went wrong. Error ID: ${error.id}`);
		} catch (e) {}
	} else {
		next();
	}
});

app.get(
	'*',
	(...req) => request(...req, {}),
	(req, res) => {
		servePage(res);
	},
);
