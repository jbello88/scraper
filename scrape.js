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
            await page2.waitFor(1000);
            let picUrl = ''
            let picElement = await page2.evaluate(() => document.querySelector("#Image img"));
            if (picElement && picElement.dataset && picElement.dataset.lazySrcset) {
               picUrl = picElement.dataset.lazySrcset.split(' ')[0];
            } 

            page2.close();
            if (picUrl) section.picUrls.push(picUrl);  
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
    cn = cn.split('’').join('-')  
    await page.goto(`https://colourlex.com/project/${cn}`);    
    await page.waitFor(2000);
    let sections = [];
     try {
        sections = await page.evaluate(async () => Array.from(document.querySelectorAll(".et_pb_with_background"))
        .map(section => {

            let links = [];
            const title = section.querySelector('h2') ? section.querySelector('h2').textContent : '';
            const txtElement = section.querySelector('.et_pb_module .et_pb_text_align_left  .et_pb_text_inner p');
            let txtCont = '';
            if (txtElement) txtCont = txtElement.textContent;
             
            const texts =  Array.from( section.querySelectorAll('.et_pb_text_align_left .et_pb_text_inner p'))
               .filter(s => s.textContent && !s.textContent.includes('<img')).map(s => s.textContent );
            if (txtCont) texts.push(txtCont);
        
            const picUrls =  Array.from( section.querySelectorAll('.et_pb_column img'))
                             .filter(i => i.dataset && i.dataset.lazySrcset)
                             .map(i =>  i.dataset.lazySrcset.split(' ')[0] ); 
        
            const togglePics =  Array.from( section.querySelectorAll('.et_pb_toggle_content'))
                             .filter(i => i.dataset && i.dataset.etMultiView)
                             .map(i => (JSON.parse(i.dataset.etMultiView ).schema.content.desktop)); 
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
       console.log(error);
    }   
        
    sections = sections.filter(s => s.title !== 'Contact' && s.title !== 'Further Reading')
    sections = sections.filter(s => s.texts.length > 0 || s.picUrls.length > 0 || s.links.length > 0);

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
    await pageQ.goto(`https://en.wikiquote.org/w/index.php?search=%22${colorName}%22&title=Special%3ASearch&go=Go&ns0=1`);  
    await pageQ.waitFor(1000);

    const colorQuotes = []; 

    const lowerColName = colorName.toLowerCase();

    const quoteResults = await pageQ.evaluate(async () => Array.from(document.querySelectorAll(".mw-search-result-heading a"))
       .filter(a => a.textContent && a.textContent.split(' ').length > 1).map(a => a.href));

    for (let q = 0; q < quoteResults.length; q++){
        if (q > 9) break;

        const pageDetail =  await browser.newPage();  
        await pageDetail.goto(quoteResults[q]);
        await pageDetail.waitFor(1000);
        const source = await pageDetail.evaluate(async () => document.querySelector("h1").textContent);  
        let quotes = await pageDetail.evaluate(async () => Array.from(document.querySelectorAll("li, p")).map(p =>p.textContent));
        quotes = quotes.filter(t => t && t.toLowerCase().includes(lowerColName));
    
        await pageDetail.close();
        if (quotes.length > 0)  colorQuotes.push({source, quotes})
    }
     
    await browser.close();

    return colorQuotes;

}

function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
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
       if (sections.length == 0)
       {
           console.log("No Results found - waiting to try again");
           await Sleep.apply(30000);
           colNr--;
           continue;
       }
       const quotes = await scrapeQuotes(colorName);

       const res = {colorName, sections, quotes}
       results.push(res);
       
       const jsonx = JSON.stringify(res, null, '\t');
       console.log(jsonx);

    }

    const json = JSON.stringify(results, null, '\t');

    fs.writeFileSync("results.json", json);

    console.log("Color scraping has finished successfully");


})();  

