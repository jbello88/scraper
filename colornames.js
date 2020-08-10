const puppeteer = require('puppeteer');

(async () => {

    const fs = require('fs');

    let rawdata = fs.readFileSync('colors.json');
    let colorNames = JSON.parse(rawdata);
    
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://colourlex.com/pigments/pigments-colour/');
    await page.waitFor(1000);

    const colors = await page.evaluate(async () => Array.from(document.querySelectorAll(".et_pb_module_header a")).map(a => a.textContent));

    const json = JSON.stringify(colors);
    console.log(json);

    await browser.close();
})();  

