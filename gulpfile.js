const gulp = require('gulp');

//Node js modules
const fs = require('fs');
const rimraf = require('rimraf');

//Gulp modules
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const zip = require('gulp-zip');

const packageInfo = require('./package.json');

gulp.task('clear-dest', (done) => {
  rimraf.sync('dest/');
  done();
});

gulp.task('create-dest', (done) => {
  fs.mkdirSync("dest");
  done();
});

gulp.task('build:pre', gulp.series('clear-dest', 'create-dest'));

gulp.task('build:js', () => {
  const text = fs.readFileSync("src/manifest.json").toString('utf-8');
  const files = JSON.parse(text).background.scripts;

  for(let i = 0; i < files.length; i++)
    files[i] = "src/" + files[i];

  return gulp.src(files)
    .pipe(concat('background.js'))
    .pipe(minify())
    .pipe(gulp.dest('dest/js'));
});

gulp.task('build:copy', () => {
  return gulp.src('src/!(js)/**/*')
    .pipe(gulp.dest('dest/'));
});

gulp.task('build:manifest', (done) => {
  const text = fs.readFileSync("src/manifest.json").toString('utf-8');
  let manifest = JSON.parse(text);
  manifest.background.scripts = ['js/background-min.js'];
  fs.writeFileSync('dest/manifest.json', JSON.stringify(manifest));
  done();
});

gulp.task('build:dest', gulp.series(gulp.parallel('build:js', 'build:copy'), 'build:manifest'));

gulp.task('build:zip', () => {
  return gulp.src('dest/**/*')
    .pipe(zip(packageInfo.name + '_' + packageInfo.version + '.zip'))
    .pipe(gulp.dest('build/'));
})

gulp.task('build', gulp.series('build:pre', 'build:dest'), 'build:zip');
gulp.task('default', gulp.series('build'));