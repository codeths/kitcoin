import express from 'express';
import sharp from 'sharp';
import {FilterQuery} from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {ClassroomClient} from '../../../helpers/classroom';
import {numberFromData, request, Validators} from '../../../helpers/request';
import {
	IStoreDoc,
	IUserDoc,
	Store,
	StoreItem,
	Transaction,
	User,
} from '../../../helpers/schema';
import {IStoreItemDoc, requestHasUser} from '../../../types';
const router = express.Router();

async function getStorePerms(
	store: IStoreDoc,
	user: IUserDoc | undefined,
): Promise<{
	view: boolean;
	manage: boolean;
}> {
	if (!user)
		return {
			view: store.public,
			manage: false,
		};

	let view = false,
		manage = false,
		classroomClient = await new ClassroomClient().createClient(user);

	if (user.hasRole('ADMIN')) {
		manage = true;
	} else if (store.managers.includes(user.id)) {
		manage = true;
	} else if (store.classIDs && classroomClient) {
		const teaching = await classroomClient
			.getClassesForRole('TEACHER')
			.then(x => (x || []).map(x => x.id));

		if (store.classIDs.some(x => teaching.includes(x))) manage = true;
	}

	if (manage)
		return {
			view: true,
			manage,
		};

	if (store.public) {
		view = true;
	} else if (store.users.includes(user.id)) {
		view = true;
	} else if (store.classIDs && classroomClient) {
		const classes = await classroomClient
			.getClassesForRole('STUDENT')
			.then(x => (x || []).map(x => x.id));

		if (store.classIDs.some(x => classes.includes(x))) view = true;
	}

	return {view, manage};
}

router.get(
	'/stores',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		let query: FilterQuery<IStoreDoc>[] = [
			{
				public: true,
			},
		];

		let classes: {
			id: string;
			name: string | null;
			role: 'TEACHER' | 'STUDENT';
		}[] = [];

		if (requestHasUser(req)) {
			let classroomClient = await new ClassroomClient().createClient(
				req.user,
			);
			classes = await Promise.all([
				classroomClient.getClassesForRole('TEACHER'),
				classroomClient.getClassesForRole('STUDENT'),
			]).then(x =>
				x
					.map((x, i) =>
						(x || [])
							.filter(x => x.id)
							.map(x => ({
								id: x.id as string,
								name: x.name || null,
								role: (i === 0 ? 'TEACHER' : 'STUDENT') as
									| 'TEACHER'
									| 'STUDENT',
							})),
					)
					.flat(),
			);

			query.push({classIDs: {$in: classes.map(x => x.id)}});
			query.push({
				managers: req.user.id,
			});
			query.push({
				users: req.user.id,
			});
		}

		const stores = await Store.find({
			$or: query,
		});

		res.status(200).json(
			stores.map(x => ({
				canManage: req.user
					? req.user.hasRole('ADMIN') ||
					  (x.classIDs &&
							classes
								.filter(x => x.role === 'TEACHER')
								.some(c => x.classIDs.includes(c.id))) ||
					  x.managers.includes(req.user.id)
					: false,
				_id: x._id,
				name: x.name,
				description: x.description,
				public: x.public,
				classNames:
					classes
						.filter(c => x.classIDs.includes(c.id))
						.map(x => x.name) || null,
			})),
		);
	},
);

