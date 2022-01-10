const gulp = require('gulp');
const del = require('del');
const promisify = require('util').promisify;
const exec = promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('readline');
const fs = require('fs');
let args = process.argv.slice(2);
let env = process.env.NODE_ENV || 'development';

function getEnv() {
	if (args.includes('--production')) env = 'production';
	else if (args.includes('--dev')) env = 'development';
}

gulp.task('default', async () => {
	getEnv();
	await full();
	return;
});

gulp.task('copy', async () => {
	getEnv();
	await task(copy());
	return;
});

gulp.task('clear', async () => {
	getEnv();
	await delDist();
	return;
});

gulp.task('typescript', async () => {
	getEnv();
	await typescript();
	return;
});

gulp.task('frontend', async () => {
	getEnv();
	await frontend();
	return;
});

gulp.task('icons', async () => {
	getEnv();
	await icons();
	return;
});

gulp.task('uploads', async () => {
	getEnv();
	uploads();
	return;
});

function task(t) {
	return new Promise((resolve, reject) =>
		t
			.on('end', () => resolve(true))
			.on('error', e => console.error(e) && resolve(false)),
	);
}

function delDist() {
	return del('dist');
}

async function typescript() {
	return new Promise(res => {
		let child = spawn('tsc', [], {
			stdio: 'inherit',
		});
		child.on('exit', code => res(code === 0));
	});
}

function copy(path) {
	return gulp
		.src(path || ['src/**/*.*', '!src/**/*.ts'], {
			base: 'src',
		})
		.pipe(gulp.dest('dist'));
}

async function frontend() {
	return new Promise(res => {
		let child = spawn(
			'npm',
			[
				'run',
				env == 'production' ? 'build' : 'build:dev',
				'--prefix',
				'frontend',
			],
			{
				stdio: 'inherit',
			},
		);
		child.on('exit', code => res(code === 0));
	});
}

async function icons() {
	return new Promise(res => {
		let child = spawn('npm', ['run', 'icons', '--prefix', 'frontend'], {
			stdio: 'inherit',
		});
		child.on('exit', code => res(code === 0));
	});
}

function uploads() {
	if (!fs.existsSync('./uploads')) {
		fs.mkdirSync('./uploads');
	}
	['storeitems'].forEach(x => {
		if (!fs.existsSync(`./uploads/${x}`)) {
			fs.mkdirSync(`./uploads/${x}`);
		}
	});
	return true;
}

async function full() {
	let res =
		uploads() &&
		(await delDist()) &&
		(await typescript()) &&
		(await icons()) &&
		(await task(copy()));
	return res;
}

gulp.task('dev', async () => {
	getEnv();
	dev();
});

function dev() {
	node();
	if (args.includes('--watch')) {
		gulp.watch(['src/**/*', '!**/node_modules/**/*']).on(
			'change',
			async function (fileName) {
				console.log(`${fileName} changed.`);
				let res = await (['ts'].some(x => fileName.endsWith(`.${x}`))
					? typescript()
					: task(copy(fileName)));
				if (res) {
					console.log(`${fileName} done.`);
					node();
				} else {
					console.log(`${fileName} failed.`);
				}
			},
		);

		gulp.watch([
			'frontend/**/*',
			'!frontend/build/**/*',
			'!frontend/public/assets/icons.ttf',
			'!frontend/public/assets/icons.css',
			'!frontend/.routify/**/*',
			'!**/node_modules/**/*',
		]).on('change', async function (fileName) {
			console.log(`${fileName} changed.`);
			let res = await (fileName.startsWith(
				'frontend/public/assets/icons/',
			) || fileName == 'fantasticonrc.js'
				? icons
				: frontend)();
			if (res) {
				console.log(`${fileName} done.`);
			} else {
				console.log(`${fileName} failed.`);
			}
		});
	}

	var rl = readline.createInterface({
		input: process.stdin,
	});
	rl.on('line', async line => {
		line = line.toLowerCase().replace(/\s/g, '');
		if (!line) return;

		if (['rs', 'restart', 'node'].includes(line)) {
			console.log('Restarting node');
			node();
		} else if (['build', 'gulp'].includes(line)) {
			console.log('Rebuilding');
			let res = await full();
			if (res) {
				console.log(`Done`);
				node();
			} else {
				console.log(`Failed`);
			}
		} else if (['ts', 'typescript'].includes(line)) {
			console.log('Rebuilding typescript');
			let res = await typescript();
			if (res) {
				console.log(`Done`);
				node();
			} else {
				console.log(`Failed`);
			}
		} else if (['copy', 'cp'].includes(line)) {
			console.log('Copying');
			let res = await task(copy());
			if (res) {
				console.log(`Done`);
				node();
			} else {
				console.log(`Failed`);
			}
		} else if (['frontend', 'fe'].includes(line)) {
			console.log('Rebuilding frontend');
			let res = await frontend();
			if (res) {
				console.log(`Done`);
			} else {
				console.log(`Failed`);
			}
		} else if (['icon', 'icons'].includes(line)) {
			console.log('Rebuilding icons');
			let res = await icons();
			if (res) {
				console.log(`Done`);
			} else {
				console.log(`Failed`);
			}
		} else if (
			['stop', 'abort', 'close', 'cancel', 'exit'].includes(line)
		) {
			process.exit();
		} else {
			console.log('Unknown command.');
		}
	});
}

let nodeProcess = null;

function node() {
	if (args.includes('--no-run')) return;
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	} else {
		console.log('Node started');
	}
	if (fs.existsSync('dist/index.js')) {
		nodeProcess = spawn('node', ['.'], {
			stdio: 'inherit',
		});
	}
}

process.on('exit', function () {
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
});
