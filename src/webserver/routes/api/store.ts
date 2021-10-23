import express from 'express';
import {request} from '../../../helpers/request';
import {IStoreDoc, Store} from '../../../helpers/schema';
const router = express.Router();

router.get(
	'/store/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
		}),
	async (req, res) => {
		if (!req.user) return;

		try {
			const {id} = req.params;

			const store = await Store.findById(id)
				.then(store => {
					if (!store) {
						res.status(404).send('Store not found');
						return null;
					}
					return store;
				})
				.catch(() => {
					res.status(400).send('Invalid ID');
					return null;
				});

			if (!store) return;

			if (!store.public) {
				/**
				 * @todo Check Google classroom permissions
				 */
			}

			const {name, description} = store;
			const manager = store.managers.includes(req.user.id);

			const items = await store.getItems();

			return res.status(200).send({
				name,
				description,
				manager,
				items,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

export default router;
