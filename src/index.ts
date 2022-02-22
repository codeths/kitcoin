import mongoose from 'mongoose';

import {gadmin_sync_user, mongo} from './config/keys.json';
import {AdminClient} from './helpers/admin';

// Start webserver
import './webserver';

// Start user sync
let user = gadmin_sync_user as string | null;
if (typeof user == 'string') {
	new AdminClient().startDailySyncs(user);
}

mongoose.connect(mongo);
