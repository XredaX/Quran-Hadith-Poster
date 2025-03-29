// conda run -n quran-poster node index.js

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import cron from 'node-cron';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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

    // Fix sameSite property to ensure it's always a valid string
    if (Array.isArray(cookies) && cookies.length > 0) {
      cookies = cookies.map(cookie => {
        // If sameSite is null or undefined, set it to "none"
        if (cookie.sameSite === null || cookie.sameSite === undefined) {
          cookie.sameSite = "none";
        }
        return cookie;
      });
      
      // Validate and set cookies
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
    
    // Ensure sameSite property is valid before saving
    const validatedCookies = cookies.map(cookie => {
      // If sameSite is null or undefined, set it to "none"
      if (cookie.sameSite === null || cookie.sameSite === undefined) {
        cookie.sameSite = "none";
      }
      return cookie;
    });
    
    if (process.env.NODE_ENV === 'production') {
      // Update runtime cookies
      runtimeCookies = validatedCookies;
      console.log('Cookies updated in runtime memory');
    } else {
      // Development mode - save to file
      const cookiesPath = path.resolve('cookies.json');
      fs.writeFileSync(cookiesPath, JSON.stringify(validatedCookies, null, 2));
      console.log('Cookies saved to file');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving cookies:', error);
    return false;
  }
};

// Function to get random page number
const getNextNumber = () => {
  const maxPage = 604; // Total number of Quran pages
  return Math.floor(Math.random() * maxPage) + 1;
};

// Function to get random hadith number
const getRandomHadithNumber = () => {
  const maxHadith = 7008; // Total number of hadiths in Sahih Bukhari
  return Math.floor(Math.random() * maxHadith) + 1;
};

// Function to get a random hadith
const getSequentialHadith = async () => {
  const hadithNumber = getRandomHadithNumber();
  const url = `https://api.hadith.gading.dev/books/bukhari/${hadithNumber}`;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.contents) {
        return data.data.contents.arab;
      }
      
      console.error('Invalid hadith data structure:', data);
      return 'اَللَّهُمَّ صَلِّ وَسَلِّمْ وَباَرِكْ عَلىَ سَيِّدِناَ وَمَوْلاَناَ مُحَمَّدٍ';
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === MAX_RETRIES) {
        return 'اَللَّهُمَّ صَلِّ وَسَلِّمْ وَباَرِكْ عَلىَ سَيِّدِناَ وَمَوْلاَناَ مُحَمَّدٍ';
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

// Function to get next Quran page
const getQuranImage = async () => {
  const pageNumber = getNextNumber();
  const quranImagesDir = path.resolve('quran-images');
  const imagePath = path.join(quranImagesDir, `${pageNumber}.jpg`);
  
  try {
    // Check if image exists
    await fs.promises.access(imagePath);
    return {
      success: true,
      path: imagePath,
      pageNumber
    };
  } catch (error) {
    console.error(`Error accessing Quran image: ${error.message}`);
    return {
      success: false,
      error: `Could not find Quran page ${pageNumber}`
    };
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
    const hadithText = await getSequentialHadith();
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
    
    // Set delay value to 10 - specifically targeting the Delay input
    try {
      // Wait for delay inputs to be visible and interactive
      await delay(2000);
      
      // Target the second input[type="number"] which is the Delay input
      // Or try to find it by looking for the label that contains "Delay"
      await page.evaluate(() => {
        // Find by label text approach
        const delayLabels = Array.from(document.querySelectorAll('label, div'))
          .filter(el => el.textContent.includes('Delay'));
        
        if (delayLabels.length > 0) {
          console.log('Found delay label');
          // Find the closest input to this label
          const delayLabel = delayLabels[0];
          const delayInput = delayLabel.nextElementSibling?.querySelector('input[type="number"]') || 
                             delayLabel.parentElement?.querySelector('input[type="number"]');
          
          if (delayInput) {
            console.log('Found delay input next to label');
            delayInput.value = "10";
            delayInput.dispatchEvent(new Event('input', { bubbles: true }));
            delayInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        
        // Fallback to getting all number inputs and using the second one
        const allInputs = document.querySelectorAll('input[type="number"]');
        if (allInputs.length >= 2) {
          console.log('Using second number input as delay');
          const delayInput = allInputs[1]; // The second input is the Delay
          delayInput.value = "10";
          delayInput.dispatchEvent(new Event('input', { bubbles: true }));
          delayInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      // Verify which values were set
      const inputValues = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="number"]');
        return Array.from(inputs).map((input, index) => {
          // Try to get the label for this input
          const labels = Array.from(document.querySelectorAll('label, div'))
            .filter(el => el.textContent.includes('Thread') || el.textContent.includes('Delay'));
          
          return {
            index,
            value: input.value,
            nearestText: input.parentElement?.textContent || 'unknown'
          };
        });
      });
      console.log(`Input values after setting: ${JSON.stringify(inputValues)}`);
      
      // Direct approach using page actions
      // First identify all inputs then click on the second one
      const inputElements = await page.$$('input[type="number"]');
      if (inputElements.length >= 2) {
        // Click on the second input (Delay)
        await inputElements[1].click({ clickCount: 3 }); // Triple click to select all text
        await delay(500);
        await page.keyboard.type('30'); // Type the value
        console.log('Directly typed 20 into the second number input (Delay)');
      }
    } catch (error) {
      console.error('Error setting delay value:', error);
    }

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
    console.log('Waiting 180 minutes for posts to be shared...');
    await delay(180 * 60 * 1000); // 180 minutes
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

// Function to test login
const testLogin = async () => {
  console.log('Testing Facebook login...');
  try {
    if (!browser) {
      await launchBrowser();
    }

    // Load cookies first
    const cookiesLoaded = await loadCookies(page);
    if (!cookiesLoaded) {
      console.log('No valid cookies found, attempting fresh login...');
    }

    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle0' });
    
    // Check if we need to login
    const needsLogin = await page.evaluate(() => {
      return !document.cookie.includes('c_user');
    });

    if (needsLogin) {
      console.log('Not logged in, attempting login...');
      // Fill in email
      await page.type('#email', process.env.FB_EMAIL);
      // Fill in password
      await page.type('#pass', process.env.FB_PASSWORD);
      // Click login button
      await page.click('button[name="login"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Check if login was successful
      const loginSuccessful = await page.evaluate(() => {
        return document.cookie.includes('c_user');
      });

      if (loginSuccessful) {
        console.log('Login successful!');
        await saveCookies(page);
        return true;
      } else {
        console.error('Login failed. Please check your credentials.');
        return false;
      }
    } else {
      console.log('Already logged in!');
      return true;
    }
  } catch (error) {
    console.error('Error during login test:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      console.log('Browser closed after login test');
    }
  }
};

// Schedule to run at 2:00 PM and 6:00 PM every day (or as configured in .env)
const schedule = process.env.CRON_SCHEDULE || '0 14,18 * * *';

console.log('Application started. Running with the following configuration:');
console.log(`- Cron Schedule: ${schedule}`);
console.log(`- Images Directory: ${path.resolve('quran-images')}`);

// Test login first, then set up cron job
testLogin().then(loginSuccessful => {
  if (loginSuccessful) {
    console.log('Login test passed. Setting up scheduled tasks...');
    // Schedule to run at specified times
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
    console.log('Scheduled tasks set up successfully.');
  } else {
    console.error('Login test failed. Please check your credentials and try again.');
    process.exit(1);
  }
}).catch(error => {
  console.error('Fatal error during login test:', error);
  process.exit(1);
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

// Reduced delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
