const puppeteer = require('puppeteer');

const getPicUrlsFromLinkedPages = async (browser, section) => {

    if (section.links.length > 0)
    {
        newLinks = [];
        for(let c = 0; c < section.links.length; c++)
        {
            if (c > 9) break;
            const page2 =  await browser.newPage();  
            await page2.goto(section.links[c]);
            await page2.waitFor(500);
            let picUrl = await page2.evaluate(() => document.querySelector("#Image img").dataset.lazySrcset);
            if (picUrl){
               picUrl = picUrl.split(' ')[0];
            } 

            page2.close();
            section.picUrls.push(picUrl);  
        } 
    }
}

const cleanUpEmtyValues = (section) => {
    section.texts = section.texts.filter(l => l.length > 2);
    section.picUrls = section.picUrls.filter(l => l.length > 2);
}





const scrapeColor = async (colorName) =>
{
    console.log(colorName);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let cn = colorName.split(' ').join('-')
    await page.goto(`https://colourlex.com/project/${cn}`);
    await page.waitFor(1000);
    let sections = [];
     try {
        sections = await page.evaluate(async () => Array.from(document.querySelectorAll(".et_pb_with_background")).map(section => {

            let links = [];
            const title = section.querySelector('h2').textContent;
            const txt = section.querySelector('.et_pb_module .et_pb_text_align_left  .et_pb_text_inner p') ? section.querySelector('.et_pb_module .et_pb_text_align_left  .et_pb_text_inner p').textContent : '';
            const texts =  Array.from( section.querySelectorAll('.et_pb_text_align_left .et_pb_text_inner p')).map(s => s.textContent.includes('<img') ? '' : s.textContent );
            if (txt) texts.push(txt);
        
            const picUrls =  Array.from( section.querySelectorAll('.et_pb_column img')).filter(i => i.dataset && i.dataset.lazySrcset).map(i =>  i.dataset.lazySrcset.split(' ')[0] ); 
        
            const togglePics =  Array.from( section.querySelectorAll('.et_pb_toggle_content')).filter(i => i.dataset.etMultiView).map(i => (JSON.parse(i.dataset.etMultiView ).schema.content.desktop)); 
            const morePicsUrls = togglePics.map(h => {
                const parser = new DOMParser();
                const wrapper = parser.parseFromString(h, "text/html");
                var img = wrapper.querySelector('img')
                if (img) {
                    const srcStr = img.src
                    if (srcStr.endsWith('jpg')) return srcStr} ;
                return '';
             });
        
             morePicsUrls.filter(u => u.length > 2).map(u => picUrls.push(u));
        
             if (section.id === "Examples") 
            {
               links =  Array.from(  section.querySelectorAll("h2 a")).map((i) => i.href);
            }
        
            return {title, texts, picUrls, links} ;

        }));
    } catch (error) {
        console.log(error)
    }   
    
        
    sections = sections.filter(s => s.title !== 'Contact' && s.title !== 'Further Reading')

    for (let s = 0; s < sections.length; s++)
    {
        let section = sections[s];
        cleanUpEmtyValues(section)
        await getPicUrlsFromLinkedPages(browser, section);
    }

    await browser.close();

    return sections;
}


const scrapeQuotes = async (colorName) =>
{
    
    const browser = await puppeteer.launch();
    const pageQ =  await browser.newPage();  
    await pageQ.goto(`https://en.wikiquote.org/w/index.php?search=%22${colorName}%22&title=Special%3ASearch&go=Go&ns0=1`);   //mw-search-result-heading
    await pageQ.waitFor(500);

    const colorQuotes = []; 

    const quoteResults = await pageQ.evaluate(async () => Array.from(document.querySelectorAll(".mw-search-result-heading a")).filter(a => a.textContent && a.textContent.split(' ').length > 1).map(a => a.href));

    for (let q = 0; q < quoteResults.length; q++){
        if (q > 9) break;

        const pageDetail =  await browser.newPage();  
        await pageDetail.goto(quoteResults[q]);
        await pageDetail.waitFor(200);
        const source = await pageDetail.evaluate(async () => document.querySelector("h1").textContent);  
        //const quotes = await pageDetail.evaluate(async (colorName) => Array.from(document.querySelectorAll("p")).filter(p => p.textContent && p.textContent.includes(colorName)).map(p => p.textContent));  
        let quotes = await pageDetail.evaluate(async () => Array.from(document.querySelectorAll("li")).map(p =>p.textContent));
        quotes = quotes.filter(t => t.includes(colorName));
        //const quotes2 = await pageDetail.evaluate(async (colorName) => Array.from(document.querySelectorAll("li")).filter(p => p.textContent && p.textContent.includes(colorName)).map(p => quotes.push (p.textContent)));  
        await pageDetail.close();
        colorQuotes.push({source, quotes})
    }
     

    await browser.close();

    return colorQuotes;
}




(async () => {

    const fs = require('fs');

    let rawdata = fs.readFileSync('colors.json');
    let colorNames = JSON.parse(rawdata);

    console.log(colorNames);
    
    results = [];

    for (let colNr = 0; colNr < colorNames.length; colNr++)
    {
       const colorName = colorNames[colNr]
       const sections = await scrapeColor(colorName);
       const quotes = await scrapeQuotes(colorName);

       const res = {colorName, sections, quotes}
       results.push(res);
    }

    const json = JSON.stringify(results);
    console.log(json);


})();  

