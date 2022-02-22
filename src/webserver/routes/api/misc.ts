import express from 'express';
import {request, Validators} from '../../../helpers/request';
import {DBError} from '../../../struct';
const router = express.Router();

router.get(
	'/error/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					id: Validators.string,
				},
			},
		}),
	async (req, res) => {
		try {
			const error = await DBError.findOne({_id: req.params.id});
			if (!error) return res.status(404).send('Error not found');
			if (error.user && req.user?.id !== error.user)
				return res.status(403).end();
			return res.status(200).send(error.details || {});
		} catch (e) {
			try {
				const error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(`An error occured. Error ID: ${error.id}`);
			} catch (e) {}
		}
	},
);

export default router;
