import { TestCase, TestStep } from './parser.js';
import { getVariable, performAction } from '../steps/steps.js';

export class TestExecutor {
    variables: { [key: string]: any } = {};

    async executeTestCase(testCase: TestCase) {
        console.log(`\nТест: ${ testCase.name }`);
        try {
            await this.executeSteps(testCase.steps);
        } catch (error) {
            console.error(`Ошибка в тесте "${ testCase.name }":`, error);
        }
    }

    async executeSteps(steps: TestStep[]) {
        for (const step of steps) {
            await this.executeStep(step);
        }
    }

    async executeStep(step: TestStep) {
        switch (step.type) {
            case 'action':
                await this.executeAction(step);
                break;
            case 'if':
                await this.executeIf(step);
                break;
            case 'else':
                // Блок "Иначе" уже обработан в executeIf
                break;
            case 'loop':
                await this.executeLoop(step);
                break;
            case 'endif':
            case 'endloop':
                // Эти шаги обрабатываются в parseFeature
                break;
            default:
                throw new Error(`Неизвестный тип шага: ${ step.type }`);
        }
    }

    async executeAction(step: TestStep) {
        // Заменяем переменные в параметрах
        const parameters = step.parameters?.map(param => this.replaceVariables(param)) || [];
        const action = this.replaceVariables(step.action || '');

        try {
            await performAction(action, parameters);
            console.log(`✅ ${ step.action }`);
        } catch (error) {
            console.error(`❌ ${ step.action }`);
            throw error;
        }
    }

    async executeIf(step: TestStep) {
        const condition = this.replaceVariables(step.action || '');
        const conditionResult = await this.evaluateCondition(condition);

        if (conditionResult) {
            // Выполняем шаги внутри условия
            if (step.steps) {
                await this.executeSteps(step.steps);
            }
        } else {
            // Ищем блок "Иначе" и выполняем его шаги
            const elseStep = step.steps?.find(s => s.type === 'else');
            if (elseStep && elseStep.steps) {
                await this.executeSteps(elseStep.steps);
            }
        }
    }

    async executeLoop(step: TestStep) {
        const loopExpression = this.replaceVariables(step.action || '');
        const items = await this.getLoopItems(loopExpression);

        for (const item of items) {
            // Устанавливаем текущую переменную цикла
            const [ varName ] = loopExpression.split(' в ');
            const variableName = varName.trim();

            this.variables[variableName] = item;

            if (step.steps) {
                await this.executeSteps(step.steps);
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
        // Простая реализация: проверяем, содержит ли строка определенное слово
        // Например: "заголовок страницы содержит "Example""
        if (condition.startsWith('заголовок страницы содержит ')) {
            const expectedText = condition.substring(26).replace(/"/g, '');
            const actualTitle = await getVariable('pageTitle');
            return actualTitle.includes(expectedText);
        }
        // Добавьте другие виды условий по мере необходимости
        throw new Error(`Неизвестное условие: ${ condition }`);
    }

    async getLoopItems(loopExpression: string): Promise<any[]> {
        // Пример: "URL в ["https://example.com", "https://google.com"]"
        const match = loopExpression.match(/(.*?) в \[(.*)]/);
        if (match) {
            return match[2].split(',').map(item => item.trim().replace(/"/g, ''));
        }
        throw new Error(`Неверное выражение цикла: ${ loopExpression }`);
    }
}
