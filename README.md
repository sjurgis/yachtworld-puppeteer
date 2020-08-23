# yachtworld-puppeteer

Scrapes selected makes and produces csv and json of price, year, length, model, location and url. Run analysis for calculating days on market for sold ones (need to run scraper daily).

Modify the const on top of file to widen or narrow your search space. Right now it's for sailing monohulls, 40-60ft, 1990-2010, prices in EUR and a list of makes I've picked.

Took me about ~40 seconds to scrape all 17 makes I've picked (~3236 listings). Have a look at `yachtworld-1582445668829.csv` file for examples (generated at February 2020).

Usage:

```
npm i
# runs once
node . 
# analyse data
node analyse
```

# Daily Run

Macos is weird with running crontab when asleep, so I run it every hour and then check if already ran today (uncomment method `exitIfAlreadyRanToday`).
 
```
EDITOR=nano crontab -e

0 * * * * ~/Downloads/yachtworld-puppeteer/daily.sh
```

# Analysis

Analysis on Google Sheets (older dataset, prices are in AUD): https://docs.google.com/spreadsheets/d/1wiClebtDRbIo_VWi2_neH4igX8fIJ3MCiRzUaWmARBo/edit?usp=sharing

My conclusions so far - there are a lot more cheap boats, and they sell faster. Good brands like Oyster, Moody, Amel cost more and have wider price ranges.