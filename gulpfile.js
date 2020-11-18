const run = require('gulp-run');
const gulp = require('gulp');

function pkgCreate(cb) {
    return run('pkg --out-path .\\dist .').exec();
}
function copyConfig(cb) {
    return gulp
        .src('config.json')
        .pipe(gulp.dest('dist/'))
}
function copyNodePlugins(cb){
    return gulp
        .src('node_modules/node-expat/build/Release/node_expat.node')
        .pipe(gulp.src('node_modules/iconv/build/Release/iconv.node'))
        .pipe(gulp.dest('dist/'))
}

exports.default = gulp.parallel(pkgCreate,copyNodePlugins,copyConfig)