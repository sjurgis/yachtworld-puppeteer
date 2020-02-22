const puppeteer = require('puppeteer');
const fastcsv = require('fast-csv');
const fs = require('fs');
const digits = /\d+/g;
const now = new Date().getTime();
// refer to list of makes here https://au.yachtworld.com/core/listing/cache/dimensionValues.jsp?sm=3&searchtype=advancedsearch&Ntk=boatsUK&ftid=0&N=2279+3945&enid=0&toYear=2010&hmid=0&boatsAddedSelected=-1&slim=quick&currencyid=1008&luom=126&toLength=60&Ne=15&fromLength=40&cit=true&fromYear=1990
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
    'Hunter' ,
    'Island Packet',
    'Wauquiez'
];
const hasMore = async (page) => {
    const searchResultsCount = await page.$('div.searchResultsCount');
    const __searchResultsCount = await searchResultsCount.evaluate(node => node.innerText);
    const groups = __searchResultsCount.match(digits);
    return parseInt(groups[2]) > parseInt(groups[1]);
};
const parseListings = async (page) => {
    const prices = [];
    const boats = await page.$$('div.information');
    for (let boat of boats) {
        const price = await boat.$('div.price');
        const model = await boat.$('div.make-model');
        if(price && model){
            const _price = await price.evaluate(node => node.innerText);
            let __price;
            try {
                __price = parseInt(_price.match(digits).join(''))
            } catch(e) {

            }
            const _model = await model.evaluate(node => node.innerText);
            const anchor = await model.$('a');
            const url = await anchor.evaluate(node => node.href);
            const modelParams = _model.match(digits);
            if(__price && _model){
                prices.push({
                    model: _model,
                    length: modelParams[0],
                    year: modelParams[1],
                    price: __price,
                    url: url
                })
            }
        }
    }
    return prices;
};
(async () => {
    const browser = await puppeteer.launch({
        // headless: false,
        // devtools: true,
        // slowMo: 50
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 2048,
        height: 1280
    });

    for(let make of makes){
        const url = `https://au.yachtworld.com/core/listing/cache/searchResults.jsp?is=false&sm=3&searchtype=advancedsearch&Ntk=boatsUK&ftid=0&enid=0&toYear=2010&type=%28Sail%29&hmid=0&boatsAddedSelected=-1&slim=quick&currencyid=1008&luom=126&toLength=60&cit=true&fromLength=38&fromYear=1990&man=${make}&ps=50&No=0&Ns=PBoat_sortByPriceAsc|0`;
        await page.goto(url, {
            waitUntil: "networkidle2"
        });
        let prices = await parseListings(page);
        while(await hasMore(page)){
            const _url2 = await page.$('#searchResultsHeader > div.searchResultsNav > span.navNext > a');
            const url2 = await _url2.evaluate(node => node.href);
            await page.goto(url2, {
                waitUntil: "networkidle2"
            });
            const prices2 = await parseListings(page);
            prices = [...prices, ...prices2];
        }
        const ws = fs.createWriteStream(`results/${make}-${now}.csv`);
        fastcsv
            .write(prices, { headers: true, quote: true, quoteColumns: true })
            .pipe(ws);
        fs.writeFileSync(`results/${make}-${now}.json`, JSON.stringify(prices));
        // console.log(prices.sort((x, y) => (x.price == y.price) ? 0 : ((x.price > y.price) ? 1 : -1)));
        // console.log(prices);
    }
    await browser.close();
})();