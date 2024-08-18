// utils.js
const fs = require('fs');

function readWebsitesFromFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const websiteList = fileContent
    .trim()
    .split('\n')
    .map((website) => website.trim());
  return websiteList;
}

function addProtocolIfMissing(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  return url;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  readWebsitesFromFile,
  addProtocolIfMissing,
  sleep,
};
