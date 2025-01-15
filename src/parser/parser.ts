import * as fs from 'fs';

export type StepType = 'action' | 'if' | 'else' | 'endif' | 'loop' | 'endloop';

export interface TestStep {
    type: StepType;
    action?: string;
    parameters?: string[];
    steps?: TestStep[]; // Для вложенных шагов
}

export interface TestCase {
    name: string;
    steps: TestStep[];
}

export class EnhancedGherkinParser {
    parseFeature(filePath: string): TestCase[] {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').map(line => line.trim());
        const testCases: TestCase[] = [];

        let currentTest: TestCase | null = null;
        let currentStepsStack: TestStep[][] = [];
        let currentSteps: TestStep[] = [];

        for (const line of lines) {
            if (line.startsWith('#') || line === '') {
                continue;
            }

            if (line.startsWith('Тест:')) {
                if (currentTest) {
                    testCases.push(currentTest);
                }
                currentTest = { name: line.substring(5).trim(), steps: [] };
                currentSteps = currentTest.steps;
                currentStepsStack = [ currentSteps ];
            } else if (currentTest && line.length > 0) {
                const step = this.parseStep(line);

                if (step.type === 'if' || step.type === 'loop') {
                    step.steps = [];
                    currentSteps.push(step);
                    currentStepsStack.push(step.steps);
                    currentSteps = step.steps;
                } else if (step.type === 'else') {
                    currentStepsStack.pop();
                    currentSteps = currentStepsStack[currentStepsStack.length - 1];
                    step.steps = [];
                    currentSteps.push(step);
                    currentStepsStack.push(step.steps);
                    currentSteps = step.steps;
                } else if (step.type === 'endif' || step.type === 'endloop') {
                    currentStepsStack.pop();
                    currentSteps = currentStepsStack[currentStepsStack.length - 1];
                } else {
                    currentSteps.push(step);
                }
            }
        }

        if (currentTest) {
            testCases.push(currentTest);
        }

        return testCases;
    }

    parseStep(line: string): TestStep {
        const actionLine = line.trim();

        if (actionLine.startsWith('Если ')) {
            const condition = actionLine.substring(4).trim();
            return { type: 'if', action: condition, parameters: [] };
        } else if (actionLine.startsWith('Иначе')) {
            return { type: 'else' };
        } else if (actionLine.startsWith('КонецЕсли')) {
            return { type: 'endif' };
        } else if (actionLine.startsWith('Для каждого ')) {
            const loopExpression = actionLine.substring(11).trim();
            return { type: 'loop', action: loopExpression, parameters: [] };
        } else if (actionLine.startsWith('КонецЦикла')) {
            return { type: 'endloop' };
        } else {
            // Это действие
            const { action, parameters } = this.extractActionAndParameters(actionLine);
            return { type: 'action', action, parameters };
        }
    }

    extractActionAndParameters(line: string): { action: string; parameters: string[] } {
        const regex = /"([^"]+)"|(\d+)/g;
        const parameters = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            if (match[1] !== undefined) {
               parameters.push(match[1]);
            } else if (match[2] !== undefined) {
                parameters.push(match[2]);
            }
        }

        const action = line.replace(regex, '{}').trim();

        return { action, parameters };
    }
}
