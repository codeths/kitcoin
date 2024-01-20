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
			console.log(job.data);
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
