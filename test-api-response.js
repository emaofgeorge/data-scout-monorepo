const axios = require('axios');

(async () => {
  try {
    // Fetch products from Bari store (356)
    const url =
      'https://web-api.ikea.com/circular/circular-asis/offers/grouped/search?languageCode=it&size=1&storeIds=356&page=0';

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    console.log('Full API Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.content && response.data.content.length > 0) {
      console.log('\n\n=== FIRST PRODUCT DETAILED ===');
      const firstProduct = response.data.content[0];
      console.log('Article Numbers:', firstProduct.articleNumbers);
      console.log('\nOffers:');
      firstProduct.offers.forEach((offer, idx) => {
        console.log(`\nOffer ${idx + 1}:`);
        console.log('  - id:', offer.id);
        console.log('  - offerNumber:', offer.offerNumber);
        console.log('  - offerUuid:', offer.offerUuid);
        console.log('  - price:', offer.price);
        console.log('  - productConditionCode:', offer.productConditionCode);
      });

      console.log('\n\n=== ALL FIELDS ===');
      console.log('Product level fields:', Object.keys(firstProduct));
      console.log('Offer level fields:', Object.keys(firstProduct.offers[0]));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
