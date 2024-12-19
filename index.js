const express = require('express');
const app = express();
const port = process.env.PORT || 8088;
const puppeteer = require('puppeteer');
const pdf2base64 = require('pdf-to-base64');
const cors = require('cors');
const PDFMerger = require('pdf-merger-js');
const fs = require('fs');

// Load Env Variables
require('dotenv').config();

// Setup CORS
const corsConfig = {
    credentials: true,
    origin: true,
};

// Load App
app.use(cors(corsConfig));

// Define Routes

app.get('/', function (req, res) {
    console.log('Called Home');
    res.status(200).send({ active: true });
});

app.get('/get-calendar', function (req, res) {
    console.log('Called Get Calendar');
    generatePDFCalendar(req, res).then(r => (
        console.log('Completed Called Get Calendar')
    ));
});

app.get('/get-new-monthly-calendar', function (req, res) {
    console.log('Called Get NewMonthly Calendar');
    getNewMonthlyCalendar(req, res).then(r => (
        console.log('Completed NewMonthly Calendar')
    ));
});

app.get('/get-newsletter', function (req, res) {
    console.log('Called Get Newsletter');
    getNewsletter(req, res);
});


app.get('/get-calendar-content-oversize', function (req, res) {
    console.log('Get if calendar content fits in one page');
    getContentOversize(req, res);
});

app.get('/get-calendar-content-oversize-new', function (req, res) {
    console.log('Get if calendar content fits in one page New Function');
    getContentOversizeNew(req, res);
});

app.get('/get-new-calendar', function (req, res) {
    const calendarView = req.query.calendarView;
    if (calendarView === 'timeGridDay') {
        getNewCalendarDaily(req, res).then(r => {
        });
    } else {
        getNewCalendarWeekly(req, res).then(r => {
        });
    }
});


app.get('/get-dining-calendar', function (req, res) {
    console.log('Called Dining Calendar');
    getDiningCalendar(req, res);
});


app.get('/get-birthday-calendar', function (req, res) {
    console.log('Called Birthday Calendar');
    getBirthdayCalendar(req, res);
});


app.get('/get-newsletter-sunrise', function (req, res) {
    console.log('Called Sunrise Newsletter');
    getNewsletterSunrise(req, res);
});

app.get('/get-newsletter-maplewood', function (req, res) {
    console.log('Called Sunrise Newsletter');
    getNewsletterMaplewood(req, res);
});


