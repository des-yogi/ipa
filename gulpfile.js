'use strict';

// Подключения зависимостей
const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const realFavicon = require ('gulp-real-favicon');

const postcss = require('gulp-postcss');
const removeComments = require('postcss-discard-comments');
const autoprefixer = require("autoprefixer");
const mqpacker = require("css-mqpacker");
const atImport = require("postcss-import");
const csso = require('gulp-csso');
const inlineSVG = require('postcss-inline-svg');
const objectFitImages = require('postcss-object-fit-images');

const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const gulpIf = require('gulp-if');
const debug = require('gulp-debug');
const rename = require('gulp-rename');
const size = require('gulp-size');
const del = require('del');
const newer = require('gulp-newer');

// Получение настроек проекта из projectConfig.json
let projectConfig = require('./projectConfig.json');
let dirs = projectConfig.dirs;
let lists = getFilesList(projectConfig);
// console.log(lists);

// Получение адреса репозитория
let repoUrl = require('./package.json').repository.url.replace(/\.git$/g, '');
// console.log(repoUrl);

// файл с настройками фавиконок
const faviconData = './faviconData.json';

// Формирование и запись диспетчера подключений (style.scss), который компилируется в style.min.css
let styleImports = '/*!*\n * ВНИМАНИЕ! Этот файл генерируется автоматически.\n * Не пишите сюда ничего вручную, все такие правки будут потеряны.\n * Читайте ./README.md для понимания.\n */\n\n';
lists.css.forEach(function(blockPath) {
  styleImports += '@import \''+blockPath+'\';\n';
});
fs.writeFileSync(dirs.srcPath + 'scss/style.scss', styleImports);

// Определение: разработка это или финальная сборка
// Запуск `NODE_ENV=production npm start [задача]` приведет к сборке без sourcemaps
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'dev';

// Перечисление и настройки плагинов postCSS, которыми обрабатываются стилевые файлы
let postCssPlugins = [
  autoprefixer({ grid: 'no-autoplace' }), // настройки вынесены в package.json, дабы получать их для любой задачи
  mqpacker({
    sort: true
  }),
  atImport(),
  inlineSVG(),
  objectFitImages(),
];

let discardComments = [
  removeComments(),
]

// Очистка папки сборки
gulp.task('clean', function () {
  console.log('---------- Очистка папки сборки');
  return del([
    dirs.buildPath + '/**/*',
    '!' + dirs.buildPath + '/readme.md'
  ]);
});

// Компиляция стилей блоков проекта (и добавочных)
gulp.task('style', function () {
  const sass = require('gulp-sass')(require('node-sass'));
  const sourcemaps = require('gulp-sourcemaps');
  const wait = require('gulp-wait');
  console.log('---------- Компиляция стилей');
  return gulp.src(dirs.srcPath + 'scss/style.scss')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'Styles compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(wait(100))
    .pipe(gulpIf(isDev, sourcemaps.init()))
    .pipe(debug({title: "Style:"}))
    .pipe(sass())
    .pipe(postcss(postCssPlugins))
    .pipe(gulpIf(isDev,
      postcss(discardComments)
    ))
    .pipe(gulpIf(!isDev,
      csso({
        restructure: false,
      })
    ))
    .pipe(rename('style.min.css'))
    .pipe(gulpIf(isDev, sourcemaps.write('/')))
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/css'))
    .pipe(browserSync.stream());
});

