import mongoose from 'mongoose';

import {gadmin_sync_user, mongo} from './config/keys.js';
import {AdminClient} from './helpers/admin.js';

// Start webserver
import './webserver/index.js';

// Start user sync
let user = gadmin_sync_user as string | null;
if (typeof user == 'string') {
	try {
		new AdminClient().startDailySyncs(user);
	} catch (e) {}
}

mongoose.connect(mongo);
