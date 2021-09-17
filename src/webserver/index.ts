import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongostore from 'connect-mongodb-session';
import { mongo as mongoURL, sessionSecret, port } from '../config/keys.json';
import { auth, api } from './routes';

declare module 'express-session' {
	interface SessionData {
		token: string;
	}
}


const app = express();
const MongoDBStore = mongostore(session);

const store = new MongoDBStore({
	uri: mongoURL,
	collection: 'sessions'
});

app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

app.set('trust proxy', 1)

app.use(express.json());
app.use(cookieParser());


app.use(session({
	secret: sessionSecret,
	store,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 1000 * 60 * 60 * 24 * 30,
		secure: process.env.NODE_ENV === 'production'
	}
}))

app.use('/auth', auth);
app.use('/api', api);

app.get('/', async (req, res) => {
	res.send('Hello World!');
});