async function generatePDFCalendar(req, res) {

    const communityId = req.query.communityId;
    const customCalendarId = req.query.customCalendarId;
    const awsFilename = req.query.filename;
    const env = req.query.env;
    const printSize = req.query.sizeSelected;
    const numPage = req.query.page;
    const numPages = req.query.numPages;
    const merger = new PDFMerger();

    console.log('req.query.sizeSelected');
    console.log(req.query.sizeSelected);

    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com';
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }

    let browserConfig = { headless: true };

    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }

    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);

    // Create a new page
    const page = await browser.newPage();
    // await page.setViewport({width: 2300, height: 1880})


    // Website URL to export as pdf
    const url = `${domain}/communities/${communityId}/calendar/customCalendarPrint/edit/${customCalendarId}/headless/${numPage}`;
    console.log(url);
    const filename = `./files/${awsFilename}.pdf`;

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(5000);
    await page.emulateMediaType('screen');


    const defaultValues = {
        path: filename,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: true,
        pageBreakBefore: 'always'
    };

    if (printSize === 'A3') {
        defaultValues.height = '36in';
        defaultValues.width = '24in';
    } else {
        defaultValues.format = printSize;
    }

    await page.pdf(defaultValues).catch((error) => {
        console.error('error generatePDFCalendar # 1');
        console.error(error);
    });


    // One Page Print
    if (numPages !== '2') {

        // There is a Patch here, in cloud servers are generating 2 pages, we need to remove the page 2
        await (async () => {
            await merger.add(filename, 1);  //merge all pages. parameter is the path to file and filename.
            // Set metadata
            await merger.setMetadata({
                producer: "TSOLife",
                author: "TSOLife",
                creator: "TSOLife",
                title: awsFilename
            });
            await merger.save(filename); //save under given name and reset the internal document
        })();

        let base64 = '';
        await pdf2base64(filename)
            .then(
                (response) => {
                    base64 = response;
                }
            )
            .catch(
                (error) => {
                    console.log(error);
                }
            )
        await browser.close();
        // Delete File
        fs.unlinkSync(filename);
        return res.status(200).send({ completed: true, base64: base64 });
    }

    // Website URL to export as pdf
    const url2 = `${domain}/communities/${communityId}/calendar/customCalendarPrint/edit/${customCalendarId}/headless/2`;
    console.log('url2');
    console.log(url2);
    const filename2 = `./files/${awsFilename}2.pdf`;

    await page.goto(url2, { waitUntil: 'networkidle0' });
    await delay(5000);
    await page.emulateMediaType('screen');

    await page.pdf({
        path: filename2,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: true,
        format: printSize,
        pageBreakBefore: 'always'
    }).catch((error) => {
        console.error('error generatePDFCalendar # 2');
        console.error(error);
    });

    // Then Join 2 Documents Created
    // There is a Patch here, in cloud servers are generating 2 pages, we need to remove the page 2
    const filenameMerged = `./files/${awsFilename}-final.pdf`;
    await (async () => {
        await merger.add(filename, 1);  //merge all pages. parameter is the path to file and filename.
        await merger.add(filename2, 1);  //merge all pages. parameter is the path to file and filename.
        // Set metadata
        await merger.setMetadata({
            producer: "TSOLife",
            author: "TSOLife",
            creator: "TSOLife",
            title: awsFilename
        });
        await merger.save(filenameMerged); //save under given name and reset the internal document
    })();

    let finalBase64File = '';
    await pdf2base64(filenameMerged)
        .then(
            (response) => {
                finalBase64File = response;
            }
        )
        .catch(
            (error) => {
                console.log(error);
            }
        )
    await browser.close();
    // Delete File
    fs.unlinkSync(filenameMerged);
    fs.unlinkSync(filename2);
    res.status(200).send({ completed: true, file: finalBase64File });

}


async function getNewMonthlyCalendar(req, res) {

    const communityId = req.query.communityId;
    const customCalendarId = req.query.customCalendarId;
    const domain = getEnv(req);
    const printSize = req.query.sizeSelected;
    const numPages = req.query.numPages;
    const isRegularPrint = req.query.isRegularPrint;

    // Login
    const response = await login(req, domain);

    // Print Number of Pages Split
    const sliceAry = [];
    if (numPages === '1') {
        sliceAry.push({ start: 0, end: 6 });
    } else if (numPages === '2') {
        sliceAry.push(
            { start: 0, end: 3 },
            { start: 3, end: 6 },
        );
    } else if (numPages === '3') {
        sliceAry.push(
            { start: 0, end: 2 },
            { start: 2, end: 4 },
            { start: 4, end: 6 },
        );
    }

    // Loop for all pages
    const PDFAry = [];
    for (const slice of sliceAry) {
        const url = `${domain}/communities/${communityId}/calendar/customCalendarPrint/edit/${customCalendarId}/headless/${slice.start}/${slice.end}/${isRegularPrint}`;
        console.log(url);
        const filename = await getPDF(response.page, url, true, printSize);
        PDFAry.push(filename);
    }

    const finalFilename = await removePDFWhitePage(PDFAry);
    // Generate Base64 Encode
    console.log('finalFilename');
    console.log(finalFilename);

    // Delete array of Files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    });

    const base64 = await getBase64(finalFilename);
    await response.browser.close();

    // Delete File
    fs.unlinkSync(finalFilename)

    return res.status(200).send({ completed: true, base64: base64 });

}


