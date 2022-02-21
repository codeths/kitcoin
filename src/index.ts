import {gadmin_sync_user} from './config/keys.json';
import {AdminClient} from './helpers/admin';

// Start webserver
import './webserver';

// Start user sync
if (gadmin_sync_user) {
	new AdminClient().startDailySyncs(gadmin_sync_user);
}
