
const args = require('args-parser')(process.argv);
const DEBUG = args.DEBUG ? true : false;
const REPLAY = args.REPLAY ? true : false;
const DATAPATH = args.DATAPATH ? args.DATAPATH : 'DATA';
const WEBSITE = args.WEBSITE ? args.WEBSITE : 'https://google.ca';


const puppeteer = require('puppeteer-electron');

require('events').EventEmitter.defaultMaxListeners = 20;
var EventEmitter = require('events').EventEmitter;
var reponseWriter = new EventEmitter();
var pageEmitter = new EventEmitter();
const moment = require ('moment');

var fsPath = require('fs-path');
var counter = 0;
reponseWriter.on('write', data => {
    fsPath.writeFile(DATAPATH+'/'+counter++, encodeURI(data.url)+'\n'+data.timestamp+'\n'+ data.responseBody.toString('base64'),  "binary",function(err) { });
})

const bsClosest = require('p3x-binary-search-closest');
var replayLookup = {};
var baseTimestamp = moment().valueOf();
async function applyEvents(page){
    await page.setRequestInterception(true);
    if (REPLAY){
        page.on('request', request => {
            arr = replayLookup[request.url().toString()];
            if(DEBUG){
                console.log(arr)
                console.log(replayLookup)
            }
            try {
                a = bsClosest.byProperty(arr, moment().valueOf() - baseTimestamp, 'timestamp');
            } catch (error) {request.continue(); return}
            request.respond({body: a.body});
        });
    }else{
        page.on('request', request => {
            request.timestamp = moment().valueOf() - baseTimestamp;
            request.continue();
        });

        page.on('requestfinished', async (request) => {
            const response = await request.response();
            const responseHeaders = response.headers();
            let responseBody;
            try {
                responseBody = await response.buffer();
            } catch (error) {return}

            const information = {
                url: request.url(),
                responseBody: responseBody || "",
                timestamp: request.timestamp,
            };
            console.log(response)
            if(responseBody)
                reponseWriter.emit('write', information);
        });
    }

    pageEmitter.on('close-app', async() => {
        await page.waitForTimeout(2.5 * 1000);
        await page.browser().close();
    })
}

const fs = require('fs');
const fsPromises = fs.promises;
const lineReader = require('line-reader');
(async () => {
    if(REPLAY){
        fs.promises.mkdir(DATAPATH, { recursive: true }).catch(console.error);
        files = await fsPromises.readdir(DATAPATH);

        await files.forEach(file => {
            var a = [];
            lineReader.eachLine(DATAPATH+'/'+file, function(line, last) {
                a.push(line)
              
                if (last) {
                    c = decodeURI(a[0]);
                    b = a.slice(2);
                    if (b.length==0) 
                        b = [''];
                    b = b.join('');
                    if (replayLookup[c])
                        replayLookup[c].push({ 'timestamp': a[1], 'body': Buffer.from(b, 'base64') });
                    else
                        replayLookup[c] = [{ 'timestamp': a[1], 'body': Buffer.from(b, 'base64') }];
                    return false;
                }
              });
        });
        for (let key in replayLookup)
            replayLookup[key].sort((firstEl, secondEl) => { return firstEl.timestamp<secondEl.timestamp } );
    }

    const browser = await puppeteer.launch({headless: false, devtools: false, args: []});
    
    browser.on('targetcreated', async(target) => {
        if (DEBUG) console.log(`Created target type ${target.type()} url ${target.url()}`);
        if (target.type() !== 'page') {
            return;
        } else {
            var page = await target.page();
        }
        await applyEvents(page);
    });

    const pages = await browser.pages();
    const [page] = pages;
    await applyEvents(page);
    await page.goto(WEBSITE)

    while(browser.close){
        try {
            size = await page.$eval('#windowSize', el => {return el.getAttribute("size")});
            a = size.split(',');     
            await page.setViewport({height: parseInt(a[1])-60, width: parseInt(a[0])-20});
            await page.waitForTimeout(500);
        } catch (error) {
            if(error.message == 'Protocol error (Runtime.callFunctionOn): Session closed. Most likely the page has been closed.') 
                break;
        }
    }

    await browser.close();
})();
