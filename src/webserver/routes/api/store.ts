import express from 'express';
import sharp from 'sharp';
import {FilterQuery} from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {ClassroomClient} from '../../../helpers/classroom';
import {numberFromData, request, Validators} from '../../../helpers/request';
import {User, Transaction} from '../../../struct';
import {
	DBError,
	IStoreDoc,
	IUser,
	Store,
	StoreItem,
} from '../../../helpers/schema';
import {
	IStore,
	IStoreAPIResponse,
	IStoreItemDoc,
	requestHasUser,
} from '../../../types';
const router = express.Router();

async function getStorePerms(
	store: IStoreDoc,
	user: IUser | undefined,
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
	} else if (store.managers.includes(user.id) || store.owner == user.id) {
		manage = true;
	} else if (store.classIDs && classroomClient) {
		let teaching = await classroomClient
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
		let classes = await classroomClient
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
			query.push({
				owner: req.user.id,
			});
		}

		let stores = await Store.find({
			$or: query,
		});

		let data = await Promise.all(
			stores.map(async x => {
				let canManage = req.user
					? req.user.hasRole('ADMIN') ||
					  (x.classIDs &&
							classes
								.filter(x => x.role === 'TEACHER')
								.some(c => x.classIDs.includes(c.id))) ||
					  x.owner == req.user.id ||
					  x.managers.includes(req.user.id)
					: false;
				let res = await x.toAPIResponse(canManage);
				res.classNames =
					classes
						.filter(c => x.classIDs.includes(c.id) && c.name)
						.map(x => x.name!) || [];
				return res;
			}),
		);

		res.status(200).json(data);
	},
);

