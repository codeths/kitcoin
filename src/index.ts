import {gadmin_sync_user} from './config/keys.json';
import {AdminClient} from './helpers/admin';
import {User} from './helpers/schema';

// Start webserver
import './webserver';

// Start user sync
if (gadmin_sync_user) {
	User.findById(gadmin_sync_user).then(user => {
		if (user) new AdminClient().startDailySyncs(user);
	});
}