async function getNewsletter(req, res) {

    const newsletterId = req.query.newsletterId;
    const communityId = req.query.communityId;
    const awsFilename = req.query.filename;
    const env = req.query.env;

    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com';
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }

    let browserConfig = { headless: true };

    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }

    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);

    // Create a new page
    const page = await browser.newPage();
    // await page.setViewport({width: 2300, height: 1880})

    // Website URL to export as pdf
    const url = `${domain}/communities/${communityId}/newsletter/edit/${newsletterId}/headless`;
    console.log(url);
    const filename = `./files/${awsFilename}.pdf`;


    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(10000);

    // GET Size
    // const left = await page.$('#left-container');
    // const right = await page.$('#right-container');
    // const rightBox = await left.boundingBox();
    // const leftBox = await right.boundingBox();

    // if (rightBox.height > 1670 || leftBox.height > 1670) {
    //     return res.status(200).send({ completed: false, message : 'The content exceeds the available space for printing. Please reduce the content to fit on one page'});
    // }

    await page.emulateMediaType('screen');
    await page.pdf({
        path: filename,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: true,
        format: 'Tabloid',
        pageBreakBefore: 'always'
    }).catch((error) => {
        console.error('error getNewsletter');
        console.error(error);
    });

    console.log('filename');
    console.log(filename);

    // There is a Patch here, in cloud servers are generating 2 pages, we need to remove the page 2
    const merger = new PDFMerger();
    const filenameMerged = './files/merged.pdf';
    await (async () => {
        await merger.add(filename, 1);  //merge all pages. parameter is the path to file and filename.
        // Set metadata
        await merger.setMetadata({
            producer: "TSOLife",
            author: "TSOLife",
            creator: "TSOLife",
            title: "TSOLife Newsletter"
        });
        await merger.save(filenameMerged); //save under given name and reset the internal document
    })();

    let base64 = '';
    await pdf2base64(filenameMerged)
        .then(
            (response) => {
                base64 = response;
            }
        )
        .catch(
            (error) => {
                console.log(error);
            }
        )
    await browser.close();
    // delele file
    fs.unlinkSync(filename);
    fs.unlinkSync(filenameMerged);
    return res.status(200).send({ completed: true, base64: base64 });
}


async function getDiningCalendar(req, res) {

    const communityId = req.query.communityId;
    const diningKioskCommunityId = req.query.diningKioskCommunityId;
    const date = req.query.date;
    const env = req.query.env;
    const awsFilename = req.query.filename;
    const merger = new PDFMerger();


    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com';
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }

    let browserConfig = { headless: true };

    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }

    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);

    // Create a new page
    const page = await browser.newPage();
    //
    // // Website URL to export as pdf
    const url = `${domain}/communities/${communityId}/dining-calendar/meal-view/${diningKioskCommunityId}/${date}/headless`;
    // const url = `${domain}/communities/${communityId}/calendar/${TSOLifeRoute}/${customCalendarId}/headless`;
    console.log(url);
    const filename = `./files/${awsFilename}.pdf`;

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(10000);
    await page.emulateMediaType('screen');
    await page.pdf({
        path: filename,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: false,
        format: 'letter',
        pageBreakBefore: 'always'
    }).catch((error) => {
        console.error('error getNewsletter');
        console.error(error);
    });

    // There is a Patch here, in cloud servers are generating 2 pages, we need to remove the page 2
    await (async () => {
        await merger.add(filename, 1);  //merge all pages. parameter is the path to file and filename.
        // Set metadata
        await merger.setMetadata({
            producer: "TSOLife",
            author: "TSOLife",
            creator: "TSOLife",
            title: awsFilename
        });
        await merger.save(filename); //save under given name and reset the internal document
    })();

    let base64 = '';
    await pdf2base64(filename)
        .then(
            (response) => {
                base64 = response;
            }
        )
        .catch(
            (error) => {
                console.log(error);
            }
        )
    await browser.close();
    // Delete File
    fs.unlinkSync(filename);
    return res.status(200).send({ completed: true, base64: base64 });
}


