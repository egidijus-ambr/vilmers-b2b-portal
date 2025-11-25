#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Locize configuration from environment variables
const LOCIZE_CONFIG = {
  projectId: process.env.LOCIZE_PROJECT_ID,
  apiKey: process.env.LOCIZE_API_KEY,
  version: 'latest'
};

// Validate required environment variables
if (!LOCIZE_CONFIG.projectId || !LOCIZE_CONFIG.apiKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please ensure LOCIZE_PROJECT_ID and LOCIZE_API_KEY are set in your .env file');
  process.exit(1);
}

// Language and namespace configuration
const LANGUAGES = {
  en: 'en',
  fr: 'fr', 
  de: 'de',
  // lt: 'lt',
  da: 'da-DK' // Danish maps to da-DK in Locize
};

const NAMESPACES = ['common', 'account'];
const OUTPUT_DIR = path.join(__dirname, '../src/lib/i18n/locales');

/**
 * Fetch translation data from Locize API
 */
async function fetchTranslation(language, namespace) {
  const url = `https://api.locize.app/${LOCIZE_CONFIG.projectId}/${LOCIZE_CONFIG.version}/${language}/${namespace}`;
  
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200) {
          try {
            const translations = JSON.parse(data);
            resolve(translations);
          } catch (error) {
            reject(new Error(`Failed to parse JSON for ${language}/${namespace}: ${error.message}`));
          }
        } else {
          reject(new Error(`Failed to fetch ${language}/${namespace}: HTTP ${response.statusCode}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Request failed for ${language}/${namespace}: ${error.message}`));
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error(`Timeout fetching ${language}/${namespace}`));
    });
  });
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save translation file
 */
async function saveTranslation(language, namespace, translations) {
  const languageDir = path.join(OUTPUT_DIR, language);
  await ensureDir(languageDir);
  
  const filePath = path.join(languageDir, `${namespace}.json`);
  const jsonContent = JSON.stringify(translations, null, 2);
  
  await fs.writeFile(filePath, jsonContent, 'utf8');
  console.log(`✅ Saved: ${language}/${namespace}.json`);
}

/**
 * Download all translations
 */
async function downloadTranslations() {
  console.log('🚀 Starting translation download from Locize...\n');
  
  try {
    // Ensure output directory exists
    await ensureDir(OUTPUT_DIR);
    
    const downloadPromises = [];
    
    // Create download tasks for all language/namespace combinations
    for (const [uiLang, locizeLang] of Object.entries(LANGUAGES)) {
      for (const namespace of NAMESPACES) {
        downloadPromises.push(
          fetchTranslation(locizeLang, namespace)
            .then(translations => saveTranslation(uiLang, namespace, translations))
            .catch(error => {
              console.error(`❌ Failed to download ${uiLang}/${namespace}: ${error.message}`);
              throw error;
            })
        );
      }
    }
    
    // Wait for all downloads to complete
    await Promise.all(downloadPromises);
    
    console.log('\n🎉 All translations downloaded successfully!');
    console.log(`📁 Translations saved to: ${OUTPUT_DIR}`);
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`   Languages: ${Object.keys(LANGUAGES).length} (${Object.keys(LANGUAGES).join(', ')})`);
    console.log(`   Namespaces: ${NAMESPACES.length} (${NAMESPACES.join(', ')})`);
    console.log(`   Total files: ${Object.keys(LANGUAGES).length * NAMESPACES.length}`);
    
  } catch (error) {
    console.error('\n💥 Download failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  downloadTranslations().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { downloadTranslations };
