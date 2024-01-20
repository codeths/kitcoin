import fs from 'fs';

interface Keys {
	mongo: string;
	port: number;
	client_id: string;
	client_secret: string;
	oauthDomain: string | null;
	sessionSecret: string;
	weeklyBalance: number;
	gadmin_domain: string | null;
	gadmin_staff_ou: string[] | null;
	gadmin_ignore_ou: string[] | null;
	gadmin_sync_user: string | null;
	sync_spreadsheet_id: string | null;
	redis_host: string;
	redis_port: number;
}

let data = fs.readFileSync(new URL('./keys.json', import.meta.url).pathname);
let json: Keys = JSON.parse(data.toString());

let {
	mongo,
	port,
	client_id,
	client_secret,
	oauthDomain,
	sessionSecret,
	weeklyBalance,
	gadmin_domain,
	gadmin_staff_ou,
	gadmin_ignore_ou,
	gadmin_sync_user,
	sync_spreadsheet_id,
	redis_host,
	redis_port,
} = json;

export {
	mongo,
	port,
	client_id,
	client_secret,
	oauthDomain,
	sessionSecret,
	weeklyBalance,
	gadmin_domain,
	gadmin_staff_ou,
	gadmin_ignore_ou,
	gadmin_sync_user,
	sync_spreadsheet_id,
	redis_host,
	redis_port,
};