async function getBirthdayCalendar(req, res) {

    const end = req.query.end;
    const start = req.query.start;
    const communityId = req.query.communityId;
    const careTypes = req.query.careTypes;
    let fitsInPage = true;
    let startLimit = 0;
    let numEvents = 10; // sized and fit
    const domain = getEnv(req);
    let currentHeight = 0;
    let reachLimit = false;
    let offset = 20;
    let removeEvents = 3;

    // Website URL to export as pdf
    let url = `${domain}/communities/${communityId}/analytics/birthday-print/${start}/${end}`;
    url += (careTypes) ? `/${careTypes}` : '';

    // Login
    const response = await login(req, domain);

    // URL Changing
    let newUrl;
    // Create array of generated PDF
    const PDFAry = [];

    // Loop When Events ends
    while (!reachLimit) {

        while (fitsInPage) {
            newUrl = `${url}/${startLimit}/${numEvents}/headless`;
            console.log('Url to check');
            console.log(newUrl);
            await navigate(response.page, newUrl);
            const heights = await isOverSize(response.page, '#external-container', '#internal-container');
            numEvents++;
            if (heights.internalContainerHeight !== currentHeight) {
                currentHeight = heights.internalContainerHeight;
            } else {
                fitsInPage = false;
                reachLimit = true;
            }
            if ((heights.internalContainerHeight + offset) > heights.externalContainerHeight) {
                fitsInPage = false;
            }
        }

        // Now generate URL (Need to reduce 2 last number)
        newUrl = `${url}/${startLimit}/${(numEvents - removeEvents)}/headless`;
        console.log('Url to PDF');
        console.log(newUrl);
        // Now generate PDF
        const filename = await getPDF(response.page, newUrl, false, 'letter');
        PDFAry.push(filename);
        startLimit = numEvents - removeEvents;
        numEvents = numEvents + 1;
        fitsInPage = true;
    }

    // Remove White Page in Bottom
    const finalFilename = await removePDFWhitePage(PDFAry);
    // Delete array of Files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    });
    // Generate Base64 Encode
    const base64 = await getBase64(finalFilename);
    // Delete File
    fs.unlinkSync(finalFilename);
    // Close Browser
    await response.browser.close();
    // Response
    return res.status(200).send({ completed: true, base64: base64 });

}

async function getContentOversizeNew(req, res) {

    const communityId = req.query.communityId;
    const customCalendarId = req.query.customCalendarId;
    const env = req.query.env;
    const numPage = req.query.page;
    const isRegularPrint = req.query.isRegularPrint;


    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com'; // TODO
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }

    let browserConfig = { headless: true };
    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }
    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);

    // Create a new page
    const page = await browser.newPage();

    // Website URL to export as pdf
    let startSlide = 0;
    let endSlide = 6;
    if (numPage === 2) {
        startSlide = 3;
        endSlide = 6;
    }
    const url = `${domain}/communities/${communityId}/calendar/customCalendarPrint/edit/${customCalendarId}/headless/${startSlide}/${endSlide}/${isRegularPrint}`;
    console.log(url);

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(5000);
    await page.emulateMediaType('screen');

    // GET Size
    const outside = await page.$('#total-calendar');
    const inside = await page.$('#internal-calendar');
    const outsideBox = await outside.boundingBox();
    const insideBox = await inside.boundingBox();

    await browser.close();

    res.status(200).send({ oversize: (insideBox.x + insideBox.height) > (outsideBox.x + outsideBox.height) });

}

async function getContentOversize(req, res) {

    const communityId = req.query.communityId;
    const customCalendarId = req.query.customCalendarId;
    const env = req.query.env;
    const numPage = req.query.page;


    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com'; // TODO
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }

    let browserConfig = { headless: true };
    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }
    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);

    // Create a new page
    const page = await browser.newPage();

    // Website URL to export as pdf
    const url = `${domain}/communities/${communityId}/calendar/customCalendarPrint/edit/${customCalendarId}/headless/${numPage}`;
    console.log(url);

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(5000);
    await page.emulateMediaType('screen');

    // GET Size
    const outside = await page.$('#total-calendar');
    const inside = await page.$('#internal-calendar');
    const outsideBox = await outside.boundingBox();
    const insideBox = await inside.boundingBox();

    await browser.close();

    res.status(200).send({ oversize: (insideBox.x + insideBox.height) > (outsideBox.x + outsideBox.height) });

}


