import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

puppeteer.use(StealthPlugin());

const extensionPath = path.resolve('./fewfeed');

const automatePosting = async () => {
  // Launch a new browser instance with each scheduled task
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#email');
    await page.type('#email', process.env.FB_EMAIL);
    await page.type('#pass', process.env.FB_PASS);
    await page.click('[name="login"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Logged in to Facebook');

    const targetUrl = 'https://v2.fewfeed.com/tool/auto-post-fb-group';
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    console.log(`Navigated to ${targetUrl}`);

    const textAreaSelector = 'textarea[placeholder="Write something..."]';
    await page.waitForSelector(textAreaSelector, { timeout: 3000 });
    await page.click(textAreaSelector);
    await page.type(textAreaSelector, 'Your text goes here');
    console.log('Text entered into the textarea');

    const svgSelector = 'svg.w-6.h-6.text-green-400.cursor-pointer';
    await page.waitForSelector(svgSelector, { timeout: 3000 });
    await page.click(svgSelector);
    console.log('SVG element clicked to open upload dialog');

    const uploadInputSelector = 'input[type="file"]';
    await page.waitForSelector(uploadInputSelector, { timeout: 3000 });
    const filePath = path.resolve('1.webp');
    const inputUploadHandle = await page.$(uploadInputSelector);
    await inputUploadHandle.uploadFile(filePath);
    console.log('File uploaded directly');

    const checkboxSelector = 'input[type="checkbox"].w-4.h-4.text-blue-600';
    await page.waitForFunction(
      (selector, count) => {
        return document.querySelectorAll(selector).length >= count;
      },
      {},
      checkboxSelector,
      3
    );
    console.log('At least 3 checkboxes are present');

    const checkboxes = await page.$$(checkboxSelector);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('Checkbox clicked');
    }

    const postButtonSelector = 'button.w-full.py-2.bg-blue-500.text-white.hover\\:bg-blue-600.transition-all.delay-75.font-bold.rounded-md.shadow-sm';
    await page.waitForSelector(postButtonSelector, { timeout: 3000 });
    await page.click(postButtonSelector);
    console.log('Post button clicked');
    
  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    await browser.close(); // Close browser instance
  }
};

// Schedule the automation to run daily at a specific time (e.g., every day at 5:15 AM)
cron.schedule('15 5 * * *', () => {
  console.log('Running daily automation task...');
  automatePosting();
});