// Компиляция отдельных файлов
gulp.task('style:single', function (callback) {
  if(projectConfig.singleCompiled.length) {
    const sass = require('gulp-sass')(require('node-sass'));
    const sourcemaps = require('gulp-sourcemaps');
    const wait = require('gulp-wait');
    console.log('---------- Компиляция добавочных стилей');
    return gulp.src(projectConfig.singleCompiled)
      .pipe(plumber({
        errorHandler: function(err) {
          notify.onError({
            title: 'Single style compilation error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))
      .pipe(wait(100))
      .pipe(gulpIf(isDev, sourcemaps.init()))
      .pipe(debug({title: "Single style:"}))
      .pipe(sass())
      .pipe(postcss(postCssPlugins))
      .pipe(gulpIf(!isDev,
        csso({
          restructure: false,
        })
      ))
      .pipe(gulpIf(isDev, sourcemaps.write('/')))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/css'))
      .pipe(browserSync.stream());
  }
  else {
    callback();
  }
});

// Копирование добавочных CSS, которые хочется иметь отдельными файлами
gulp.task('copy:css', function(callback) {
  if(projectConfig.copiedCss.length) {
    return gulp.src(projectConfig.copiedCss)
      .pipe(postcss(postCssPlugins))
      .pipe(csso({
        restructure: false,
      }))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/css'))
      .pipe(browserSync.stream());
  }
  else {
    callback();
  }
});

// Копирование изображений
gulp.task('copy:img', function () {
  console.log('---------- Копирование изображений');
  return gulp.src(lists.img)
    .pipe(newer(dirs.buildPath + '/img'))  // оставить в потоке только изменившиеся файлы
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/img'));
});

// Копирование JS
gulp.task('copy:js', function (callback) {
  if(projectConfig.copiedJs.length) {
    return gulp.src(projectConfig.copiedJs)
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/js'));
  }
  else {
    callback();
  }
});

// Копирование шрифтов
gulp.task('copy:fonts', function () {
  console.log('---------- Копирование шрифтов');
  return gulp.src(dirs.srcPath + '/fonts/*.{ttf,woff,woff2,eot,svg}')
    .pipe(newer(dirs.buildPath + '/fonts'))  // оставить в потоке только изменившиеся файлы
    .pipe(size({
      title: 'Размер',
      showFiles: true,
      showTotal: false,
    }))
    .pipe(gulp.dest(dirs.buildPath + '/fonts'));
});

// Генератор фавиконок
gulp.task('favicons', function(done) {
  realFavicon.generateFavicon({
    masterPicture: dirs.srcPath + '/img/favicon-lg.png',
    dest: dirs.buildPath + '/img',
    iconsPath: '/img',
    design: {
      ios: {
        pictureAspect: 'backgroundAndMargin',
        backgroundColor: '#ffffff',
        margin: '14%',
        assets: {
          ios6AndPriorIcons: false,
          ios7AndLaterIcons: false,
          precomposedIcons: false,
          declareOnlyDefaultIcon: true
        }
      },
      desktopBrowser: {},
      windows: {
        pictureAspect: 'noChange',
        backgroundColor: '#ffffff',
        onConflict: 'override',
        assets: {
          windows80Ie10Tile: false,
          windows10Ie11EdgeTiles: {
            small: false,
            medium: true,
            big: false,
            rectangle: false
          }
        }
      },
      androidChrome: {
        pictureAspect: 'noChange',
        themeColor: '#ffffff',
        manifest: {
          display: 'standalone',
          orientation: 'notSet',
          onConflict: 'override',
          declared: true
        },
        assets: {
          legacyIcon: false,
          lowResolutionIcons: false
        }
      },
      safariPinnedTab: {
        pictureAspect: 'silhouette',
        themeColor: '#ffffff'
      }
    },
    settings: {
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false
    },
    markupFile: faviconData
  }, function() {
    done();
  });
});

// Ручная проверка актуальности данных для favicon. Запускать перед стартом нового проекта.
gulp.task('check:favicons:update', function(done) {
  var currentVersion = JSON.parse(fs.readFileSync(faviconData)).version;
  realFavicon.checkForUpdates(currentVersion, function(err) {
    if (err) {
      throw err;
    }
  });
});

// Сборка SVG-спрайта для блока sprite-svg
let spriteSvgPath = dirs.srcPath + dirs.blocksDirName + '/sprite-svg/svg/';
gulp.task('sprite:svg', function (callback) {
  if((projectConfig.blocks['sprite-svg']) !== undefined) {
    const svgstore = require('gulp-svgstore');
    const svgmin = require('gulp-svgmin');
    const cheerio = require('gulp-cheerio');
    if(fileExist(spriteSvgPath) !== false) {
      console.log('---------- Сборка SVG спрайта');
      return gulp.src(spriteSvgPath + '*.svg')
        .pipe(svgmin(function (file) {
          return {
            plugins: [{
              name: 'cleanupIDs',
              params: {
                minify: true,
              },
            }]
          }
        }))
        .pipe(svgstore({ inlineSvg: true }))
        .pipe(cheerio({
          run: function($) {
            $('svg').attr('style',  'display:none');
          },
          parserOptions: {
            xmlMode: true
          }
        }))
        .pipe(rename('sprite-svg.svg'))
        .pipe(size({
          title: 'Размер',
          showFiles: true,
          showTotal: false,
        }))
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-svg/img/'));
    }
    else {
      console.log('---------- Сборка SVG спрайта: ОТМЕНА, нет папки с картинками');
      callback();
    }
  }
  else {
    console.log('---------- Сборка SVG спрайта: ОТМЕНА, блок не используется на проекте');
    callback();
  }
});

// Сборка растрового спрайта для блока sprite-png
let spritePngPath = dirs.srcPath + dirs.blocksDirName + '/sprite-png/png/';
gulp.task('sprite:png', function (callback) {
  if((projectConfig.blocks['sprite-png']) !== undefined) {
    const spritesmith = require('gulp.spritesmith');
    const buffer = require('vinyl-buffer');
    const merge = require('merge-stream');
    const imagemin = require('gulp-imagemin');
    const pngquant = require('imagemin-pngquant');
    if(fileExist(spritePngPath) !== false) {
      del(dirs.srcPath + dirs.blocksDirName + '/sprite-png/img/*.png');
      let fileName = 'sprite-' + Math.random().toString().replace(/[^0-9]/g, '') + '.png';
      let spriteData = gulp.src(spritePngPath + '*.png')
        .pipe(spritesmith({
          imgName: fileName,
          cssName: 'sprite-png.scss',
          padding: 4,
          imgPath: '../img/' + fileName
        }));
      let imgStream = spriteData.img
        .pipe(buffer())
        .pipe(imagemin({
          use: [pngquant()]
        }))
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-png/img/'));
      let cssStream = spriteData.css
        .pipe(gulp.dest(dirs.srcPath + dirs.blocksDirName + '/sprite-png/'));
      return merge(imgStream, cssStream);
    }
    else {
      console.log('---------- Сборка PNG спрайта: ОТМЕНА, нет папки с картинками');
      callback();
    }
  }
  else {
    console.log('---------- Сборка PNG спрайта: ОТМЕНА, блок не используется на проекте');
    callback();
  }
});

// Сборка HTML
gulp.task('html', function() {
  const fileinclude = require('gulp-file-include');
  const replace = require('gulp-replace');
  console.log('---------- сборка HTML');
  return gulp.src(dirs.srcPath + '/*.html')
    .pipe(plumber({
      errorHandler: function(err) {
        notify.onError({
          title: 'HTML compilation error',
          message: err.message
        })(err);
        this.emit('end');
      }
    }))
    .pipe(fileinclude({
      prefix: '@@',
      basepath: '@file',
      indent: true,
    }))
    .pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(faviconData)).favicon.html_code))
    .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
    .pipe(gulp.dest(dirs.buildPath));
});

// Конкатенация и углификация Javascript
gulp.task('js', function (callback) {
  const uglify = require('gulp-uglify');
  const concat = require('gulp-concat');
  if(lists.js.length > 0){
    console.log('---------- Обработка JS');
    return gulp.src(lists.js)
      .pipe(plumber({
        errorHandler: function(err) {
          notify.onError({
            title: 'Javascript concat/uglify error',
            message: err.message
          })(err);
          this.emit('end');
        }
      }))
      .pipe(babel())
      .pipe(concat('script.min.js'))
      .pipe(gulpIf(!isDev, uglify().on('error', function(e){console.log(e);})))
      .pipe(size({
        title: 'Размер',
        showFiles: true,
        showTotal: false,
      }))
      .pipe(gulp.dest(dirs.buildPath + '/js'));
  }
  else {
    console.log('---------- Обработка JS: в сборке нет JS-файлов');
    callback();
  }
});

// Ручная оптимизация изображений
// Использование: folder=src/img npm start img:opt
const folder = process.env.folder;
gulp.task('img:opt', function (callback) {
  const imagemin = require('gulp-imagemin');
  const pngquant = require('imagemin-pngquant');
  if(folder){
    console.log('---------- Оптимизация картинок');
    return gulp.src(folder + '/*.{jpg,jpeg,gif,png,svg}')
      .pipe(imagemin({
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngquant({quality: 85})]
      }))
      .pipe(gulp.dest(folder));
  }
  else {
    console.log('---------- Оптимизация картинок: ошибка (не указана папка)');
    console.log('---------- Пример вызова команды: folder=src/blocks/block-name/img npm start img:opt');
    callback();
  }
});

// Сборка всего новая под gulp 4
gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('sprite:svg', 'sprite:png', 'favicons'),
  gulp.parallel('style', 'style:single', 'js', 'copy:css', 'copy:img', 'copy:js', 'copy:fonts'),
  'html'
));

