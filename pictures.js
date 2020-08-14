const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const results = require('./results.json')



function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
   }


   const download = (url, destination) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
  
    https.get(url, response => {
      response.pipe(file);
  
      file.on('finish', () => {
        file.close(resolve(true));
      });
    }).on('error', error => {
      fs.unlink(destination);
  
      reject(error.message);
    });
  });



(async () => {

    const fs = require('fs');



    for (let c = 0; c < results.length; c++)
    {
       const color = results[c];
       
       for (let s = 0; s < color.sections.length; s++)
       {
            const section = color.sections[s];

            for (let p = 0; p < section.picUrls.length; p++)
            {
                const url = section.picUrls[p];
                const parts = url.split('/');
                const filename = "./images/" + parts[parts.length - 1];

                result = await download(url, filename);

            }
       }


    }

    console.log("Picture scraping has finished successfully");


})();  

