import crypto from 'crypto';
import escapeHTML from 'escape-html';
import escapeRegex from 'regex-escape';
import express from 'express';
import fs from 'fs';
import {FilterQuery} from 'mongoose';
import path from 'path';
import sharp from 'sharp';

import {ClassroomClient} from '../../../helpers/classroom.js';
import {request, Validators} from '../../../helpers/request.js';
import {
	DBError,
	IStore,
	IStoreRequest,
	IUser,
	Store,
	StoreItem,
	StoreRequest,
	Transaction,
	User,
} from '../../../struct/index.js';
import {
	IStoreAPIResponse,
	requestHasUser,
	StoreRequestStatus,
} from '../../../types/index.js';

const router = express.Router();

async function getStorePerms(
	store: IStore,
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

async function getStores(
	user?: IUser,
	search?: string,
	reqUser: IUser | undefined = user,
) {
	let query: FilterQuery<IStore>[] = [
		{
			public: true,
		},
	];

	let classes: {
		id: string;
		name: string | null;
		role: 'TEACHER' | 'STUDENT';
	}[] = [];

	if (user) {
		let classroomClient = await new ClassroomClient().createClient(user);
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
			managers: user.id,
		});
		query.push({
			users: user.id,
		});
		query.push({
			owner: user.id,
		});
	}
	let options: FilterQuery<IStore> = {
		$or: query,
	};
	if (search) {
		options = {};
		options[user ? '$and' : '$or'] = [
			{$or: query},
			{
				$or: [
					{
						name: RegExp(escapeRegex(search).toLowerCase(), 'i'),
					},
					{
						description: RegExp(
							escapeRegex(search).toLowerCase(),
							'i',
						),
					},
				],
			},
		];
	}

	let stores = await Store.find(options);

	let data = stores.map(x => {
		let res: any = x;
		res.canManage = reqUser
			? reqUser.hasRole('ADMIN') ||
			  (x.classIDs &&
					classes
						.filter(x => x.role === 'TEACHER')
						.some(c => x.classIDs.includes(c.id))) ||
			  x.owner == reqUser.id ||
			  x.managers.includes(reqUser.id)
			: false;
		res.classNames =
			classes
				.filter(c => x.classIDs.includes(c.id) && c.name)
				.map(x => x.name!) || [];
		return res as IStore & {
			canManage: boolean;
			classNames: string[];
		};
	});

	return data;
}

async function handleDeletedRequestData(request: IStoreRequest) {
	let item = await StoreItem.findById(request.itemID);

	if (item && typeof item.quantity === 'number') {
		item.quantity += request.quantity ?? 1;
		await item.save();
	}

	let transaction = await Transaction.findById({_id: request.transactionID});

	if (transaction) {
		let user = await User.findById(request.studentID);
		if (user) {
			user.balance += request.price;
			await user.save();
		}

		await transaction.delete();
	}

	await request.delete();
}

router.get(
	'/',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			validators: {
				query: {
					search: Validators.optional(Validators.string),
					user: Validators.optional(Validators.objectID),
				},
			},
		}),
	async (req, res) => {
		let {search, user} = req.query;
		if (search && typeof search !== 'string') search = undefined;
		if (user && typeof user !== 'string') user = undefined;

		if (!req.user?.hasRole('ADMIN') && (search || user))
			return res
				.status(403)
				.send('You must be an admin to specify another user');

		let reqUser = req.user;
		if (user) reqUser = (await User.findById(user)) || undefined;
		if (user && !reqUser) return res.status(404).send('User not found');
		if (search && !user) reqUser = undefined;

		let stores: IStoreAPIResponse[] = await Promise.all(
			(
				await getStores(reqUser, search, req.user)
			).map(async x => ({
				...(await x.toAPIResponse(x.canManage)),
				classNames: x.classNames,
			})),
		);

		res.status(200).json(
			stores.sort((a, b) => {
				if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
				if (a.public !== b.public) return a.public ? -1 : 1;
				if (a.canManage !== b.canManage) return a.canManage ? -1 : 1;
				return a.name.localeCompare(b.name);
			}),
		);
	},
);

