import express from 'express';
import jimp from 'jimp';
import {FilterQuery} from 'mongoose';
import fs from 'fs';
import path from 'path';
import {ClassroomClient} from '../../../helpers/classroom';
import {
	numberFromData,
	request,
	Validators,
	cacheMiddleware,
} from '../../../helpers/request';
import {IStoreDoc, IUserDoc, Store, StoreItem} from '../../../helpers/schema';
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
	} else if (store.classID && classroomClient) {
		const teaching = await classroomClient
			.getClassesForRole('TEACHER')
			.then(x => (x || []).map(x => x.id));

		if (teaching.includes(store.classID)) manage = true;
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
	} else if (store.classID && classroomClient) {
		const classes = await classroomClient
			.getClassesForRole('STUDENT')
			.then(x => (x || []).map(x => x.id));

		if (classes.includes(store.classID)) view = true;
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

			query.push({classID: {$in: classes.map(x => x.id)}});
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
					  (x.classID &&
							classes
								.filter(x => x.role === 'TEACHER')
								.some(c => c.id == x.classID)) ||
					  x.managers.includes(req.user.id)
					: false,
				_id: x._id,
				name: x.name,
				description: x.description,
				public: x.public,
				className: classes.find(c => c.id == x.classID)?.name || null,
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
					id: Validators.string,
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

router.get(
	'/store/:id/items',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					id: Validators.string,
				},
				query: {
					count: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
					page: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
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

		let count = numberFromData(req.query.count) ?? 10;
		let page = numberFromData(req.query.page) ?? 1;

		const query = StoreItem.find().byStoreID(id);

		const [items, docCount] = await Promise.all([
			query
				.clone()
				.setOptions({
					skip: (page - 1) * count,
					limit: count,
				})
				.exec(),
			query.clone().countDocuments().exec(),
		]);

		res.status(200).send({
			page,
			pageCount: Math.ceil(docCount / count),
			docCount,
			items: items.map(i => ({
				_id: i._id,
				name: i.name,
				description: i.description,
				quantity: i.quantity,
				price: i.price,
			})),
		});
	},
);

router.get(
	'/store/:storeID/item/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					storeID: Validators.string,
					id: Validators.string,
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
		});
	},
);

router.get(
	'/store/:storeID/item/:id/image.png',
	cacheMiddleware,
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				params: {
					storeID: Validators.string,
					id: Validators.string,
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
				path.resolve('uploads', 'storeitems', `${item._id}.png`),
			);
		} catch (e) {}

		if (image) {
			res.setHeader('Content-Type', 'image/png');
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
					storeID: Validators.string,
					id: Validators.string,
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

			if (req.get('Content-Type') !== 'image/png') {
				image = await jimp
					.read(image)
					.then(image => image.getBufferAsync(jimp.MIME_PNG))
					.catch(() => {
						res.status(400).send('Invalid image');
						return null;
					});

				if (!image) return;
			}

			fs.writeFileSync(
				path.resolve('uploads', 'storeitems', `${item._id}.png`),
				image,
			);
			return res.status(200).send();
		} catch (e) {
			console.log(e);
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
					storeID: Validators.string,
					id: Validators.string,
				},
				body: {
					name: Validators.optional(Validators.string),
					description: Validators.optional(Validators.string),
					price: Validators.optional(Validators.number),
					quantity: Validators.optional(Validators.number),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			const {storeID, id} = req.params;
			let data = req.body;

			Object.keys(data).forEach(key => {
				if (
					!['name', 'description', 'price', 'quantity'].includes(
						key,
					) ||
					data[key] == null ||
					data[key] == undefined
				)
					delete data[key];
			});

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

			Object.assign(item, data);

			await item.save();

			res.status(200).send({
				_id: item._id,
				name: item.name,
				description: item.description,
				quantity: item.quantity,
				price: item.price,
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
					storeID: Validators.string,
					id: Validators.string,
				},
				body: {
					name: Validators.optional(Validators.string),
					description: Validators.optional(Validators.string),
					price: Validators.optional(Validators.number),
					quantity: Validators.optional(Validators.number),
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

			res.status(200).send();
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
					storeID: Validators.string,
				},
				body: {
					name: Validators.string,
					description: Validators.optional(Validators.string),
					price: Validators.number,
					quantity: Validators.optional(Validators.number),
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
			});
		} catch (e) {
			try {
				res.status(500).send('Something went wrong.');
			} catch (e) {}
		}
	},
);

export default router;