router.get(
	'/store/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.view) return res.status(403).send('Forbidden');

			const {name, description} = store;

			return res.status(200).send({
				name,
				description,
				canManage: permissions.manage,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.post(
	'/store/:id/sell',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STAFF'],
			validators: {
				params: {
					id: Validators.objectID,
				},
				body: {
					user: Validators.objectID,
					item: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {id} = req.params;
			const data = req.body;

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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await StoreItem.findById(req.body.item);
			if (!item) return res.status(400).send('Item not found');

			const user = await User.findById(req.body.user);
			if (!user) return res.status(400).send('User not found');
			if (user.balance < item.price)
				return res.status(400).send('User does not have enough money');

			await new Transaction({
				amount: item.price * -1,
				from: {
					text: `Store purchase in ${store.name}`,
				},
				to: {
					id: user._id,
				},
				reason: `${item.name}`,
			}).save();

			user.balance -= item.price;
			await user.save();

			if (typeof item.quantity === 'number' && item.quantity > 0)
				item.quantity--;
			await item.save();

			return res.status(200).send();
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.get(
	'/store/:id/items',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
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

		const permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		const items = await StoreItem.find().byStoreID(id);

		res.status(200).send(
			items.map(i => ({
				_id: i._id,
				name: i.name,
				description: i.description,
				quantity: i.quantity,
				price: i.price,
				imageHash: i.imageHash,
			})),
		);
	},
);

router.get(
	'/store/:storeID/item/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		const {storeID, id} = req.params;

		const store = await Store.findById(storeID)
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

		const permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		const item = await StoreItem.findById(id)
			.then(item => {
				if (!item || item.storeID != storeID) {
					res.status(404).send('Item not found');
					return null;
				}
				return item;
			})
			.catch(() => {
				res.status(400).send('Invalid ID');
				return null;
			});

		if (!item) return;

		res.status(200).send({
			_id: item._id,
			name: item.name,
			description: item.description,
			quantity: item.quantity,
			price: item.price,
			imageHash: item.imageHash,
		});
	},
);

router.get(
	'/store/:storeID/item/:id/image',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		const {storeID, id} = req.params;

		const store = await Store.findById(storeID)
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

		const permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		const item = await StoreItem.findById(id)
			.then(item => {
				if (!item || item.storeID != storeID) {
					res.status(404).send('Item not found');
					return null;
				}
				return item;
			})
			.catch(() => {
				res.status(400).send('Invalid ID');
				return null;
			});

		if (!item) return;

		let image;
		try {
			image = fs.readFileSync(
				path.resolve('uploads', 'storeitems', `${item._id}.webp`),
			);
		} catch (e) {}

		if (image) {
			res.setHeader('Content-Type', 'image/webp');
			res.setHeader('Cache-Control', 'no-cache, max-age=604800');
			res.status(200).send(image);
		} else {
			res.status(404).send('No image');
		}
	},
);

router.patch(
	'/store/:storeID/item/:id/image',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
			},
		}),
	express.raw({
		type: ['image/png', 'image/jpeg', 'image/webp'],
		limit: 1024 * 1024 * 5,
	}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID, id} = req.params;
			let image = req.body;
			if (!image || !(image instanceof Buffer))
				return res.status(400).send('Invalid image');

			const store = await Store.findById(storeID)
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await StoreItem.findById(id)
				.then(item => {
					if (!item || item.storeID != storeID) {
						res.status(404).send('Item not found');
						return null;
					}
					return item;
				})
				.catch(() => {
					res.status(400).send('Invalid ID');
					return null;
				});

			if (!item) return;

			image = await sharp(image)
				.resize({width: 512, height: 512, fit: 'inside'})
				.webp()
				.toBuffer()
				.catch(e => {
					res.status(400).send('Invalid image');
					return null;
				});

			if (!image) return;

			const hashSum = crypto.createHash('sha256');
			hashSum.update(image);
			const hash = hashSum.digest('hex');

			fs.writeFileSync(
				path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				image,
			);

			item.imageHash = hash;
			await item.save();
			return res.status(200).send({
				_id: item._id,
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: item.price,
				imageHash: item.imageHash,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.patch(
	'/store/:storeID/item/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
				body: {
					name: Validators.string,
					description: Validators.optional(Validators.string),
					price: Validators.currency,
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(0)),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID, id} = req.params;
			let {name, description, price, quantity} = req.body;

			const store = await Store.findById(storeID)
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await StoreItem.findById(id)
				.then(item => {
					if (!item || item.storeID != storeID) {
						res.status(404).send('Item not found');
						return null;
					}
					return item;
				})
				.catch(() => {
					res.status(400).send('Invalid ID');
					return null;
				});

			if (!item) return;

			Object.assign(item, {name, description, price, quantity});

			await item.save();

			res.status(200).send({
				_id: item._id,
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: item.price,
				imageHash: item.imageHash,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.delete(
	'/store/:storeID/item/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID, id} = req.params;

			const store = await Store.findById(storeID)
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await StoreItem.findById(id)
				.then(item => {
					if (!item || item.storeID != storeID) {
						res.status(404).send('Item not found');
						return null;
					}
					return item;
				})
				.catch(() => {
					res.status(400).send('Invalid ID');
					return null;
				});

			if (!item) return;

			await item.delete();

			try {
				fs.rmSync(
					path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				);
			} catch (e) {}

			res.status(200).send();
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.delete(
	'/store/:storeID/item/:id/image',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID, id} = req.params;

			const store = await Store.findById(storeID)
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await StoreItem.findById(id)
				.then(item => {
					if (!item || item.storeID != storeID) {
						res.status(404).send('Item not found');
						return null;
					}
					return item;
				})
				.catch(() => {
					res.status(400).send('Invalid ID');
					return null;
				});

			if (!item) return;

			try {
				fs.rmSync(
					path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				);
			} catch (e) {}

			item.imageHash = null;
			await item.save();

			return res.status(200).send({
				_id: item._id,
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: item.price,
				imageHash: item.imageHash,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

router.post(
	'/store/:storeID/items',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
				},
				body: {
					name: Validators.string,
					description: Validators.optional(Validators.string),
					price: Validators.currency,
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(0)),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID} = req.params;
			const {name, quantity, description, price} = req.body;

			const store = await Store.findById(storeID)
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

			const permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			const item = await new StoreItem({
				storeID,
				name,
				quantity,
				description,
				price,
			}).save();

			if (!item) return res.status(500).send('Failed to create item');

			return res.status(200).send({
				_id: item._id,
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: item.price,
				imageHash: item.imageHash,
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

export default router;