router.post(
	'/stores',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			roles: ['STAFF'],
			validators: {
				body: {
					name: Validators.string,
					description: Validators.optional(Validators.string),
					classIDs: Validators.array(Validators.regex(/^\d+$/)),
					public: Validators.boolean,
					managers: Validators.array(Validators.objectID),
					users: Validators.array(Validators.objectID),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let body = req.body;
			body.owner = req.user.id;
			if (body.public && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to create a public store.');

			let invalidUsers = (
				await Promise.all(
					[body.managers, body.users].flat().map(async id => {
						let user = await User.findById(id);
						return user ? null : id;
					}),
				)
			).filter(x => x);

			if (invalidUsers.length > 0)
				return res
					.status(400)
					.send(`Invalid user IDs: ${invalidUsers.join(', ')}`);

			if (body.classIDs.length > 0) {
				let classroomClient = await new ClassroomClient().createClient(
					req.user,
				);

				let teaching = await classroomClient
					.getClassesForRole('TEACHER')
					.then(x => (x || []).map(x => x.id));

				let invalidClasses = body.classIDs.filter(
					(id: string) => !teaching.includes(id),
				);

				if (invalidClasses.length > 0)
					return res
						.status(400)
						.send(
							`Invalid class IDs: ${invalidClasses.join(', ')}`,
						);
			}

			let store = await Store.create(body);

			if (!store) return res.status(500).send('Failed to create store.');

			res.status(201).json(await store.toAPIResponse(true));
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
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
			let {id} = req.params;

			let store = await Store.findById(id);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.view) return res.status(403).send('Forbidden');

			return res
				.status(200)
				.json(await store.toAPIResponse(permissions.manage));
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
	},
);

router.patch(
	'/store/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			roles: ['STAFF'],
			validators: {
				params: {
					id: Validators.objectID,
				},
				body: {
					name: Validators.string,
					description: Validators.optional(Validators.string),
					classIDs: Validators.array(Validators.regex(/^\d+$/)),
					public: Validators.boolean,
					managers: Validators.array(Validators.objectID),
					users: Validators.array(Validators.objectID),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let store = await Store.findById(req.params.id);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let body = req.body;
			body.owner = req.user.id;
			if (body.public !== store.public && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to change the public setting.');

			let invalidUsers = (
				await Promise.all(
					[body.managers, body.users].flat().map(async id => {
						let user = await User.findById(id);
						return user ? null : id;
					}),
				)
			).filter(x => x);

			if (invalidUsers.length > 0)
				return res
					.status(400)
					.send(`Invalid user IDs: ${invalidUsers.join(', ')}`);

			if (body.classIDs.length > 0) {
				let classroomClient = await new ClassroomClient().createClient(
					req.user,
				);

				let teaching = await classroomClient
					.getClassesForRole('TEACHER')
					.then(x => (x || []).map(x => x.id));

				let invalidClasses = body.classIDs.filter(
					(id: string) =>
						!teaching.includes(id) && !store!.classIDs.includes(id),
				);

				if (invalidClasses.length > 0)
					return res
						.status(400)
						.send(
							`Invalid class IDs: ${invalidClasses.join(', ')}`,
						);
			}

			store = Object.assign(store, body) as typeof store;
			await store.save();

			res.status(200).json(await store.toAPIResponse(true));
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
	},
);

router.delete(
	'/store/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			roles: ['STAFF'],
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let store = await Store.findById(req.params.id);
			if (!store) return res.status(404).send('Store not found');

			if (store.owner !== req.user.id && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('Only the owner or an admin can delete a store.');

			let items = await StoreItem.find({storeID: store.id});
			await Promise.all(
				items.map(async item => {
					try {
						fs.rmSync(
							path.resolve(
								'uploads',
								'storeitems',
								`${item._id}.webp`,
							),
						);
					} catch (e) {}
					await item.delete();
				}),
			);
			await store.delete();

			res.status(200).send();
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
	},
);

router.get(
	'/store/:id/students',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STAFF'],
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {id} = req.params;

			let store = await Store.findById(id);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			if (store.public) return res.status(200).send(null);

			let studentIds: string[] = store.users;

			if (store.classIDs.length > 0) {
				let classroomClient = await new ClassroomClient().createClient(
					req.user,
				);

				await Promise.all(
					store.classIDs.map(async classID => {
						let students = await classroomClient.getStudentsWithIds(
							classID,
						);

						if (students)
							students.forEach(x => studentIds.push(x.mongoId));
					}),
				);
			}
			return res.status(200).send(studentIds);
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

			let {id} = req.params;
			let data = req.body;

			let store = await Store.findById(id);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(req.body.item);
			if (!item) return res.status(400).send('Item not found');

			let user = await User.findById(req.body.user);
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
				store: {
					id: store.id,
					item: item.id,
					manager: req.user.id,
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
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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
		let {id} = req.params;

		let store = await Store.findById(id);
		if (!store) return res.status(404).send('Store not found');

		let permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		let items = await StoreItem.find().byStoreID(id);

		res.status(200).json(items);
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
		let {storeID, id} = req.params;

		let store = await Store.findById(storeID);
		if (!store) return res.status(404).send('Store not found');

		let permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		let item = await StoreItem.findById(id);
		if (!item) return res.status(404).send('Item not found');

		if (!item) return;

		res.status(200).json(item);
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
		let {storeID, id} = req.params;

		let store = await Store.findById(storeID);
		if (!store) return res.status(404).send('Store not found');

		let permissions = await getStorePerms(store, req.user);
		if (!permissions.view) return res.status(403).send('Forbidden');

		let item = await StoreItem.findById(id);
		if (!item) return res.status(404).send('Item not found');

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

			let {storeID, id} = req.params;
			let image = req.body;
			if (!image || !(image instanceof Buffer))
				return res.status(400).send('Invalid image');

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(id);
			if (!item) return res.status(404).send('Item not found');

			image = await sharp(image)
				.resize({width: 512, height: 512, fit: 'inside'})
				.webp()
				.toBuffer()
				.catch(e => {
					res.status(400).send('Invalid image');
					return null;
				});

			if (!image) return;

			let hashSum = crypto.createHash('sha256');
			hashSum.update(image);
			let hash = hashSum.digest('hex');

			fs.writeFileSync(
				path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				image,
			);

			item.imageHash = hash;
			await item.save();
			return res.status(200).json(item);
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

			let {storeID, id} = req.params;
			let {name, description, price, quantity} = req.body;

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(id);
			if (!item) return res.status(404).send('Item not found');

			Object.assign(item, {name, description, price, quantity});

			await item.save();

			res.status(200).json(item);
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

			let {storeID, id} = req.params;

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(id);
			if (!item) return res.status(404).send('Item not found');

			await item.delete();

			try {
				fs.rmSync(
					path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				);
			} catch (e) {}

			res.status(200).send();
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

			let {storeID, id} = req.params;

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(id);
			if (!item) return res.status(404).send('Item not found');

			try {
				fs.rmSync(
					path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				);
			} catch (e) {}

			item.imageHash = null;
			await item.save();

			return res.status(200).json(item);
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
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

			let {storeID} = req.params;
			let {name, quantity, description, price} = req.body;

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await new StoreItem({
				storeID,
				name,
				quantity,
				description,
				price,
			}).save();

			if (!item) return res.status(500).send('Failed to create item');

			return res.status(200).send(item);
		} catch (e) {
			try {
				let error = await DBError.generate(
					{
						request: req,
						error: e instanceof Error ? e : undefined,
					},
					{
						user: req.user?.id,
					},
				);
				res.status(500).send(
					`Something went wrong. Error ID: ${error.id}`,
				);
			} catch (e) {}
		}
	},
);

export default router;
