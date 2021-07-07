const asar = require('asar');
const src = 'G:/GitHub/AdvancedWebArchiver/dist/win-unpacked/resources/app.asar.unpacked';
const dest = 'G:/GitHub/AdvancedWebArchiver/dist/win-unpacked/resources/app.asar';
(async () => {
    await asar.extractAll(dest,src)
    await asar.createPackage(src, dest);
    console.log('done.');
})();