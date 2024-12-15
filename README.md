# Quran and Hadith Auto Poster

Automated application for posting Quran pages and Hadith to Facebook groups.

## Features

- Sequential posting of Quran pages
- Random Hadith selection
- Automated Facebook group posting
- Configurable posting schedule

## Prerequisites

- Node.js >= 18.0.0
- A Facebook account
- Quran images in the `quran-images` directory

## Environment Variables

The following environment variables need to be set in Railway:

```env
FB_EMAIL=your-facebook-email
FB_PASSWORD=your-facebook-password
CRON_SCHEDULE=* * * * *  # Cron schedule for posting
CURRENT_PAGE=1  # Starting Quran page number
```

## Deployment to Railway

1. Fork/Clone this repository
2. Create a new project in Railway
3. Connect your GitHub repository
4. Add the required environment variables in Railway dashboard
5. Deploy!

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the required variables
4. Run the application:
   ```bash
   npm run dev
   ```

## Directory Structure

- `index.js` - Main application file
- `quran-images/` - Directory containing Quran page images
- `Dockerfile` - Container configuration
- `.env` - Environment variables (local development only)
