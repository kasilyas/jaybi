// Debug: check Shopify products.json endpoint
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function check() {
  // Shopify products.json endpoint
  const res = await fetch('https://www.mymarket.ma/products.json?limit=10', {
    headers: { 'User-Agent': UA }
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Products count:', data.products?.length);

  if (data.products && data.products.length > 0) {
    console.log('\n--- First 3 products ---');
    data.products.slice(0, 3).forEach((p, i) => {
      const price = p.variants?.[0]?.price;
      const compareAt = p.variants?.[0]?.compare_at_price;
      const available = p.variants?.[0]?.available;
      console.log(`\n${i + 1}. ${p.title}`);
      console.log(`   Price: ${price} DH (compare: ${compareAt})`);
      console.log(`   Available: ${available}`);
      console.log(`   Vendor: ${p.vendor}`);
      console.log(`   Type: ${p.product_type}`);
      console.log(`   Handle: ${p.handle}`);
      console.log(`   Image: ${p.images?.[0]?.src}`);
      if (p.variants?.[0]?.barcode) console.log(`   Barcode: ${p.variants[0].barcode}`);
    });
  }
}

check().catch(e => console.error(e));
