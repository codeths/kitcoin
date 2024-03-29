import mongoose from 'mongoose';
import cluster from 'cluster';
import {cpus} from 'os';

import {gadmin_sync_user, mongo} from './config/keys.js';
import {AdminClient} from './helpers/admin.js';

import {User} from './struct/index.js';

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
			}
		} else {
			startServer();
		}
	})
	.catch(e => {
		console.log('MONGOOSE INITIALIZATION FAILED');
		throw e;
	});
