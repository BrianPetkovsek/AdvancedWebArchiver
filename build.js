const asar = require('asar');
const src = './dist/win-unpacked/resources/app.asar.unpacked';
const dest = './dist/win-unpacked/resources/app.asar';
(async () => {
    await asar.extractAll(dest,src);
    await asar.createPackage(src, dest);
    console.log('done.');
})();