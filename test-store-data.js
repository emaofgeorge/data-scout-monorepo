const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  try {
    const response = await axios.get('https://www.ikea.com/it/it/circular/second-hand/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const nextDataScript = $('#__NEXT_DATA__').html();
    const nextData = JSON.parse(nextDataScript);
    const stores = nextData?.props?.pageProps?.stores;
    
    // Print first two stores with all fields
    console.log('First store data:');
    console.log(JSON.stringify(stores[0], null, 2));
    
    console.log('\n\nSecond store data:');
    console.log(JSON.stringify(stores[1], null, 2));
    
    // Check if there's a slug field
    console.log('\n\nStore fields:', Object.keys(stores[0]));
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
