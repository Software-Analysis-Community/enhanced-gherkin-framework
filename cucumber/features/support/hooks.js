const { Before, After, AfterAll } = require('@cucumber/cucumber');

let scenarioStartTime = 0;

let browser;
let page;

Before(function () {
    scenarioStartTime = Date.now();
});

After(function (scenario) {
    const scenarioEndTime = Date.now();
    const duration = scenarioEndTime - scenarioStartTime;
    console.log(`\n[${scenario.pickle.name}] duration: ${duration} ms`);
});

AfterAll(async function () {
    if (page) {
        await page.close();
    }
    if (browser) {
        await browser.close();
    }
    console.log('\nБраузер закрыт после всех тестов.');
});

function setBrowser(b) {
    browser = b;
}
function getBrowser() {
    return browser;
}
function setPage(p) {
    page = p;
}
function getPage() {
    return page;
}

module.exports = {
    setBrowser,
    getBrowser,
    setPage,
    getPage
};