// Отправка в GH pages (ветку gh-pages репозитория)
gulp.task('deploy', function() {
  const ghPages = require('gulp-gh-pages');
  console.log('---------- Публикация содержимого ./build/ на GH pages');
  var ghPagesUrl;
  if (repoUrl) {
    var urlParts = repoUrl.split('/');
    if (urlParts[2] == 'github.com') {
      ghPagesUrl = 'http://' + urlParts[3] + '.github.io/' + urlParts[4] + '/';
    }
    console.log('---------- ' + ghPagesUrl);

  }
  return gulp.src(dirs.buildPath + '**/*')
    .pipe(ghPages());
});

// Задача по умолчанию
// Локальный сервер, слежение
gulp.task('serve', gulp.series('build', function() {

  browserSync.init({
    server: dirs.buildPath,
    port: 3000,
    startPath: 'index.html',
    open: true,
  });

  // Стили
  let stylePaths = [
    dirs.srcPath + 'scss/style.scss',
    dirs.srcPath + 'scss/variables.scss',
    dirs.srcPath + 'scss/mixins/*.scss',
  ];
  for (let i = 0, len = lists.blocksDirs.length; i < len; ++i) {
    stylePaths.push(dirs.srcPath + lists.blocksDirs[i] + '*.scss');
  }
  stylePaths.concat(projectConfig.addCssBefore, projectConfig.addCssAfter);
  // console.log(stylePaths);
  gulp.watch(stylePaths, gulp.series('style'));

  // Стили, которые нужно компилировать отдельно
  if(projectConfig.singleCompiled.length) {
    gulp.watch(projectConfig.singleCompiled, gulp.series('style:single'));
  }

  // CSS-файлы, которые нужно просто копировать
  if(projectConfig.copiedCss.length) {
    gulp.watch(projectConfig.copiedCss, gulp.series('copy:css', reload));
  }

  // Изображения
  if(lists.img.length) {
    gulp.watch(lists.img, gulp.series('copy:img', reload));
  }

  // JS-файлы, которые нужно просто копировать
  if(projectConfig.copiedJs.length) {
    gulp.watch(projectConfig.copiedJs, gulp.series('copy:js', reload));
  }

  // Шрфты
  gulp.watch(dirs.srcPath + 'fonts/*.{ttf,woff,woff2,eot,svg}', gulp.series('copy:fonts', reload));

  // Слежение за html
  gulp.watch([
    '*.html',
    '_include/*.html',
    dirs.blocksDirName + '/**/*.html'
  ], {cwd: dirs.srcPath}, gulp.series('html', reload));

  // JS-файлы блоков
  if(lists.js.length) {
    gulp.watch(lists.js, {allowEmpty: true}, gulp.series('js', reload));
  }

  // SVG-изображения, попадающие в спрайт
  if((projectConfig.blocks['sprite-svg']) !== undefined) {
    gulp.watch('*.svg', {cwd: spriteSvgPath}, gulp.series('sprite:svg', reload));
  }

  // PNG-изображения, попадающие в спрайт
  if((projectConfig.blocks['sprite-png']) !== undefined) {
    gulp.watch('*.png', {cwd: spritePngPath}, gulp.series('sprite:png', reload));
  }

}));

