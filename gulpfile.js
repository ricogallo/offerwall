var gulp        = require('gulp');
var cleanCSS    = require('gulp-clean-css');
var prefix      = require('gulp-autoprefixer');
var sourcemaps  = require('gulp-sourcemaps');
var uglify      = require('gulp-uglify');
var rename      = require("gulp-rename");
var serve       = require('gulp-serve');


gulp.task('styles', function() {
  return gulp.src('style.css')
    .pipe(prefix({ browsers: ['last 2 versions'] }))
    .pipe(cleanCSS())
    .pipe(rename('style.min.css'))
    .pipe(gulp.dest('bundle'));
});

gulp.task('scripts', function() {
  return gulp.src('script.js')
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(rename('script.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('bundle'));
});

gulp.task('serve', serve('.'));
gulp.task('default', ['scripts', 'styles']);
