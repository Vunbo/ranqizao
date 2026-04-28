const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS = [
  {
    name: 'Inter-Regular.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
  },
  {
    name: 'Inter-Bold.woff2',
    url: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2'
  },
  {
    name: 'SpaceGrotesk-Regular.woff2',
    url: 'https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFqnE7PpfeU8K_fOk7PYv_hJzO.woff2'
  },
  {
    name: 'JetBrainsMono-Regular.woff2',
    url: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/t6X248tc-p4WpG_9_p7-Y_6RM_D6737j9S7P9mCJ.woff2'
  }
];

const OUTPUT_DIR = path.join(process.cwd(), 'public/fonts');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function download(url, dest) {
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
  console.log('Starting font downloads...');
  for (const font of FONTS) {
    try {
      await download(font.url, path.join(OUTPUT_DIR, font.name));
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err.message);
    }
  }
  console.log('Font downloads finished.');
}

main();
