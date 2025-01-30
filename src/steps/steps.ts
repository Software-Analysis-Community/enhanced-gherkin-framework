import { Browser, BrowserContext, BrowserContextOptions, chromium, Page } from 'playwright';
import { CartPage, CheckoutPage, InventoryPage, LoginPage, MenuPage } from '../pom/pages';
import config from '../utils/config';
import path from 'path';
import { getFormattedTimestamp } from '../utils/timestamp';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

let loginPage: LoginPage;
let inventoryPage: InventoryPage;
let cartPage: CartPage;
let checkoutPage: CheckoutPage;
let menuPage: MenuPage;

const variables: { [key: string]: any } = {};

async function ensureBrowser() {
    const isCI = process.env.CI === 'true';
    if (!browser) {
        browser = await chromium.launch({
            headless: true,
            slowMo: isCI ? 0 : 50,
        });

        const contextOptions: BrowserContextOptions = {};

        if (config.videos.enabled) {
            contextOptions.recordVideo = {
                dir: path.resolve(process.cwd(), config.videos.path),
                size: { width: 1280, height: 720 }
            };
        }

        context = await browser.newContext(contextOptions);
        page = await context.newPage();

        await context.tracing.start({ screenshots: true, snapshots: true });

        loginPage = new LoginPage(page!);
        inventoryPage = new InventoryPage(page!);
        cartPage = new CartPage(page!);
        checkoutPage = new CheckoutPage(page!);
        menuPage = new MenuPage(page!);
    }
}

export async function performAction(action: string, parameters: string[]) {
    await ensureBrowser();

    try {
        if (action.startsWith('Открыть страницу')) {
            const url = parameters[0];
            await loginPage.open(url);
            return;
        }

        if (action.startsWith('Ввести имя пользователя')) {
            const username = parameters[0];
            setVariable('username', username);
            return;
        }

        if (action.startsWith('Ввести пароль')) {
            const password = parameters[0];
            const username = getVariable('username');
            if (!username) {
                throw new Error('Имя пользователя не было введено до ввода пароля.');
            }
            await loginPage.login(username, password);
            return;
        }

        if (action.startsWith('Нажать на кнопку входа')) {
            await loginPage.clickLoginButton();
            return;
        }

        if (action.startsWith('Должен увидеть заголовок')) {
            const expectedTitle = parameters[0];
            await inventoryPage.checkTitle(expectedTitle);
            return;
        }

        if (action.startsWith('Добавить товар') && action.includes('в корзину')) {
            const productName = parameters[0];
            const productKey = productNameToKey(productName);
            await inventoryPage.addToCart(productKey);
            return;
        }

        if (action.startsWith('Открыть корзину')) {
            await inventoryPage.openCart();
            return;
        }

        if (action.startsWith('Должен увидеть товар') && action.includes('в корзине')) {
            const itemName = parameters[0];
            await cartPage.checkItemInCart(itemName);
            return;
        }

        if (action.startsWith('Перейти к оформлению заказа')) {
            await cartPage.checkout();
            return;
        }

        if (action.startsWith('Ввести имя')) {
            const firstName = parameters[0];
            setVariable('firstName', firstName);
            return;
        }

        if (action.startsWith('Ввести фамилию')) {
            const lastName = parameters[0];
            setVariable('lastName', lastName);
            return;
        }

        if (action.startsWith('Ввести почтовый индекс')) {
            const postalCode = parameters[0];
            setVariable('postalCode', postalCode);
            return;
        }

        if (action.startsWith('Продолжить оформление')) {
            const fname = getVariable('firstName');
            const lname = getVariable('lastName');
            const pcode = getVariable('postalCode');
            if (!fname || !lname || !pcode) {
                throw new Error('Не все данные покупателя были введены до продолжения оформления.');
            }
            await checkoutPage.fillInformation(fname, lname, pcode);
            return;
        }

        if (action.startsWith('Должен увидеть товар') && action.includes('в заказе')) {
            const itemName = parameters[0];
            await checkoutPage.checkItem(itemName);
            return;
        }

        if (action.startsWith('Должен увидеть') && action.includes('в итогах заказа')) {
            const expectedText = parameters[0];
            await checkoutPage.checkPriceInTotals(expectedText);
            return;
        }

        if (action.startsWith('Завершить заказ')) {
            await checkoutPage.finishOrder();
            return;
        }

        if (action.startsWith('Должен увидеть сообщение о завершении')) {
            const message = parameters[0];
            await checkoutPage.checkOrderFinished(message);
            return;
        }

        if (action.startsWith('Открыть меню')) {
            await menuPage.openMenu();
            return;
        }

        if (action.startsWith('Выйти из системы')) {
            await menuPage.logout();
            return;
        }

        if (action.startsWith('Запомнить цену товара')) {
            const productName = parameters[0];
            const variableName = parameters[1];

            const price = await inventoryPage.getProductPrice(productName);

            setVariable(variableName, price);
            return;
        }

        if (action.startsWith('Должен увидеть количество товаров')) {
            const expectedCount = parseInt(parameters[0]);
            await cartPage.checkItemsCount(expectedCount);
            return;
        }

        throw new Error(`Неизвестное действие: ${ action }`);
    } catch (error: any) {
        console.error(`❌ Ошибка при выполнении действия "${ action }": ${ error.message }`);
        const timestamp = getFormattedTimestamp();

        if (config.screenshots.enabled && page) {
            const screenshotPath = path.resolve(process.cwd(), config.screenshots.path, `error-step-${ timestamp }.png`);
            await page.screenshot({ path: screenshotPath });
            console.error(`📸 Скриншот сохранен по пути: ${ screenshotPath }`);
        }

        if (config.videos.enabled && config.videos.recordOn === 'failed' && page) {
            const video = await page.video();
            if (video) {
                const videoPath = path.resolve(process.cwd(), config.videos.path, `error-test-${ timestamp }.webm`);
                await video.saveAs(videoPath);
                console.error(`🎥 Видео сохранено по пути: ${ videoPath }`);
            }
        }

        throw error;
    }
}

function productNameToKey(productName: string): string {
    return productName.toLowerCase().replace(/ /g, '-');
}

export async function closeBrowser() {
    if (page) {
        await page.close();
        page = null;
    }
    if (browser) {
        if (context) {
            await context.tracing.stop({ path: path.resolve(process.cwd(), 'trace.zip') });
        }
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
