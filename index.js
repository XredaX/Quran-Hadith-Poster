import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import cron from 'node-cron';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';  // Import fetch to make API requests

dotenv.config();  // Load environment variables
puppeteer.use(StealthPlugin());

const extensionPath = path.resolve('./fewfeed');
const cookiesPath = path.resolve('cookies.json');

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

let browser;
let page;

// Global variable to store cookies in memory during runtime
let runtimeCookies = null;

const launchBrowser = async () => {
  try {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: process.env.HEADLESS === 'true',  // Changed to true for production
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
      });
      page = await browser.newPage();
      // Set a faster navigation timeout
      page.setDefaultNavigationTimeout(30000);
      // Optimize page performance
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }
    return page;
  } catch (error) {
    console.error('Error launching browser:', error);
    throw error;
  }
};

// Function to load cookies based on environment
const loadCookies = async (page) => {
  try {
    let cookies;
    
    if (process.env.NODE_ENV === 'production') {
      if (runtimeCookies) {
        console.log('Using cookies from runtime memory');
        cookies = runtimeCookies;
      } else {
        console.log('Loading initial cookies from environment variable');
        try {
          cookies = JSON.parse(process.env.FACEBOOK_COOKIES);
          if (!Array.isArray(cookies)) {
            throw new Error('Invalid cookie format in environment variable');
          }
          // Store cookies in runtime memory
          runtimeCookies = cookies;
        } catch (parseError) {
          console.error('Error parsing cookies from environment:', parseError);
          return false;
        }
      }
    } else {
      // Development mode - use file
      console.log('Loading cookies from file in development mode');
      const cookiesPath = path.resolve('cookies.json');
      if (!fs.existsSync(cookiesPath)) {
        console.log('No cookies file found');
        return false;
      }
      try {
        cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      } catch (fileError) {
        console.error('Error reading cookies from file:', fileError);
        return false;
      }
    }

    // Validate and set cookies
    if (Array.isArray(cookies) && cookies.length > 0) {
      await page.setCookie(...cookies);
      console.log('Cookies loaded successfully');
      return true;
    } else {
      console.log('No valid cookies found');
      return false;
    }
  } catch (error) {
    console.error('Error in loadCookies:', error);
    return false;
  }
};

// Function to save cookies
const saveCookies = async (page) => {
  try {
    const cookies = await page.cookies();
    
    if (process.env.NODE_ENV === 'production') {
      // Update runtime cookies
      runtimeCookies = cookies;
      console.log('Cookies updated in runtime memory');
    } else {
      // Development mode - save to file
      const cookiesPath = path.resolve('cookies.json');
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('Cookies saved to file');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving cookies:', error);
    return false;
  }
};

// Function to get a random hadith
const getRandomHadith = async () => {
  const randomNumber = Math.floor(Math.random() * 1899) + 1;
  const url = `https://api.hadith.gading.dev/books/muslim/${randomNumber}`;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 200 && data.data?.contents?.arab) {
        return data.data.contents.arab;
      }
      console.warn(`No hadith found for ID ${randomNumber}, attempt ${attempt}`);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    } catch (error) {
      console.error(`Error fetching hadith (attempt ${attempt}):`, error);
      if (attempt === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  return 'Your text goes here';
};

// Function to get next Quran page
const getNextQuranPage = () => {
  try {
    // Get current page from environment variable
    let currentPage = parseInt(process.env.CURRENT_PAGE || '1');
    
    // Validate page number
    if (isNaN(currentPage) || currentPage < 1) {
      console.warn('Invalid CURRENT_PAGE value, resetting to 1');
      currentPage = 1;
    }
    
    // Calculate next page
    const nextPage = currentPage >= 604 ? 1 : currentPage + 1;
    
    // Update environment variable for next run
    process.env.CURRENT_PAGE = nextPage.toString();
    
    // In local development, try to update .env file
    if (process.env.NODE_ENV !== 'production') {
      try {
        const envPath = path.resolve('.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          envContent = envContent.replace(
            /CURRENT_PAGE=\d+/,
            `CURRENT_PAGE=${nextPage}`
          );
          fs.writeFileSync(envPath, envContent);
        }
      } catch (err) {
        console.warn('Could not update .env file:', err.message);
      }
    }
    
    return currentPage;
  } catch (error) {
    console.error('Error in getNextQuranPage:', error);
    return 1; // Return 1 as fallback
  }
};

// Function to get Quran image from local directory
const getQuranImage = async () => {
  const pageNumber = getNextQuranPage();
  const quranImagesDir = path.resolve('quran-images');
  const imagePath = path.join(quranImagesDir, `${pageNumber}.jpg`);
  
  try {
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      console.error(`Quran page ${pageNumber} not found at path: ${imagePath}`);
      console.error('Directory contents:', fs.readdirSync(quranImagesDir));
      throw new Error(`Quran page ${pageNumber} not found in local directory`);
    }
    
    console.log(`Using Quran page ${pageNumber} from local directory: ${imagePath}`);
    return { success: true, path: imagePath, pageNumber };
  } catch (error) {
    console.error('Error accessing Quran page:', error);
    return { success: false };
  }
};

