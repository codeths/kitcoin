import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongostore from 'connect-mongodb-session';
import {mongo as mongoURL, sessionSecret, port} from '../config/keys.json';
import {auth, api} from './routes';
import {IUserDoc, User} from '../helpers/schema';
import path from 'path';
import {request} from '../helpers/request';

declare module 'express-session' {
	interface SessionData {
		token: string;
	}
}

declare module 'express-serve-static-core' {
	interface Request {
		user?: IUserDoc;
	}
}

const app = express();
const MongoDBStore = mongostore(session);

const store = new MongoDBStore({
	uri: mongoURL,
	collection: 'sessions',
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

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
	res.sendFile(path.resolve(`${__dirname}/../../frontend/build/index.html`));
}

app.get(
	'/student',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('STUDENT')) servePage(res);
		else if (req.user) res.redirect('/');
		else res.redirect('/login');
	},
);

app.get(
	'/staff',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('STAFF')) servePage(res);
		else if (req.user) res.redirect('/');
		else res.redirect('/login');
	},
);

app.get(
	'/admin',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user && req.user.hasRole('ADMIN')) servePage(res);
		else if (req.user) res.redirect('/');
		else res.redirect('/login');
	},
);

app.use('/schema', express.static(`${__dirname}/../schema`));

app.get(
	'/',
	(...req) => request(...req, {}),
	(req, res) => {
		if (req.user) {
			if (req.user.hasRole('STAFF')) res.redirect('/staff');
			else if (req.user.hasRole('STUDENT')) res.redirect('/student');
			else servePage(res);
		} else {
			res.redirect('/login');
		}
	},
);

app.use(express.static(`${__dirname}/../../frontend/build`));

app.get(
	'*',
	(...req) => request(...req, {}),
	(req, res) => {
		servePage(res);
	},
);
