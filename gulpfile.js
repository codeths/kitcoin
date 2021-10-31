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
	return new Promise((resolve, reject) => t.on('end', resolve));
}

function delDist() {
	return del('dist');
}

function typescript() {
	return exec('npm run tsc');
}

function copy(path) {
	return gulp
		.src(path || ['src/**/*.*', '!src/**/*.ts'], {
			base: 'src',
		})
		.pipe(gulp.dest('dist'));
}

function frontend() {
	return exec('npm run build --prefix frontend');
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
				await (['ts'].some(x => fileName.endsWith(`.${x}`))
					? typescript()
					: task(copy(fileName))),
					console.log(`${fileName} done.`);
				node();
			},
		);

		gulp.watch([
			'frontend/**/*',
			'!frontend/build/**/*',
			'!frontend/.routify/**/*',
			'!**/node_modules/**/*',
		]).on('change', async function (fileName) {
			console.log(`${fileName} changed.`);
			await frontend();
			console.log(`${fileName} done.`);
			node();
		});
	}

	var rl = readline.createInterface({input: process.stdin});
	rl.on('line', async line => {
		line = line.toLowerCase();
		if (['rs', 'restart', 'node'].includes(line)) {
			console.log('Restarting node');
			node();
		} else if (['build', 'gulp'].includes(line)) {
			console.log('Rebuilding');
			await delDist();
			await typescript();
			await frontend();
			await task(copy());
			node();
			console.log('Done');
		} else if (['ts', 'typescript'].includes(line)) {
			console.log('Rebuilding typescript');
			await typescript();
			node();
			console.log('Done');
		} else if (['copy', 'cp'].includes(line)) {
			console.log('Copying');
			await task(copy());
			node();
			console.log('Done');
		} else if (['frontend', 'fe'].includes(line)) {
			console.log('Rebuilding frontend');
			await frontend();
			node();
			console.log('Done');
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
	nodeProcess = spawn('node', ['.']);

	nodeProcess.stdout.setEncoding('utf8');
	nodeProcess.stdout.on('data', function (data) {
		console.log(data);
	});

	nodeProcess.stderr.setEncoding('utf8');
	nodeProcess.stderr.on('data', function (data) {
		console.log(data);
	});
}

process.on('exit', function () {
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
});
