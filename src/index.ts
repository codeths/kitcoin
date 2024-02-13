import mongoose from 'mongoose';
import cluster from 'cluster';
import {cpus} from 'os';

import {
	gadmin_sync_user,
	mongo,
	redis_host,
	redis_port,
} from './config/keys.js';
import {AdminClient} from './helpers/admin.js';

import {User} from './struct/index.js';
import {newTransaction, newRequest} from './helpers/email/send.js';
import {Worker} from 'bullmq';

function startSync() {
	let user = gadmin_sync_user as string | null;
	if (typeof user == 'string') {
		try {
			new AdminClient().startDailySyncs(user);
		} catch (e) {}
	}
}

function startServer() {
	import('./webserver/index.js');
}

function startEmailQueue() {
	const worker = new Worker(
		'emails',
		async job => {
			let transactionType = job.name;
			if (transactionType == 'send' || transactionType == 'bulksend') {
				let amount: number = job.data.amount;
				let fromUserID: string = job.data.from.id;
				let toUserID: string = job.data.to.id;
				let message: string = job.data.reason;

				let email = await newTransaction(
					amount,
					fromUserID,
					toUserID,
					message,
				);

				if (!email) {
					console.log('Email could not be sent.');
				}
			} else if (transactionType == 'request') {
				let reqUserID: string = job.data.to.id;
				let store: any = job.data.store;
				let email = await newRequest(reqUserID, store);

				if (!email) {
					console.log('Email could not be sent.');
				}
			}
		},
		{
			connection: {
				host: redis_host,
				port: redis_port,
			},
		},
	);
}

mongoose
	.connect(mongo)
	.then(async () => {
		if (cluster.isPrimary) {
			console.log('RUNNING MIGRATIONS');

			await User.syncIndexes();

			console.log('MIGRATIONS COMPLETE');

			startSync();

			const numClusters =
				parseInt(process.env.CLUSTERS || '0') || cpus().length;
			if (numClusters > 1) {
				for (let i = 0; i < numClusters; i++) {
					cluster.fork();
				}
			} else {
				startServer();
				startEmailQueue();
			}
		} else {
			startServer();
			startEmailQueue();
		}
	})
	.catch(e => {
		console.log('MONGOOSE INITIALIZATION FAILED');
		throw e;
	});