router.post(
	'/',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			roles: ['STAFF'],
			validators: {
				body: {
					name: Validators.stringNotEmpty,
					description: Validators.optional(Validators.stringNotEmpty),
					classIDs: Validators.array(Validators.regex(/^\d+$/)),
					public: Validators.boolean,
					managers: Validators.array(Validators.objectID),
					users: Validators.array(Validators.objectID),
					pinned: Validators.boolean,
					requests: Validators.boolean,
					allowDeductions: Validators.boolean,
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
			if (body.pinned && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to create a pinned store.');
			if (body.allowDeductions && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to enable allowDeductions.');
			if (!body.public && body.pinned) body.pinned = false;

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
					.send(
						`Invalid user IDs: ${escapeHTML(
							invalidUsers.join(', '),
						)}`,
					);

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
							`Invalid class IDs: ${escapeHTML(
								invalidClasses.join(', '),
							)}`,
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
	'/newarrivals',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
		}),
	async (req, res) => {
		try {
			let stores = await getStores(req.user);

			let allItems = await Promise.all(
				stores.map(x => StoreItem.findByStoreID(x.id)),
			);
			let newItems = allItems.flat().filter(x => x.newArrival);

			res.status(200).json(
				newItems.map(x =>
					x.toObject({
						getters: true,
						versionKey: false,
					}),
				),
			);
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
	'/requests',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STUDENT'],
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let requests = await StoreRequest.find({
				studentID: req.user.id,
			});

			let data = (
				await Promise.all(
					requests.map(async r => {
						let data = await r.toAPIResponse();
						if (!data) {
							handleDeletedRequestData(r);
							return null;
						}
						return data;
					}),
				)
			).filter(x => x);

			return res.status(200).json(data);
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
	'/requests/:id',
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

			let store = await Store.findById(req.params.id);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let requests = await StoreRequest.find({
				storeID: store.id,
				status: StoreRequestStatus.PENDING,
			});

			let data = (
				await Promise.all(
					requests.map(async r => {
						let data = await r.toAPIResponse();
						if (!data) {
							handleDeletedRequestData(r);
							return null;
						}
						return data;
					}),
				)
			).filter(x => x);

			return res.status(200).json(data);
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
	'/:id',
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
	'/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: false,
			roles: ['STAFF'],
			validators: {
				params: {
					id: Validators.objectID,
				},
				body: {
					name: Validators.stringNotEmpty,
					description: Validators.optional(Validators.stringNotEmpty),
					classIDs: Validators.array(Validators.regex(/^\d+$/)),
					public: Validators.boolean,
					managers: Validators.array(Validators.objectID),
					users: Validators.array(Validators.objectID),
					owner: Validators.optional(Validators.objectID),
					pinned: Validators.boolean,
					requests: Validators.boolean,
					allowDeductions: Validators.boolean,
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
			if (body.public !== store.public && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to change the public setting.');
			if (body.pinned !== store.pinned && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send('You must be an admin to change the pinned setting.');
			if (body.pinned !== store.pinned && !req.user.hasRole('ADMIN'))
				return res
					.status(403)
					.send(
						'You must be an admin to change the allowDeductions setting.',
					);
			if (!body.public && body.pinned) body.pinned = false;

			if (
				body.owner &&
				body.owner !== store.owner &&
				req.user.id !== store.owner &&
				!req.user.hasRole('ADMIN')
			)
				return res
					.status(403)
					.send(
						"You must be an admin or the current owner to change the store's owner.",
					);

			let invalidUsers = (
				await Promise.all(
					[body.managers, body.users, body.owner || store.owner]
						.flat()
						.map(async id => {
							let user = await User.findById(id);
							return user ? null : id;
						}),
				)
			).filter(x => x);

			if (invalidUsers.length > 0)
				return res
					.status(400)
					.send(
						`Invalid user IDs: ${escapeHTML(
							invalidUsers.join(', '),
						)}`,
					);

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
							`Invalid class IDs: ${escapeHTML(
								invalidClasses.join(', '),
							)}`,
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
	'/:id',
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

			let items = await StoreItem.findByStoreID(store.id);
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
	'/:id/students',
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

			if (store.public) return res.status(200).json(null);

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
	'/:id/sell',
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
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
					deduct: Validators.optional(Validators.currency(false)),
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

			let item = await StoreItem.findById(req.body.item);
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');
			let price = item.price;

			let user = await User.findById(req.body.user);
			if (!user) return res.status(400).send('User not found');

			let quantity: number = req.body.quantity ?? 1;
			price *= quantity;

			let deduct: number = req.body.deduct ?? 0;
			if (deduct !== 0 && !store.allowDeductions)
				return res
					.status(400)
					.send('This store does not allow price deductions');
			if (deduct > price)
				return res
					.status(400)
					.send('You cannot deduct more than the price');
			price -= deduct;

			if (user.balance < price)
				return res.status(400).send('User does not have enough money');

			await new Transaction({
				amount: price * -1,
				from: {
					text: `Store purchase in ${store.name}`,
				},
				to: {
					id: user._id,
				},
				store: {
					id: store.id,
					item: item.id,
					quantity,
					manager: req.user.id,
				},
				reason: `${item.name}${quantity > 1 ? ` x${quantity}` : ''}`,
			}).save();

			user.balance -= price;
			await user.save();

			if (typeof item.quantity === 'number') {
				item.quantity -= quantity;
				if (item.quantity < 0) item.quantity = 0;
			}

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
	'/:id/items',
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

		let items = await StoreItem.findByStoreID(store.id);

		res.status(200).json(
			items.map(x =>
				x.toObject({
					getters: true,
					versionKey: false,
				}),
			),
		);
	},
);

router.get(
	'/:storeID/item/:id',
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
		if (!item || item.storeID !== store.id)
			return res.status(400).send('Item not found');

		res.status(200).json(
			item.toObject({
				getters: true,
				versionKey: false,
			}),
		);
	},
);

router.get(
	'/:storeID/item/:id/image',
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
		if (!item || item.storeID !== store.id)
			return res.status(400).send('Item not found');

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
	'/:storeID/item/:id/image',
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
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');

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
			return res.status(200).json(
				item.toObject({
					getters: true,
					versionKey: false,
				}),
			);
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
	'/:storeID/item/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
					id: Validators.objectID,
				},
				body: {
					name: Validators.stringNotEmpty,
					description: Validators.optional(Validators.stringNotEmpty),
					price: Validators.currency,
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(0)),
					),
					pinned: Validators.optional(Validators.boolean),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {storeID, id} = req.params;
			let {name, description, price, quantity, pinned} = req.body;

			let store = await Store.findById(storeID);
			if (!store) return res.status(404).send('Store not found');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(id);
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');

			Object.assign(item, {name, description, price, quantity, pinned});

			await item.save();

			res.status(200).json(
				item.toObject({
					getters: true,
					versionKey: false,
				}),
			);
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
	'/:storeID/item/:id',
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
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');

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
	'/:storeID/item/:id/image',
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
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');

			try {
				fs.rmSync(
					path.resolve('uploads', 'storeitems', `${item._id}.webp`),
				);
			} catch (e) {}

			item.imageHash = undefined;
			await item.save();

			return res.status(200).json(
				item.toObject({
					getters: true,
					versionKey: false,
				}),
			);
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
	'/:storeID/items',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					storeID: Validators.objectID,
				},
				body: {
					name: Validators.stringNotEmpty,
					description: Validators.optional(Validators.stringNotEmpty),
					price: Validators.currency,
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gte(0)),
					),
					pinned: Validators.optional(Validators.boolean),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let {storeID} = req.params;
			let {name, quantity, description, price, pinned} = req.body;

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
				pinned,
			}).save();

			if (!item) return res.status(500).send('Failed to create item');

			return res.status(200).send(
				item.toObject({
					getters: true,
					versionKey: false,
				}),
			);
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
	'/request',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			roles: ['STUDENT'],
			validators: {
				body: {
					store: Validators.objectID,
					item: Validators.objectID,
					quantity: Validators.optional(
						Validators.and(Validators.integer, Validators.gt(0)),
					),
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let store = await Store.findById(req.body.store);
			if (!store) return res.status(404).send('Store not found');
			if (!store.requests)
				return res.status(400).send('Store does not accept requests');

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.view) return res.status(403).send('Forbidden');

			let item = await StoreItem.findById(req.body.item);
			if (!item || item.storeID !== store.id)
				return res.status(400).send('Item not found');
			let price = item.price;

			let quantity: number = req.body.quantity ?? 1;
			price *= quantity;

			if (req.user.balance < price)
				return res.status(400).send('You do not have enough money');

			if (typeof item.quantity === 'number') {
				if (item.quantity - quantity < 0)
					return res.status(400).send('Not enough stock');
				item.quantity -= quantity;
			}

			let transaction = await new Transaction({
				amount: price * -1,
				from: {
					text: `[PENDING] Store purchase request in ${store.name}`,
				},
				to: {
					id: req.user._id,
				},
				store: {
					id: store.id,
					item: item.id,
					quantity,
					manager: req.user.id,
				},
				reason: `${item.name}${quantity > 1 ? ` x${quantity}` : ''}`,
			}).save();

			req.user.balance -= price;
			await req.user.save();

			let request = await new StoreRequest({
				storeID: store._id,
				itemID: item._id,
				studentID: req.user._id,
				transactionID: transaction._id,
				quantity,
				price,
			}).save();

			await item.save();

			res.status(200).json(await request.toAPIResponse());
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
	'/request/:id',
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

			let request = await StoreRequest.findById(req.params.id);
			if (!request) return res.status(404).send('Request not found');

			let store = await Store.findById(request.storeID);
			if (!store) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}

			let permissions = await getStorePerms(store, req.user);
			if (!permissions.manage) return res.status(403).send('Forbidden');

			if (request.status !== StoreRequestStatus.PENDING)
				return res.status(400).send('Request is not pending');

			let item = await StoreItem.findById(request.itemID);
			if (!item) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}

			let student = await User.findById(request.studentID);
			if (!student) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}

			let transaction = await Transaction.findById(request.transactionID);
			if (!transaction) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}
			transaction.from.text = `Store purchase in ${store.name}`;
			await transaction.save();

			request.status = StoreRequestStatus.APPROVED;
			await request.save();
			res.status(200).json(await request.toAPIResponse());
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
	'/request/:id',
	async (req, res, next) =>
		request(req, res, next, {
			authentication: true,
			validators: {
				params: {
					id: Validators.objectID,
				},
			},
		}),
	async (req, res) => {
		try {
			if (!requestHasUser(req)) return;

			let request = await StoreRequest.findById(req.params.id);
			if (!request) return res.status(404).send('Request not found');

			let store = await Store.findById(request.storeID);
			if (!store) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}

			let item = await StoreItem.findById(request.itemID);
			if (!item) {
				handleDeletedRequestData(request);
				return res.status(404).send('Request not found');
			}

			if (request.status !== StoreRequestStatus.PENDING)
				return res.status(400).send('Request is not pending');

			if (request.studentID == req.user._id) {
				request.status = StoreRequestStatus.CANCELLED;
			} else {
				let permissions = await getStorePerms(store, req.user);
				if (!permissions.manage)
					return res.status(403).send('Forbidden');

				request.status = StoreRequestStatus.DENIED;
			}

			req.user.balance += request.price;
			await req.user.save();

			if (typeof item.quantity === 'number') {
				item.quantity += request.quantity ?? 1;
			}

			await item.save();

			await Transaction.deleteOne({_id: request.transactionID});

			await request.save();
			res.status(200).json(await request.toAPIResponse());
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
