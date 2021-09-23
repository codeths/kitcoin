const gulp = require('gulp');
const ts = require('gulp-typescript');

gulp.task('default', async () => {
	await task(typescript());
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

function task(t) {
	return new Promise((resolve, reject) => t.on('end', resolve));
}

function typescript(path) {
	const tsProject = ts.createProject('tsconfig.json');

	return gulp
		.src(path || 'src/**/*.ts', {
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

gulp.task('watch', async () => {
	await task(typescript());
	await task(copy());
	return gulp.watch(['src/**/*']).on('change', async function (fileName) {
		console.log(`${fileName} changed.`);
		await task(
			['ts'].some(x => fileName.endsWith(`.${x}`))
				? typescript(fileName)
				: copy(fileName),
		);
		console.log(`${fileName} copied.`);
	});
});