gulp.task('default',
  gulp.series('serve')
);


/**
 * Вернет объект с обрабатываемыми файлами и папками
 * @param  {object}
 * @return {object}
 */
function getFilesList(config){

  let res = {
    'css': [],
    'js': [],
    'img': [],
    'blocksDirs': [],
  };

  // Обходим массив с блоками проекта
  for (let blockName in config.blocks) {
    var blockPath = config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/';

    if(fileExist(blockPath)) {

      // Стили
      if(fileExist(blockPath + blockName + '.scss')){
        res.css.push(blockPath + blockName + '.scss');
        if(config.blocks[blockName].length) {
          config.blocks[blockName].forEach(function(elementName) {
            if(fileExist(blockPath + blockName + elementName + '.scss')){
              res.css.push(blockPath + blockName + elementName + '.scss');
            }
          });
        }
      }
      else {
        console.log('---------- Блок ' + blockName + ' указан как используемый, но не имеет scss-файла.');
      }

      // Скрипты
      if(fileExist(blockPath + blockName + '.js')){
        res.js.push(blockPath + blockName + '.js');
        if(config.blocks[blockName].length) {
          config.blocks[blockName].forEach(function(elementName) {
            if(fileExist(blockPath + blockName + elementName + '.js')){
              res.js.push(blockPath + blockName + elementName + '.js');
            }
          });
        }
      }
      else {
        // console.log('---------- Блок ' + blockName + ' указан как используемый, но не имеет JS-файла.');
      }

      // Картинки (тупо от всех блоков, без проверки)
      res.img.push(config.dirs.srcPath + config.dirs.blocksDirName + '/' + blockName + '/img/*.{jpg,jpeg,gif,png,webp,svg}');

      // Список директорий
      res.blocksDirs.push(config.dirs.blocksDirName + '/' + blockName + '/');

    }
    else {
      console.log('ERR ------ Блок ' + blockPath + ' указан как используемый, но такой папки нет!');
    }

  }

  // Добавления
  res.css = res.css.concat(config.addCssAfter);
  res.css = config.addCssBefore.concat(res.css);
  res.js = res.js.concat(config.addJsAfter);
  res.js = config.addJsBefore.concat(res.js);
  res.img = config.addImages.concat(res.img);

  return res;
}

/**
 * Проверка существования файла или папки
 * @param  {string} path      Путь до файла или папки]
 * @return {boolean}
 */

function fileExist(filepath){
  let flag = true;
  try{
    fs.accessSync(filepath, fs.F_OK);
  }catch(e){
    flag = false;
  }
  return flag;
}

// Перезагрузка браузера
function reload (done) {
  browserSync.reload();
  done();
}
