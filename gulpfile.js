const gulp = require('gulp');
const fs = require('fs');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const rimraf = require('rimraf');

gulp.task('build:pre', (done) => {
  rimraf.sync('dist/');
  fs.mkdirSync("dist");
  done();
});

gulp.task('build:js', (done) => {
  const text = fs.readFileSync("src/manifest.json").toString('utf-8');
  const files = JSON.parse(text).background.scripts;

  for(let i = 0; i < files.length; i++)
    files[i] = "src/" + files[i];

  gulp.src(files)
    .pipe(concat('background.js'))
    .pipe(minify())
    .pipe(gulp.dest('dist/js'));
  done();
});

gulp.task('build:copy', (done) => {
  gulp.src('src/!(js)/**/*')
    .pipe(gulp.dest('dist/'));
  done();
});

gulp.task('build:manifest', (done) => {
  const text = fs.readFileSync("src/manifest.json").toString('utf-8');
  let manifest = JSON.parse(text);
  manifest.background.scripts = ['js/background-min.js'];
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest));
  done();
});

gulp.task('build', gulp.series('build:pre', gulp.parallel('build:js', 'build:copy'), 'build:manifest'));
gulp.task('default', gulp.series('build'));