const gulp = require('gulp');
const del = require('del');
const shell = require("gulp-shell");

const pkgPaths=[
    'README.md', 'LICENSE', 'package.json',
    'build/src/**/*.js', 'build/src/**/*.ts'
];

function patchVersion(){
    return gulp.src("package.json",{read:false})
        .pipe(shell("npm version patch"));
}

function clean(){
    return del(["dist/**","build/**"]);
}

function compile(){
    return gulp.src("package.json",{read:false})
        .pipe(shell("npm run compile"));
}

function build(){
    return gulp.src(pkgPaths).pipe(gulp.dest('dist'));
}

function publish() {
    return gulp.src("package.json", { read: false })
        .pipe(shell([
            "cd ./dist && npm publish --registry=https://registry.npmjs.org"
        ]));
}

function publishNext() {
    return gulp.src("package.json", { read: false })
        .pipe(shell([
            "cd ./dist && npm publish --tag next --registry=https://registry.npmjs.org"
        ]));
}

exports=module.exports={
    clean,compile,build,
    publish,publishNext,
    patchVersion
}

gulp.task('default',gulp.series(clean,compile,build));