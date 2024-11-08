import { Browser, chromium, Page } from 'playwright';
import { expect } from 'chai';

let browser: Browser | null = null;
let page: Page | null = null;
let variables: { [key: string]: any } = {};

export async function performAction(action: string, parameters: string[]) {
    switch (action) {
        case 'Открыть страницу {}':
            await openPage(parameters[0]);
            break;
        case 'Ввести текст {} в поле с селектором {}':
            await enterText(parameters[0], parameters[1]);
            break;
        case 'Нажать на элемент с селектором {}':
            await clickElement(parameters[0]);
            break;
        case 'Проверить, что текст элемента с селектором {} равен {}':
            await checkElementTextEquals(parameters[0], parameters[1]);
            break;
        case 'Проверить, что текст элемента с селектором {} содержит {}':
            await checkElementTextContains(parameters[0], parameters[1]);
            break;
        default:
            throw new Error(`Неизвестное действие: ${ action }`);
    }
}

async function openPage(url: string) {
    const isCI = process.env.CI === 'true';
    if (!browser) {
        browser = await chromium.launch({
            headless: isCI, // В CI используем headless режим
            slowMo: isCI ? 0 : 50,         // В CI не замедляем действия
        });
        const context = await browser.newContext();
        page = await context.newPage();
    }
    await page!.goto(url);
}

async function enterText(text: string, selector: string) {
    await page!.fill(selector, text);
}

async function clickElement(selector: string) {
    await page!.click(selector);
}

async function checkElementTextEquals(selector: string, expectedText: string) {
    const actualText = await page!.textContent(selector);
    expect(actualText?.trim()).to.equal(expectedText);
}

async function checkElementTextContains(selector: string, expectedText: string) {
    const actualText = await page!.textContent(selector);
    expect(actualText).to.include(expectedText);
}

export async function closeBrowser() {
    if (page) {
        await page.close();
        page = null;
    }
    if (browser) {
        await browser.close();
        browser = null;
    }
}

export function setVariable(name: string, value: any) {
    variables[name] = value;
}

export function getVariable(name: string): any {
    return variables[name];
}
