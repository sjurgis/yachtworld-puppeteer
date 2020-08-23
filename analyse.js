const fs = require('fs')
const fastcsv = require('fast-csv');
const now = new Date().getTime()
const files = fs.readdirSync('.').filter(i => i.startsWith('yachtworld-') && i.endsWith('.json'))
const getHistoryEntry = (i, fileDate) => ({date: i.scrapeDate || fileDate, price: i.price})
const getNewEntry = (i, fileDate) => Object.assign(i, {priceHistory: [getHistoryEntry(i, fileDate)]})
const result = files.reduce((acc, file) => {
    const fileDate = new Date(parseInt(file.split('-')[1].split('.')[0]))
    const scraped = JSON.parse(fs.readFileSync(file))
    const existingUnsold = acc.filter(k => scraped.find(j => j.url === k.url && !k.soldDate))
    existingUnsold.forEach(i => {
        i.scrapeDate = fileDate
        i.priceHistory.push(getHistoryEntry(i))
    })
    const newOnes = scraped.filter(k => !acc.find(j => j.url === k.url)).map(i => getNewEntry(i, fileDate))
    const existingSold = acc.filter(k => !scraped.find(j => j.url === k.url && !k.soldDate))
    existingSold.forEach(i => {
        i.soldDate = fileDate
        i.daysOnMarket = (i.soldDate.getTime() - i.priceHistory[0].date.getTime()) / (1000 * 3600 * 24)
    })
    return [...acc, ...newOnes]
}, [])
fs.writeFileSync(`yachtworld-analysis-${now}.json`, JSON.stringify(result));
const ws = fs.createWriteStream(`yachtworld-analysis-${now}.csv`);
fastcsv
    .write(result.filter(i => i.daysOnMarket).map(i => {
        delete i.priceHistory
        delete i.scrapeDate
        delete i.soldDate
        return i
    }), { headers: true, quote: true, quoteColumns: true })
    .pipe(ws);