// Function to get Limit by page
async function getNewCalendarDaily(req, res) {

    const customCalendarId = req.query.customCalendarId;
    const communityId = req.query.communityId;
    const calendarView = req.query.calendarView;
    const domain = getEnv(req);
    const sizeSelected = req.query.sizeSelected;
    let TSOLifeRoute = 'weekly-print';
    let numEvents = 5; // sized and fit
    let removeEvents = 3;
    let offset = 70;

    if (calendarView === 'timeGridDay') {
        TSOLifeRoute = 'daily-print';
        removeEvents = 2;
        offset = 130;
    }

    // Login
    const response = await login(req, domain);

    // Navigate
    let url = `${domain}/communities/${communityId}/calendar/${TSOLifeRoute}/${customCalendarId}`;
    console.log('url');
    console.log(url);
    let fitsInPage = true;
    let startLimit = 0;
    let currentHeight = 0;
    let reachLimit = false;

    let newUrl;
    // Create array of generated PDF
    const PDFAry = [];

    // Loop When Events ends
    while (!reachLimit) {

        while (fitsInPage) {
            newUrl = `${url}/${startLimit}/${numEvents}/headless`;
            console.log('Url to check');
            console.log(newUrl);
            await navigate(response.page, newUrl);
            const heights = await isOverSize(response.page, '#external-daily-container', '#internal-daily-container');
            numEvents++;
            if (heights.internalContainerHeight !== currentHeight) {
                currentHeight = heights.internalContainerHeight;
            } else {
                fitsInPage = false;
                reachLimit = true;
            }
            if ((heights.internalContainerHeight + offset) > heights.externalContainerHeight) {
                fitsInPage = false;
            }
        }

        // Now generate URL (Need to reduce 2 last number)
        newUrl = `${url}/${startLimit}/${(numEvents - removeEvents)}/headless`;
        if (reachLimit) {
            newUrl = `${url}/${startLimit}/9999/headless`;
        }
        console.log('Url to PDF');
        console.log(newUrl);
        // Now generate PDF
        const filename = await getPDF(response.page, newUrl, (TSOLifeRoute === 'weekly-print'), (sizeSelected === 'LETTER') ? 'letter' : 'Tabloid');
        PDFAry.push(filename);
        startLimit = numEvents - removeEvents;
        numEvents = numEvents + 1;
        fitsInPage = true;
    }

    console.log('PDFAry');
    console.log(PDFAry);

    const finalFilename = await removePDFWhitePage(PDFAry);
    // Generate Base64 Encode
    console.log('finalFilename');
    console.log(finalFilename);

    // Delete array of Files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    });

    const base64 = await getBase64(finalFilename);
    await response.browser.close();

    // Delete File
    fs.unlinkSync(finalFilename)

    return res.status(200).send({ completed: true, base64: base64 });
}

