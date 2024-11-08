import { EnhancedGherkinParser } from './framework/parser.js';
import { TestExecutor } from './framework/executor.js';
import * as path from 'path';
import { closeBrowser } from './steps/steps.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const parser = new EnhancedGherkinParser();
    const executor = new TestExecutor();

    const featureFiles = [
        // 'example.enhanced.feature',
        // 'advanced.enhanced.feature',
        'complex.enhanced.feature'
    ];

    for (const featureFile of featureFiles) {
        const featurePath = path.resolve(__dirname, '../features/', featureFile);
        const testCases = parser.parseFeature(featurePath);

        for (const testCase of testCases) {
            await executor.executeTestCase(testCase);
            await closeBrowser(); // Закрываем браузер после каждого теста
        }
    }
}

main();
