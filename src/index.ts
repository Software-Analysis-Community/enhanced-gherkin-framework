import { EnhancedGherkinParser } from './framework/parser.js';
import { TestExecutor } from './framework/executor.js';
import * as path from 'path';
import { closeBrowser } from './steps/steps.js';
import { fileURLToPath } from 'node:url';
import config from './utils/config.js';
import * as fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const parser = new EnhancedGherkinParser();
    const executor = new TestExecutor();

    const featureFiles = [
        'complex.enhanced.feature'
    ];

    for (const featureFile of featureFiles) {
        const featurePath = path.resolve(__dirname, '../features/', featureFile);
        const testCases = parser.parseFeature(featurePath);

        for (const testCase of testCases) {
            await executor.executeTestCase(testCase);
            await closeBrowser();
        }
    }
}

function ensureDirectories() {
    if (config.logging.enabled) {
        const logPath = path.resolve(process.cwd(), config.logging.outputPath);
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    if (config.screenshots.enabled) {
        const screenshotsDir = path.resolve(process.cwd(), config.screenshots.path);
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }
    }

    if (config.videos.enabled) {
        const videosDir = path.resolve(process.cwd(), config.videos.path);
        if (!fs.existsSync(videosDir)) {
            fs.mkdirSync(videosDir, { recursive: true });
        }
    }
}

ensureDirectories();

main();