// Function to get Limit by page
async function getNewCalendarWeekly(req, res) {

    const customCalendarId = req.query.customCalendarId;
    const communityId = req.query.communityId;
    const calendarView = req.query.calendarView;
    const domain = getEnv(req);
    const sizeSelected = req.query.sizeSelected;
    let TSOLifeRoute = 'weekly-print';
    let numEvents = 5; // sized and fit //TODO
    let removeEvents = 3;
    let offset = 70;

    if (calendarView === 'timeGridDay') {
        TSOLifeRoute = 'daily-print';
        removeEvents = 2;
        offset = 130;
    }

    // Login
    const response = await login(req, domain);

    // Navigate
    let url = `${domain}/communities/${communityId}/calendar/${TSOLifeRoute}/${customCalendarId}`;
    console.log('url');
    console.log(url);
    let fitsInPage = true;
    let startLimit = 0;
    let currentHeight = 0;
    let reachLimit = false;

    let newUrl;
    // Create array of generated PDF
    const PDFAry = [];

    // Get Max # of Events
    newUrl = `${url}/0/99999/headless`;
    await navigate(response.page, newUrl);
    const maxNumEvents = await getElementValue(response.page, '#maxNumEvents');
    console.log('maxNumEvents !!');
    console.log(maxNumEvents);

    // Loop When Events ends
    while (!reachLimit) {
        newUrl = `${url}/${startLimit}/${numEvents}/headless`;
        console.log('newUrl');
        console.log(newUrl);
        await navigate(response.page, newUrl);
        const heights = await isOverSize(response.page, '#external-daily-container', '#internal-daily-container');
        if ((heights.internalContainerHeight + offset) > heights.externalContainerHeight) {
            startLimit = numEvents;
            const filename = await getPDF(response.page, newUrl, (TSOLifeRoute === 'weekly-print'), (sizeSelected === 'LETTER') ? 'letter' : 'Tabloid');
            PDFAry.push(filename);
        }
        numEvents++;
        if (maxNumEvents < numEvents) {
            reachLimit = true;
            if (maxNumEvents !== numEvents) {
                const filename = await getPDF(response.page, newUrl, (TSOLifeRoute === 'weekly-print'), (sizeSelected === 'LETTER') ? 'letter' : 'Tabloid');
                PDFAry.push(filename);
            }
        }
    }

    console.log('PDFAry');
    console.log(PDFAry);

    const finalFilename = await removePDFWhitePage(PDFAry);
    // Generate Base64 Encode
    console.log('finalFilename');
    console.log(finalFilename);

    // delete array of files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    });

    const base64 = await getBase64(finalFilename);
    await response.browser.close();
    fs.unlinkSync(finalFilename);
    return res.status(200).send({ completed: true, base64: base64 });
}

async function getNewsletterSunrise(req, res) {

    const newsletterId = req.query.newsletterId;
    const communityId = req.query.communityId;
    const domain = getEnv(req);

    // Login
    const response = await login(req, domain);

    // Create array of generated PDF
    const PDFAry = [];

    // Define URL
    let url = `${domain}/communities/${communityId}/newsletter/edit/${newsletterId}`;

    // Loop for all pages
    let emptyPageInd = true;
    let index = 0;
    while (emptyPageInd) {
        let newUrl = url + `/${index}/headless`;
        console.log(newUrl);
        await navigate(response.page, newUrl);
        emptyPageInd = ((await response.page.$('#sunrise-page')) || null) !== null;
        if (!emptyPageInd) {
            break;
        }
        const filename = await getPDF(response.page, newUrl, false, 'letter');
        PDFAry.push(filename);
        index++;
    }
    const finalFilename = await removePDFWhitePage(PDFAry);
    // Delete array of Files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    })
    console.log('finalFilename');
    console.log(finalFilename);

    // Generate Base64 Encode
    const base64 = await getBase64(finalFilename);
    // Delete File
    fs.unlinkSync(finalFilename);
    await response.browser.close();
    return res.status(200).send({ completed: true, base64: base64 });
}


async function getNewsletterMaplewood(req, res) {

    const newsletterId = req.query.newsletterId;
    const communityId = req.query.communityId;
    const domain = getEnv(req);

    // Login
    const response = await login(req, domain);

    // Create array of generated PDF
    const PDFAry = [];

    // Define URL
    let url = `${domain}/communities/${communityId}/newsletter/edit-maplewood/${newsletterId}`;
    let numPages = 4;
    // Loop for all pages
    let emptyPageInd = true;
    let index = 0;
    while (index < numPages) {
        let newUrl = url + `/${index}/headless`;
        const filename = await getPDF(response.page, newUrl, false);
        PDFAry.push(filename);
        index++;
    }
    const finalFilename = await removePDFWhitePage(PDFAry);
    // Delete array of Files
    PDFAry.forEach(file => {
        fs.unlinkSync(file);
    })
    console.log('finalFilename');
    console.log(finalFilename);

    // Generate Base64 Encode
    const base64 = await getBase64(finalFilename);
    // Delete File
    fs.unlinkSync(finalFilename);
    await response.browser.close();
    return res.status(200).send({ completed: true, base64: base64 });
}

