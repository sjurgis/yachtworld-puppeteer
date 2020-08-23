const puppeteer = require('puppeteer');
const fastcsv = require('fast-csv');
const fs = require('fs');
const digits = /\d+/g;
const decimals = /\d*\,?\d*/g;
const now = new Date().getTime();
// refer to list of makes here https://au.yachtworld.com/core/listing/cache/dimensionValues.jsp?sm=3&searchtype=advancedsearch&Ntk=boatsUK&ftid=0&N=2279+3945&enid=0&toYear=2010&hmid=0&boatsAddedSelected=-1&slim=quick&currencyid=1008&luom=126&toLength=60&Ne=15&fromLength=40&cit=true&fromYear=1990
const fromLength = 40
const toLength = 60
const fromYear = 1990
const toYear = 2010
const currencyId = 1004 // euros
const makes = [
    'Bavaria',
    'Amel',
    'Hallberg-Rassy',
    'Beneteau',
    'Oyster',
    'Moody',
    'Najad',
    'Westerly',
    'Dehler',
    'Hanse',
    'Dufour',
    'Elan',
    'Catalina',
    'Grand Soleil',
    'Hunter',
    'Island Packet',
    'Jeanneau',
    'Wauquiez'
];
const hasMore = async (page) => {
    try {
        const searchResultsCount = await page.$('div.searchResultsCount');
        const __searchResultsCount = await searchResultsCount.evaluate(node => node.innerText);
        const groups = __searchResultsCount.match(decimals).filter(i => i).map(i => i.replace(',', ''));
        return parseInt(groups[2]) > parseInt(groups[1]);
    } catch (e) {
        console.error(e)
        return false
    }
};
const parseListings = async (page, make) => {
    const prices = [];
    try {
        const boats = await page.$$('div.information');
        for (let boat of boats) {
            try {
                const price = await boat.$('div.price');
                const model = await boat.$('div.make-model');
                if (price && model) {
                    const _price = await price.evaluate(node => node.innerText);
                    let __price;
                    try {
                        __price = parseInt(_price.match(digits).join(''))
                    } catch (e) {
                        // these happen frequently when there's no price and it's just "Ring" value
                        // console.error(e)
                    }
                    const _model = await model.evaluate(node => node.innerText);
                    const anchor = await model.$('a');
                    const url = await anchor.evaluate(node => node.href);
                    const locationDiv = await boat.$('div.location');
                    const area = await locationDiv.evaluate(node => node.innerText);
                    const modelParams = _model.match(digits);
                    const __model = _model.split(modelParams[1])[1].trim();
                    if (__price && __model) {
                        prices.push({
                            make: make,
                            model: __model,
                            length: modelParams[0],
                            year: modelParams[1],
                            price: __price,
                            area: area === 'Sale Pending' ? '' : area,
                            salePending: area === 'Sale Pending',
                            url: url
                        })
                    }
                }
            } catch (e) {
                console.error(e)
            }
        }
    } catch (e) {
        console.error(e)
    }
    return prices;
};
const exitIfAlreadyRanToday = () => {
    var inputDate = new Date(parseInt(fs.readFileSync('lastrundate', "utf8")))
    var todaysDate = new Date();
    debugger
    if(inputDate.setHours(0,0,0,0) === todaysDate.setHours(0,0,0,0)) {
        process.exit(0)
    }
}
(async () => {
    exitIfAlreadyRanToday()
    const browser = await puppeteer.launch({
        // headless: false,
        timeout: 60 * 1000,
        defaultViewport: {
            width: 2048,
            height: 1280
        }
        // devtools: true,
        // slowMo: 50
    });

    const getPromise = async (make) => {
        try {
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if(req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image' || req.resourceType() === 'script'){
                    req.abort();
                } else {
                    req.continue();
                }
            });
            const url = `https://au.yachtworld.com/core/listing/cache/searchResults.jsp?is=false&sm=3&searchtype=advancedsearch&Ntk=boatsUK&ftid=0&enid=0&toYear=${toYear}&type=%28Sail%29&hmid=0&boatsAddedSelected=-1&slim=quick&currencyid=${currencyId}&luom=126&toLength=${toLength}&cit=true&fromLength=${fromLength}&fromYear=${fromYear}&man=${make}&ps=50&No=0&Ns=PBoat_sortByPriceAsc|0`;
            await page.goto(url, {
                waitUntil: "networkidle2"
            });
            let _prices = await parseListings(page, make)
            while (await hasMore(page)) {
                try {
                    const _url2 = await page.$('#searchResultsHeader > div.searchResultsNav > span.navNext > a');
                    const url2 = await _url2.evaluate(node => node.href);
                    await page.goto(url2, {
                        waitUntil: "networkidle2"
                    });
                    _prices = [..._prices, ...await parseListings(page, make)];
                } catch (e) {
                    console.error(e)
                }
            }
            await page.close()
            return _prices
        } catch (e) {
            console.error(e)
        }
    }
    const prices = (await Promise.all(makes.map(getPromise))).flat()
    const ws = fs.createWriteStream(`yachtworld-${now}.csv`);
    fastcsv
        .write(prices, {headers: true, quote: true, quoteColumns: true})
        .pipe(ws);
    fs.writeFileSync(`yachtworld-${now}.json`, JSON.stringify(prices));
    // console.log(prices.sort((x, y) => (x.price == y.price) ? 0 : ((x.price > y.price) ? 1 : -1)));
    // console.log(prices);
    await browser.close();
    fs.writeFileSync('lastrundate', now)
})();