import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Use Stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const extensionPath = path.resolve('./fewfeed');

// Launch the browser once and keep it open
let browser;

const launchBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
  }
  return browser;
};

// Define your automation function
const automatePosting = async () => {
  const page = await (await launchBrowser()).newPage();

  try {
    // Step 1: Go to Facebook and log in
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });

    // Wait for the login fields to load
    await page.waitForSelector('#email');
    await page.type('#email', 'redaelbettioui2968@gmail.com');
    await page.type('#pass', '{REDA2001}');

    // Click the login button and wait for navigation
    await page.click('[name="login"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Logged in to Facebook');

    // Step 2: Navigate to the target URL
    const targetUrl = 'https://v2.fewfeed.com/tool/auto-post-fb-group';
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    console.log(`Navigated to ${targetUrl}`);

    // Step 3: Enter text into the textarea
    const textAreaSelector = 'textarea[placeholder="Write something..."]';
    await page.waitForSelector(textAreaSelector, { timeout: 10000 });
    await page.click(textAreaSelector);
    await page.type(textAreaSelector, 'Your text goes here');
    console.log('Text entered into the textarea');

    // Step 4: Click on the SVG element to add photos
    const svgSelector = 'svg.w-6.h-6.text-green-400.cursor-pointer';
    await page.waitForSelector(svgSelector, { timeout: 10000 });
    await page.click(svgSelector);
    console.log('SVG element clicked to open upload dialog');

    // Step 5: Directly upload a photo
    const uploadInputSelector = 'input[type="file"]';
    await page.waitForSelector(uploadInputSelector, { timeout: 10000 });

    // Define the path to your image
    const filePath = path.resolve('1.webp');

    // Use the input element to set the files
    const inputUploadHandle = await page.$(uploadInputSelector);
    await inputUploadHandle.uploadFile(filePath);
    console.log('File uploaded directly');

    // Step 6: Wait for at least 3 checkboxes to appear
    const checkboxSelector = 'input[type="checkbox"].w-4.h-4.text-blue-600';
    
    // Function to check the count of checkboxes
    const waitForCheckboxCount = async (count) => {
      await page.waitForFunction(
        (selector, count) => {
          return document.querySelectorAll(selector).length >= count;
        },
        {},
        checkboxSelector,
        count
      );
    };

    await waitForCheckboxCount(3);
    console.log('At least 3 checkboxes are present');

    // Now click on one of the checkboxes (if they are present)
    const checkboxes = await page.$$(checkboxSelector);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('Checkbox clicked');
    }

    // Step 7: Click the Post button
    const postButtonSelector = 'button.w-full.py-2.bg-blue-500.text-white.hover\\:bg-blue-600.transition-all.delay-75.font-bold.rounded-md.shadow-sm';
    await page.waitForSelector(postButtonSelector, { timeout: 10000 });
    await page.click(postButtonSelector);
    console.log('Post button clicked');

  } catch (error) {
    console.error('Error during automation:', error);
  }
};

// Schedule the automation to run daily at a specific time
cron.schedule('56 17 * * *', () => {
  console.log('Running daily automation task...');
  automatePosting();
});

// Launch the browser initially when the script starts
launchBrowser().then(() => {
  console.log('Browser launched and ready to run daily automation.');
});
