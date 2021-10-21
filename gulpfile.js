const gulp = require('gulp');
const ts = require('gulp-typescript');
const del = require('del');
const promisify = require('util').promisify;
const exec = promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('readline');

gulp.task('default', async () => {
	await delDist();
	await task(typescript());
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
	await task(typescript());
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

function typescript(path) {
	const tsProject = ts.createProject('tsconfig.json');

	return gulp
		.src(path || ['src/**/*.ts'], {
			base: 'src',
		})
		.pipe(tsProject())
		.on('error', () => {})
		.pipe(gulp.dest('dist'));
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

gulp.task('watch', async () => {
	dev(true);
});

gulp.task('dev', async () => {
	dev(false);
});

function dev(watch) {
	node();
	if (watch) {
		gulp.watch(['src/**/*', '!**/node_modules/**/*']).on(
			'change',
			async function (fileName) {
				console.log(`${fileName} changed.`);
				await task(
					['ts'].some(x => fileName.endsWith(`.${x}`))
						? typescript(fileName)
						: copy(fileName),
				);
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

	console.log('Node started');

	var rl = readline.createInterface({input: process.stdin});
	rl.on('line', async line => {
		line = line.toLowerCase();
		if (['rs', 'restart', 'node'].includes(line)) {
			console.log('Restarting node');
			node();
		} else if (['build', 'gulp'].includes(line)) {
			console.log('Rebuilding');
			await delDist();
			await task(typescript());
			await frontend();
			await task(copy());
			node();
			console.log('Done');
		} else if (['ts', 'typescript'].includes(line)) {
			console.log('Rebuilding typescript');
			await task(typescript());
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
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
	nodeProcess = spawn('node', ['.']);
}

process.on('exit', function () {
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
});
