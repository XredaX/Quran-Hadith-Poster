# Quran and Hadith Auto Poster

An automated application for posting Quran pages and Hadith content to Facebook groups. This bot helps spread Islamic knowledge by systematically sharing Quran pages and authentic Hadith across multiple Facebook groups. Once configured, it will automatically post to all your specified groups based on your schedule (hourly, daily, or any custom interval you set using cron expressions).

## How It Works

This application leverages the [Fewfeed Chrome Extension](https://fewfeed.com/) to automate the posting process. Here's how it works:

1. The app uses Puppeteer to control a Chrome browser instance with the Fewfeed extension installed
2. It automatically logs into your Facebook account (using either credentials or cookies)
3. For each posting cycle:
   - Selects a random Quran page from the `quran-images` directory.
   - Fetches a random Hadith from the Hadith API
   - Uses Fewfeed's functionality to post this content to your configured Facebook groups
4. The entire process runs automatically based on your configured schedule (CRON_SCHEDULE)
5. In development mode (HEADLESS=false), you can watch the automation process in action

## Features

- 🕌 Random Quran pages with proper formatting
- 📚 Random Hadith selection from verified sources
- 👥 Automated posting to multiple Facebook groups
- ⏰ Configurable posting schedule using cron expressions
- 🔄 Automatic session management and login handling
- 🛡️ Error handling and retry mechanisms

## Prerequisites

- Node.js >= 18.0.0
- A valid Facebook account

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
FB_EMAIL=your-facebook-email
FB_PASSWORD=your-facebook-password
CRON_SCHEDULE=* * * * *  # Cron schedule for posting (e.g., "0 * * * *" for hourly, "0 0 * * *" for daily)
NODE_ENV=production      # or development
FACEBOOK_COOKIES=[]      # Array of Facebook session cookies (required for production, leave empty for development)
HEADLESS=true           # Set to false if you want to see the browser automation process (must be true in production)
```

## Installation

1. Clone the repository:
   ```bash
   git https://github.com/XredaX/Quran-Hadith-Poster.git
   cd Quran-Hadith-Poster
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables in `.env` file

4. Run the application:
   ```bash
   node index.js
   ```

## Directory Structure

```
.
├── index.js           # Main application file
├── fewfeed/          # extension directory, used to post to groups
├── quran-images/     # Directory containing Quran page images
├── cookies.json      # Facebook session cookies (first time login by email & password, then save to this file)
├── .env              # Environment variables
└── Dockerfile        # Dockerfile for building the application, so you can easy deploy it to Railway or any other platform
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

Feel free to reach out if you have any questions or suggestions:

- LinkedIn: [Reda El Bettioui](https://www.linkedin.com/in/reda-el-bettioui/)
- Email: redaelbettioui@gmail.com

## References

### Quran Pages
The Quran pages images used in this project are sourced from:
- [Quran Pages Images Repository](https://github.com/zeyadetman/quran-pages-images) by zeyadetman

### Hadith Sources
The Hadith content is carefully selected from authentic sources using the [Hadith API](https://api.hadith.gading.dev/)

### Chrome Extension
The automation is powered by [Fewfeed](https://fewfeed.com/) - a powerful Chrome extension for automated Facebook group posting