// Check robots.txt for MyMarket
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

fetch('https://www.mymarket.ma/robots.txt', {
  headers: { 'User-Agent': UA }
}).then(r => {
  console.log('Status:', r.status);
  return r.text();
}).then(text => {
  console.log('--- robots.txt ---');
  console.log(text);
}).catch(e => console.error('Error:', e));
