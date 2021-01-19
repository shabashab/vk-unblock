//MODULE IMPORTS

//Node js modules
const gulp    = require('gulp'),
      fs      = require('fs'),
      rm    = require('rimraf');

//Gulp modules
const concat  = require('gulp-concat'),
      minify  = require('gulp-minify'),
      zip     = require('gulp-zip');

const packageInfo = require('./package.json');

const sourceDir   = packageInfo.buildConfig.sourceDir;
const destDir     = packageInfo.buildConfig.destDir;
const buildDir    = packageInfo.buildConfig.buildDir;
const deleteDest  = packageInfo.buildConfig.deleteDest;

//GULP TASKS

//Task that runs before building project
gulp.task('build:pre', (done) => {
  //Delete dest dir recursively
  rm.sync(destDir);
  //Finish task
  done();
});

//Task that builds javascript files and concatenates them in one minified file
gulp.task('build:js', () => {
  //Load manifest file from source directory
  const manifest = require('./' + sourceDir + 'manifest.json');

  //Get js scripts from manifest paths
  const jsScripts = manifest.background.scripts;

  //Add src/ to each script path
  for(let i = 0; i < jsScripts.length; i++)
    jsScripts[i] = sourceDir + jsScripts[i];

  //Load js scripts
  return gulp.src(jsScripts)
    //Concat all scripts into one file in order specified in manifest
    .pipe(concat('background.js'))
    //Minify concatenated file
    .pipe(minify())
    //Output to dest/js folder
    .pipe(gulp.dest(destDir + '/js'));
});

//Task that copies other files into destination directory
gulp.task('build:copy', () => {
  //Load all files from source except ones that are in js/ directory
  return gulp.src(sourceDir + '!(js)/**/*')
    //Output into destination folder
    .pipe(gulp.dest(destDir));
});

//Task that builds the manifest file
gulp.task('build:manifest', (done) => {
  //Load manifest file from src/
  const manifest = require('./' + sourceDir + 'manifest.json');
  //Change manifest background scripts list to one file that we create with build:js task
  manifest.background.scripts = ['js/background-min.js'];
  //Write new manifest.json into destination directory
  fs.writeFileSync(destDir + 'manifest.json', JSON.stringify(manifest));
  //Finish task
  done();
});

//Task that makes a cleanup after building dest directory
gulp.task('build:dest:cleanup', (done) => {
  //Delete non-minified background.js
  fs.unlinkSync(destDir + 'js/background.js');
  //Finish the task
  done();
});

//Task that makes the zip file from the files located in destination directory
gulp.task('build:zip', () => {
  //Load all files from dest directory
  return gulp.src(destDir + '**/*')
    //Pack them into a zip archive
    .pipe(zip(packageInfo.name + '_' + packageInfo.version + '.zip'))
    //Output to build folder
    .pipe(gulp.dest(buildDir));
});

//Task that makes a cleanup after building the project
gulp.task('build:cleanup', (done) => {
  if(deleteDest)
    rm.sync(destDir);

  done();
});

//Task that builds the destination directory
gulp.task(
  'build:dest',
  gulp.series(
    gulp.parallel(
      'build:js',
      'build:copy'),
    'build:manifest',
    'build:dest:cleanup')
);

//Task that builds the project and compresses it into a zip file
gulp.task(
  'build',
  gulp.series(
    'build:pre',
    'build:dest',
    'build:zip',
    'build:cleanup')
);

//Default task that executes build task
gulp.task('default', gulp.series('build'));