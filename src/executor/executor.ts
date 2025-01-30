import { TestCase, TestStep } from '../parser/parser';
import { performAction } from '../steps/steps';
import config from '../utils/config';
import path from 'path';
import * as fs from 'node:fs';
import { getFormattedTimestamp } from '../utils/timestamp';

interface StepResult {
    stepNumber: number;
    action: string;
    parameters: string[];
    status: 'passed' | 'failed';
    error?: string;
    screenshotPath?: string;
    videoPath?: string;
}

interface TestResult {
    testName: string;
    steps: StepResult[];
    status: 'passed' | 'failed';
    durationMs: number;
}

export class TestExecutor {
    private scenarioStartTime!: number;
    private scenarioEndTime!: number;
    private stepsTiming: { [stepIndex: number]: { start: number, end: number } } = {};
    variables: { [key: string]: any } = {};
    private testResults: TestResult[] = [];

    async executeTestCase(testCase: TestCase) {
        console.log(`\nТест: ${ testCase.name }`);
        this.scenarioStartTime = Date.now();
        const testResult: TestResult = {
            testName: testCase.name,
            steps: [],
            status: 'passed',
            durationMs: 0
        };

        try {
            await this.executeSteps(testCase.steps, testResult);
            this.scenarioEndTime = Date.now();
            testResult.durationMs = this.scenarioEndTime - this.scenarioStartTime;
            console.log(`✅ Тест "${ testCase.name }" успешно пройден.`);
        } catch (error) {
            this.scenarioEndTime = Date.now();
            testResult.status = 'failed';
            testResult.durationMs = this.scenarioEndTime - this.scenarioStartTime;
            console.error(`❌ Тест "${ testCase.name }" провален:`, error);
        }

        this.testResults.push(testResult);

        if (config.logging.enabled) {
            this.saveLogs();
        }

        this.reportTiming();
    }

    async executeSteps(steps: TestStep[], testResult: TestResult) {
        for (const step of steps) {
            const index = steps.indexOf(step);
            await this.executeStep(step, index, testResult);
        }
    }

    async executeStep(step: TestStep, index: number, testResult: TestResult) {
        switch (step.type) {
            case 'action':
                await this.executeAction(step, index, testResult);
                break;
            case 'if':
                await this.executeIf(step, testResult);
                break;
            case 'else':
                break;
            case 'loop':
                await this.executeLoop(step, testResult);
                break;
            case 'endif':
            case 'endloop':
                break;
            default:
                throw new Error(`Неизвестный тип шага: ${ step.type }`);
        }
    }

    async executeAction(step: TestStep, index: number, testResult: TestResult) {
        const parameters = step.parameters?.map(param => this.replaceVariables(param)) || [];
        const action = this.replaceVariables(step.action || '');
        this.stepsTiming[index] = { start: Date.now(), end: 0 };

        const stepResult: StepResult = {
            stepNumber: index + 1,
            action,
            parameters,
            status: 'passed'
        };

        try {
            await performAction(action, parameters);
            this.stepsTiming[index].end = Date.now();

            const parametersString = this.formatParameters(parameters);
            console.log(`✅ Шаг ${ index + 1 }: ${ action }${ parametersString }`);

            testResult.steps.push(stepResult);
        } catch (error: any) {
            this.stepsTiming[index].end = Date.now();

            const parametersString = this.formatParameters(parameters);
            console.error(`❌ Шаг ${ index + 1 } провален: ${ action }${ parametersString }`);

            stepResult.status = 'failed';
            stepResult.error = error.message;
            testResult.steps.push(stepResult);

            testResult.status = 'failed';

            throw error;
        }
    }


    /**
     * Форматирует параметры для логирования.
     * Убирает пустые строки и строки, содержащие только '{}'.
     * Если есть параметры, возвращает строку в формате [param1, param2].
     * Иначе возвращает пустую строку.
     * @param parameters Массив параметров
     * @returns Отформатированная строка параметров
     */
    private formatParameters(parameters: string[]): string {
        const filteredParameters = parameters.filter(param => param && param !== '{}');
        return filteredParameters.length > 0 ? ` [${ filteredParameters.join(', ') }]` : '';
    }

    async executeIf(step: TestStep, testResult: TestResult) {
        const condition = this.replaceVariables(step.action || '');
        const conditionResult = await this.evaluateCondition(condition);

        if (conditionResult) {
            if (step.steps) {
                await this.executeSteps(step.steps, testResult);
            }
        } else {
            const elseStep = step.steps?.find(s => s.type === 'else');
            if (elseStep && elseStep.steps) {
                await this.executeSteps(elseStep.steps, testResult);
            }
        }
    }

    async executeLoop(step: TestStep, testResult: TestResult) {
        const loopExpression = this.replaceVariables(step.action || '');
        const items = await this.getLoopItems(loopExpression);

        for (const item of items) {
            const [ varName ] = loopExpression.split(' в ');
            const variableName = varName.trim();
            this.variables[variableName] = item;

            if (step.steps) {
                const updatedSteps = step.steps.map(innerStep => ({
                    ...innerStep,
                    parameters: [ item ]
                }));

                await this.executeSteps(updatedSteps, testResult);
            }
        }
    }

    replaceVariables(text: string): string {
        return text.replace(/\{(.*?)}/g, (match, p1) => {
            const value = this.variables[p1.trim()];
            return value !== undefined ? value : match;
        });
    }

    async evaluateCondition(condition: string): Promise<boolean> {
        if (condition.startsWith('заголовок страницы содержит ')) {
            const expectedText = condition.substring(28).replace(/"/g, '');
            const actualTitle = await this.variables['pageTitle'];
            return (actualTitle || '').includes(expectedText);
        } else if (condition.startsWith('page title contains ')) {
            const expectedText = condition.substring(20).replace(/"/g, '');
            const actualTitle = await this.variables['pageTitle'];
            return (actualTitle || '').includes(expectedText);
        }
        return true;
    }

    async getLoopItems(loopExpression: string): Promise<any[]> {
        const matchRu = loopExpression.match(/(.*?) в \[(.*)]/);
        if (matchRu) {
            return matchRu[2].split(',').map(item => item.trim().replace(/"/g, ''));
        } else {
            const matchEn = loopExpression.match(/(.*?) in \[(.*)]/);
            if (matchEn) {
                return matchEn[2].split(',').map(item => item.trim().replace(/"/g, ''));
            }
        }
        throw new Error(`Неверное выражение цикла: ${ loopExpression }`);
    }

    /**
     * Сохраняет логи тестов в файл.
     */
    private saveLogs() {
        const timestamp = getFormattedTimestamp();
        const logFilename = `logs-${ timestamp }.json`;
        const logPath = path.resolve(config.logging.outputPath, logFilename);
        const logDir = path.dirname(logPath);

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        fs.writeFileSync(logPath, JSON.stringify(this.testResults, null, 2), 'utf-8');
        console.log(`📝 Логи тестов сохранены по пути: ${ logPath }`);
    }

    /**
     * Отчет о времени выполнения теста.
     */
    reportTiming() {
        const scenarioDuration = this.scenarioEndTime - this.scenarioStartTime;
        console.log(`⏱ Время выполнения сценария: ${ scenarioDuration } мс`);
        // noinspection NonAsciiCharacters
        console.table(Object.entries(this.stepsTiming).map(([ name, times ]) => ({
            Шаг: name,
            'Время начала (мс)': times.start,
            'Время окончания (мс)': times.end,
            'Длительность (мс)': times.end - times.start,
        })));
    }
}
