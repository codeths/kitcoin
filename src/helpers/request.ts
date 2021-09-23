import express from 'express';
import {getOptions, RequestOptions} from '../types/request';
import {User} from './schema';

export async function request(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	options?: Partial<RequestOptions>,
) {
	const appliedOptions = getOptions(options);
	if (req.session?.token) {
		const user = await User.findOne().byToken(req.session.token);
		if (user) req.user = user;
	}
	if (appliedOptions.authentication && !req.user)
		return res.status(401).send('Unauthorized');

	if (req.user) {
		if (!req.user.hasAnyRole(appliedOptions.roles))
			return res.status(403).send('Forbidden');
	}

	next();
}
