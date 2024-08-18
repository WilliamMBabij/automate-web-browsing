/**
 * Website Surfing Automation
 *
 * This program uses Puppeteer, a Node.js library for automating web browsers,
 * to surf websites from a text file using the web browser specified by the user.
 * It opens new tabs until the maximum number of open tabs is reached, then closes
 * tabs starting from the left while opening new tabs on the right.
 *
 * Instructions:
 * 1. Make sure you have Node.js installed.
 * 2. Run 'npm install puppeteer' to install Puppeteer.
 * 3. Modify the browser paths in browserDefaultPaths if needed.
 * 4. Run the program by executing 'node index.js' in the terminal.
 */

// Import required libraries and helper functions
const puppeteer = require('puppeteer');
const { readWebsitesFromFile, addProtocolIfMissing, sleep } = require('./utils');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Default paths for major web browsers
const browserDefaultPaths = {
  chrome: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
};

// Function to manage open tabs, closing the oldest ones when the maximum number of open tabs is reached
async function manageTabs(pages, maxOpenTabs) {
  while (pages.length > maxOpenTabs) {
    const oldestPage = pages.shift();
    await oldestPage.close();
  }
}

// Function to start surfing websites
async function startSurfing(browserName, filePath, maxTabs, maxOpenTabs, waitTime) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: browserName,
    defaultViewport: {
      width: 1920, // Set the desired width
      height: 1080, // Set the desired height
    },
  });

  const pages = [];
  const websiteList = readWebsitesFromFile(filePath);
  const totalWebsites = websiteList.length;
  let currentIndex = 0;

  // Close the initial about:blank tab if it hasn't been used yet
  const [initialPage] = await browser.pages();
  await initialPage.close();

  try {
    while (currentIndex < totalWebsites || pages.length > 0) {
      await manageTabs(pages, maxOpenTabs);

      const tabsToOpen = Math.min(maxTabs, totalWebsites - currentIndex);

      const newPages = await Promise.all(
        websiteList.slice(currentIndex, currentIndex + tabsToOpen).map(async (website) => {
          const url = addProtocolIfMissing(website);
          if (!url) {
            console.warn(`URL "${website}" in the list is not valid. Skipping...`);
            return null;
          }

          const page = await browser.newPage();
          try {
            console.log(`Navigating to: ${url}`);
            await page.goto(url);

            // Wait for the specified duration in seconds before opening a new tab
            await sleep(waitTime * 1000);

            return page;
          } catch (error) {
            console.error(`Error while navigating to ${url}:`, error.message);
            await page.close();
            return null;
          }
        }),
      );

      pages.push(...newPages.filter((page) => page !== null));

      currentIndex += tabsToOpen;
      await sleep(waitTime * 1000);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close any remaining open pages
    for (const page of pages) {
      await page.close();
    }

    await browser.close();
  }
}

// Prompt user for input
async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  // Prompt user for preferred browser name
  const browserName = await promptUser('Enter the name of your preferred browser (chrome/edge): ');
  const defaultBrowserPath = browserDefaultPaths[browserName.toLowerCase()];

  if (!defaultBrowserPath) {
    console.error('Invalid browser name provided.');
    return;
  }

  // Prompt user for file path
  let filePath = await promptUser('Enter the path to the text file with the list of websites: ');

  // If the provided file path is just a file name, assume it's in the same directory as index.js
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(__dirname, filePath);
  }

  // Validate the file path exists before proceeding
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    console.error('Error: File does not exist or is not readable.');
    return;
  }

  // Prompt user for maxTabs value with validation
  let maxTabs;
  do {
    maxTabs = parseInt(await promptUser('Enter the maximum number of tabs to open at once (between 1 and 60): '), 10);
    if (isNaN(maxTabs) || maxTabs < 1 || maxTabs > 60) {
      console.error('Error: Invalid input. Please provide a valid number between 1 and 60.');
    }
  } while (isNaN(maxTabs) || maxTabs < 1 || maxTabs > 60);

  // Prompt user for maxOpenTabs value with validation
  let maxOpenTabs;
  do {
    maxOpenTabs = parseInt(
      await promptUser(
        'Enter the maximum number of tabs to be opened in total (greater than or equal to ' +
          maxTabs +
          ', between 1 and 60): ',
      ),
      10,
    );
    if (isNaN(maxOpenTabs) || maxOpenTabs < maxTabs || maxOpenTabs > 60) {
      console.error('Error: Invalid input. Please provide a valid number between ' + maxTabs + ' and 60.');
    }
  } while (isNaN(maxOpenTabs) || maxOpenTabs < maxTabs || maxOpenTabs > 60);

  // Prompt user for waitTime value with validation
  let waitTime;
  do {
    waitTime = parseInt(
      await promptUser('Enter the time to wait in seconds before accessing a new website (between 1 and 60): '),
      10,
    );
    if (isNaN(waitTime) || waitTime < 1 || waitTime > 60) {
      console.error('Error: Invalid input. Please provide a valid number between 1 and 60.');
    }
  } while (isNaN(waitTime) || waitTime < 1 || waitTime > 60);

  // Start surfing websites
  await startSurfing(defaultBrowserPath, filePath, maxTabs, maxOpenTabs, waitTime);
}

// Call the main function
main();
