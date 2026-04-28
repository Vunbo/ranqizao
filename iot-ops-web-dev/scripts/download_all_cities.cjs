const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/';
const OUTPUT_DIR = path.join(process.cwd(), 'public/maps/cities');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, dest) {
  if (fs.existsSync(dest)) {
    console.log(`Skipping ${path.basename(dest)}, already exists.`);
    return;
  }
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    console.log('Fetching China map to get provinces...');
    const chinaData = await fetchJson(`${BASE_URL}100000_full.json`);
    const provinces = chinaData.features.filter(f => f.properties.level === 'province');

    console.log(`Found ${provinces.length} provinces. Fetching city lists...`);

    const cityAdcodes = new Set();

    for (const province of provinces) {
      const adcode = province.properties.adcode;
      const name = province.properties.name;
      
      // Skip special cases if needed, but usually we want all
      try {
        const provinceData = await fetchJson(`${BASE_URL}${adcode}_full.json`);
        const cities = provinceData.features.filter(f => f.properties.level === 'city');
        console.log(`Province ${name} (${adcode}) has ${cities.length} cities.`);
        
        for (const city of cities) {
          cityAdcodes.add(city.properties.adcode);
        }
      } catch (e) {
        console.error(`Failed to fetch cities for province ${name}: ${e.message}`);
      }
    }

    console.log(`Total unique cities found: ${cityAdcodes.size}. Starting downloads...`);

    const cityMapping = {};
    for (const province of provinces) {
      try {
        const provinceData = await fetchJson(`${BASE_URL}${province.properties.adcode}_full.json`);
        const cities = provinceData.features.filter(f => f.properties.level === 'city');
        for (const city of cities) {
          const name = city.properties.name.replace(/(市|地区|自治州)$/, '');
          cityMapping[name] = city.properties.adcode.toString();
        }
      } catch (e) {}
    }
    fs.writeFileSync(path.join(process.cwd(), 'src/constants/city_adcodes.json'), JSON.stringify(cityMapping, null, 2));
    console.log('Saved city mapping to src/constants/city_adcodes.json');

    // Download in parallel with a limit to avoid overwhelming
    const adcodesArray = Array.from(cityAdcodes);
    const CONCURRENCY = 5;
    
    for (let i = 0; i < adcodesArray.length; i += CONCURRENCY) {
      const batch = adcodesArray.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(adcode => {
        const url = `${BASE_URL}${adcode}_full.json`;
        const dest = path.join(OUTPUT_DIR, `${adcode}.json`);
        return downloadFile(url, dest).catch(err => console.error(`Error downloading ${adcode}: ${err.message}`));
      }));
      console.log(`Progress: ${Math.min(i + CONCURRENCY, adcodesArray.length)}/${adcodesArray.length}`);
    }

    console.log('All downloads finished.');
  } catch (err) {
    console.error('Main error:', err);
  }
}

main();