// ****************
// Local Functions
// ****************
function getEnv(req) {
    const env = req.query.env;
    let domain = 'http://localhost:4200';
    if (env === 'alpha') {
        domain = 'http://alpha.tsolife.com';
    } else if (env === 'prod') {
        domain = 'http://tsolife.com';
    }
    return domain;
}

function getBrowserConfig(req) {
    const env = req.query.env;
    let browserConfig = { headless: true, args: ['--disable-features=site-per-process'] };
    if (env !== 'dev') {
        browserConfig.executablePath = '/usr/bin/chromium-browser';
    }
    return browserConfig;
}

async function login(req, url) {
    // Get Browser Config
    let browserConfig = getBrowserConfig(req);
    // Create a browser instance
    const browser = await puppeteer.launch(browserConfig);
    // Create a new page
    const page = await browser.newPage();
    // Navigate
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.click('#login-button')
    await page.type('#email', process.env.TSO_USERNAME, { delay: 50 });
    await page.type('#password', process.env.TSO_PASSWORD, { delay: 50 });
    await page.click('#login', { delay: 50 });
    await delay(5000);
    await page.emulateMediaType('screen');
    return { page: page, browser: browser };
}

async function navigate(page, url) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    return { page: page };
}

async function getPDF(page, url, landscape, format) {
    const filename = `./files/${Math.floor(Math.random() * 9999)}.pdf`;
    await navigate(page, url);
    let defaultOptions = {
        path: filename,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: landscape,
        format: format,
        pageBreakBefore: 'always',
        width: 0,
        height: 0
    };

    if (format === 'A3') {
        delete defaultOptions.format;
        defaultOptions.width = '24in';
        defaultOptions.height = '36in';
    } else if (format === 'A2') {
        delete defaultOptions.format;
        defaultOptions.width = '36in';
        defaultOptions.height = '48in';
    }
    else {
        delete defaultOptions.width;
        delete defaultOptions.height;
    }

    await page.pdf(defaultOptions).catch((error) => {
        console.error('error getPDF');
        console.error(error);
    });
    return filename;
}

async function removePDFWhitePage(filenames) {
    const filename = `./files/merged_${Math.floor(Math.random() * 9999)}.pdf`;
    const merger = new PDFMerger();
    // There is a Patch here, in cloud servers are generating 2 pages, we need to remove the page 2
    await (async () => {
        for (const file of filenames) {
            await merger.add(file, 1);  //merge all pages. parameter is the path to file and filename.
        }
        // Set metadata
        await merger.setMetadata({
            producer: "TSOLife",
            author: "TSOLife",
            creator: "TSOLife",
            title: "TSOLife PDF"
        });
        await merger.save(filename); //save under given name and reset the internal document
    })();
    return filename;
}

async function getBase64(filename) {
    let base64 = '';
    await pdf2base64(filename)
        .then(
            (response) => {
                base64 = response;
            }
        )
        .catch(
            (error) => {
                console.log(error);
            }
        )

    return base64;
}

async function isOverSize(page, externalContainer, internalContainer) {
    // GET Size
    const outside = await page.$(externalContainer);
    // const outside = await page.$(externalContainer);
    const inside = await page.$(internalContainer);
    const outsideBox = await outside.boundingBox();
    const insideBox = await inside.boundingBox();
    return {
        internalContainerHeight: insideBox.height,
        externalContainerHeight: outsideBox.height
    }
}

async function getElementValue(page, id) {
    return await page.$eval(id, span => span.innerText);
}


function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

app.listen(port);
