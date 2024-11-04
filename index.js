import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import cron from 'node-cron';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();  // Load environment variables
puppeteer.use(StealthPlugin());

const extensionPath = path.resolve('./fewfeed');
const cookiesPath = path.resolve('cookies.json');

let browser;
let page;

const launchBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    page = await browser.newPage();
  }
  return page;
};

// Function to save cookies
const saveCookies = async (page) => {
  const cookies = await page.cookies();
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to file');
};

// Function to load cookies
const loadCookies = async (page) => {
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath));
    await page.setCookie(...cookies);
    console.log('Cookies loaded from file');
  }
};

// Function to automate posting
const automatePosting = async () => {
  const page = await launchBrowser();

  try {
    await loadCookies(page);  // Load cookies if they exist
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });

    // Check if login is needed
    if (await page.$('#email') !== null) {
      console.log('Logging in as cookies are not valid or expired');

      // await page.type('#email', process.env.FB_EMAIL);
      // await page.type('#pass', process.env.FB_PASSWORD);

      await page.type('#email', 'redaelbettioui2968@gmail.com');
      await page.type('#pass', '{REDA2001}');

      await page.click('[name="login"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('Logged in to Facebook');

    } else {
      console.log('Logged in using saved cookies');
    }

    // Save cookies after logging in
    await saveCookies(page);

    // Proceed with automation
    const targetUrl = 'https://v2.fewfeed.com/tool/auto-post-fb-group';
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    console.log(`Navigated to ${targetUrl}`);

    // Step 3: Enter text into the textarea
    const textAreaSelector = 'textarea[placeholder="Write something..."]';
    await page.waitForSelector(textAreaSelector, { timeout: 60000 });
    await page.click(textAreaSelector);
    await page.type(textAreaSelector, 'Your text goes here');
    console.log('Text entered into the textarea');

    // Step 4: Click on the SVG element to add photos
    const svgSelector = 'svg.w-6.h-6.text-green-400.cursor-pointer';
    await page.waitForSelector(svgSelector, { timeout: 60000 });
    await page.click(svgSelector);
    console.log('SVG element clicked to open upload dialog');

    // Step 5: Directly upload a photo
    const uploadInputSelector = 'input[type="file"]';
    await page.waitForSelector(uploadInputSelector, { timeout: 60000 });
    const filePath = path.resolve('1.webp');
    const inputUploadHandle = await page.$(uploadInputSelector);
    await inputUploadHandle.uploadFile(filePath);
    console.log('File uploaded directly');

    // Step 6: Wait for at least 3 checkboxes to appear
    const checkboxSelector = 'input[type="checkbox"].w-4.h-4.text-blue-600';
    const waitForCheckboxCount = async (count) => {
      await page.waitForFunction(
        (selector, count) => document.querySelectorAll(selector).length >= count,
        {},
        checkboxSelector,
        count,
        { timeout: 60000 }
      );
    };
    await waitForCheckboxCount(2);
    console.log('At least 3 checkboxes are present');

    // Click on a checkbox
    const checkboxes = await page.$$(checkboxSelector);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('Checkbox clicked');
    }

    // Step 7: Click the Post button
    const postButtonSelector = 'button.w-full.py-2.bg-blue-500.text-white.hover\\:bg-blue-600.transition-all.delay-75.font-bold.rounded-md.shadow-sm';
    await page.waitForSelector(postButtonSelector, { timeout: 60000 });
    await page.click(postButtonSelector);
    console.log('Post button clicked');

  } catch (error) {
    console.error('Error during automation:', error);
  }
};

cron.schedule('* * * * *', () => {
  console.log('Running automation task every 2 minutes...');
  automatePosting();
});


// Launch the browser initially
launchBrowser().then(() => {
  console.log('Browser launched and ready to run daily automation.');
});
