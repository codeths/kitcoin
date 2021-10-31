const gulp = require('gulp');
const del = require('del');
const promisify = require('util').promisify;
const exec = promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('readline');
let args = process.argv.slice(2);

gulp.task('default', async () => {
	await delDist();
	await typescript();
	await frontend();
	await task(copy());
	return;
});

gulp.task('copy', async () => {
	await task(copy());
	return;
});

gulp.task('clear', async () => {
	await delDist();
	return;
});

gulp.task('typescript', async () => {
	await typescript();
	return;
});

gulp.task('frontend', async () => {
	await frontend();
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
		let child = spawn('npm', ['run', 'build', '--prefix', 'frontend'], {
			stdio: 'inherit',
		});
		child.on('exit', code => res(code === 0));
	});
}

gulp.task('dev', async () => {
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
			'!frontend/.routify/**/*',
			'!**/node_modules/**/*',
		]).on('change', async function (fileName) {
			console.log(`${fileName} changed.`);
			let res = await frontend();
			if (res) {
				console.log(`${fileName} done.`);
				node();
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
			await delDist();
			let res =
				(await typescript()) &&
				(await frontend()) &&
				(await task(copy()));
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
				node();
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
	nodeProcess = spawn('node', ['.'], {
		stdio: 'inherit',
	});
}

process.on('exit', function () {
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
});
