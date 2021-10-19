const gulp = require('gulp');
const ts = require('gulp-typescript');
const promisify = require('util').promisify;
const exec = promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const readline = require('readline');

gulp.task('default', async () => {
	await task(typescript());
	await frontend();
	await task(copy());
	return;
});

gulp.task('copy', async () => {
	await task(copy());
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

function typescript(path) {
	const tsProject = ts.createProject('tsconfig.json');

	return gulp
		.src(path || ['src/**/*.ts', '!src/frontend/**/*'], {
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
	return exec('npm run build --prefix src/frontend');
}

gulp.task('watch', async () => {
	node();
	gulp.watch(['src/**/*', '!src/frontend/**/*']).on(
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

	gulp.watch(['src/frontend/**/*', '!src/frontend/build/**/*']).on(
		'change',
		async function (fileName) {
			console.log(`${fileName} changed.`);
			await frontend();
			await task(copy('src/frontend/**/*.*'));
			console.log(`${fileName} done.`);
			node();
		},
	);

	console.log('Node started');

	var rl = readline.createInterface({input: process.stdin});
	rl.on('line', async line => {
		line = line.toLowerCase();
		if (['rs', 'restart', 'node'].includes(line)) {
			console.log('Restarting node');
			node();
		} else if (['build', 'gulp'].includes(line)) {
			console.log('Rebuilding');
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
			await task(copy('src/frontend/**/*.*'));
			node();
			console.log('Done');
		} else {
			console.log('Unknown command.');
		}
	});
});

let nodeProcess = null;
function node() {
	if (nodeProcess) {
		nodeProcess.kill('SIGINT');
	}
	nodeProcess = spawn('node', ['.']);
}
