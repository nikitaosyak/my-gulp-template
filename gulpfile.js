const fs = require('fs')
const config = JSON.parse(fs.readFileSync("./config.json", {encoding:'utf-8'}))

const {src, watch, dest, series, parallel, task} = require('gulp')

const clean = cb=>require('rimraf')('build/', cb)
const create_build_dir = cb => fs.mkdir('build', cb)

const rollup = () => {
    const sourcemaps = require('gulp-sourcemaps')
    const rollupTool = require('gulp-better-rollup')
    const {babel} = require('@rollup/plugin-babel')
    // console.log(babel)
    return src('src/main.js')
        .pipe(sourcemaps.init())
        .pipe(rollupTool({plugins: [babel({
                babelrc: false,
                presets: [['@babel/preset-env']],
                babelHelpers : 'bundled'
                // plugins: ['@babel/plugin-proposal-class-properties']
            }),
                require('@rollup/plugin-node-resolve')(),
                require('@rollup/plugin-commonjs')]}, {format: 'cjs', strict: false}))
        .pipe(sourcemaps.write())
        .pipe(require('gulp-rename')('bundle.js'))
        .pipe(dest('build'))
}

const deploy_html = () => src('./index.html').pipe(dest('./build'))
const deploy_assets = () => src('./assets/**/*').pipe(dest('./build/assets/'))
const deploy_favicon = () => src('./favicon/**/*').pipe(dest('./build/'))
const deploy_styles = () => {
    const filter = require('gulp-filter')('**/*.styl', {restore: true})

    return src(['css/styles.styl'])
        .pipe(filter)
        .pipe(require('gulp-stylus')())
        .pipe(filter.restore)
        .pipe(require('gulp-concat')('styles.css'))
        .pipe(dest('build'))
}

const connect = require('gulp-connect')
const dev_server = cb => {
    connect.server({
        root : 'build',
        host : config[config.MODE].HOST,
        port : config[config.MODE].PORT,
        livereload : true,
        debug : true
    })
    cb()
}
const dev_server_reload = () => src('build/index.html', {read:false}).pipe(connect.reload())

const watch_all = cb => {
    watch('./src/**/*.js', series(rollup, dev_server_reload))
    watch(['./index.html'], series(deploy_html, dev_server_reload))
    watch(['./favicon/**/*'], series(deploy_favicon, dev_server_reload))
    watch('css/**/*.styl', series(deploy_styles, dev_server_reload))
    watch('assets/**/*', series(deploy_assets, dev_server_reload))
    cb()
}

exports.default = series(
    clean,
    create_build_dir,
    parallel(rollup, deploy_html, deploy_assets, deploy_styles, deploy_favicon, dev_server),
    watch_all
)