const automatePosting = async () => {
  try {
    const page = await launchBrowser();
    
    // Load cookies
    const cookiesLoaded = await loadCookies(page);
    
    // Get Quran image from local directory
    const quranImage = await getQuranImage();
    
    // Faster navigation with reduced timeout
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (await page.$('#email') !== null) {
      console.log('Logging in as cookies are not valid or expired');
      await Promise.all([
        page.type('#email', process.env.FB_EMAIL, { delay: 0 }),
        page.type('#pass', process.env.FB_PASSWORD, { delay: 0 })
      ]);
      await Promise.all([
        page.click('[name="login"]'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
      ]);
      // Save new cookies after login
      await saveCookies(page);
    } else {
      console.log('Using existing session');
    }

    // Save cookies after successful navigation
    await saveCookies(page);

    // Reduced delay
    await delay(1000);

    // Navigate to target URL with reduced timeout
    const targetUrl = 'https://v2.fewfeed.com/tool/auto-post-fb-group';
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`Navigated to ${targetUrl}`);

    // Get hadith text
    const hadithText = await getRandomHadith();
    await page.waitForSelector('textarea[placeholder="Write something..."]', { timeout: 30000 });
    
    if (!quranImage.success) {
      console.error('Failed to access Quran image, stopping the process');
      throw new Error('Quran image access failed');
    }
    
    // Type text faster with no delay
    const postText = `${hadithText}\n\nQuran Page ${quranImage.pageNumber}`;
    await page.type('textarea[placeholder="Write something..."]', postText, { delay: 0 });
    console.log('Text entered into the textarea');

    // Optimized image upload
    const svgSelector = 'svg.w-6.h-6.text-green-400.cursor-pointer';
    await page.waitForSelector(svgSelector, { timeout: 30000 });
    await page.click(svgSelector);
    console.log('Clicked upload button');
    
    const uploadInputSelector = 'input[type="file"]';
    await page.waitForSelector(uploadInputSelector, { timeout: 30000 });
    const inputUploadHandle = await page.$(uploadInputSelector);
    
    // Upload the local Quran image
    console.log(`Uploading Quran page ${quranImage.pageNumber} from local directory`);
    await inputUploadHandle.uploadFile(quranImage.path);
    console.log('Quran page image uploaded successfully');

    // Wait for upload to complete
    await delay(5000);

    // Optimized checkbox selection
    const checkboxInTableHeaderSelector = 'th.px-5.py-3.bg-white.text-left.font-semibold.text-gray-100.uppercase.tracking-wider.flex.space-x-1.items-center.h-full input[type="checkbox"].w-4.h-4.text-blue-600';
    await page.waitForSelector(checkboxInTableHeaderSelector, { timeout: 30000 });
    await page.click(checkboxInTableHeaderSelector);

    // Click post button
    const postButtonSelector = 'button.w-full.py-2.bg-blue-500.text-white.hover\\:bg-blue-600.transition-all.delay-75.font-bold.rounded-md.shadow-sm';
    await page.waitForSelector(postButtonSelector, { timeout: 30000 });
    await page.click(postButtonSelector);
    console.log('Post button clicked');

    // Reduced wait time after posting (adjust as needed)
    console.log('Waiting 15 minutes for posts to be shared...');
    await delay(20 * 60 * 1000); // 5 minutes
    console.log('Wait completed');

  } catch (error) {
    console.error('Error in automation process:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      console.log('Browser closed after completion');
    }
  }
};

// Schedule to run at 2:00 PM every day (or as configured in .env)
const schedule = process.env.CRON_SCHEDULE || '0 14 * * *';
cron.schedule(schedule, () => {
  console.log(`Starting automation task at ${new Date().toLocaleString()}...`);
  automatePosting().catch(error => {
    console.error('Failed to complete automation task:', error);
    // If browser is still open after error, close it
    if (browser) {
      browser.close().catch(console.error);
      browser = null;
      page = null;
    }
  });
});

// Handle process termination
const cleanup = async () => {
  if (browser) {
    try {
      await browser.close();
      console.log('Browser closed during cleanup');
    } catch (error) {
      console.error('Error closing browser during cleanup:', error);
    }
  }
  process.exit();
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

console.log('Application started. Running with the following configuration:');
console.log(`- Cron Schedule: ${schedule}`);
console.log(`- Current Page: ${process.env.CURRENT_PAGE}`);
console.log(`- Images Directory: ${path.resolve('quran-images')}`);

// Reduced delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
