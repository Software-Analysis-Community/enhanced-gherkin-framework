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

const actionMappings: { pattern: string; identifier: string }[] = [
    { pattern: 'Открыть страницу', identifier: 'openPage' },
    { pattern: 'Open page', identifier: 'openPage' },

    { pattern: 'Ввести имя пользователя', identifier: 'enterUsername' },
    { pattern: 'Enter username', identifier: 'enterUsername' },

    { pattern: 'Ввести пароль', identifier: 'enterPassword' },
    { pattern: 'Enter password', identifier: 'enterPassword' },

    { pattern: 'Нажать на кнопку входа', identifier: 'clickLoginButton' },
    { pattern: 'Click login button', identifier: 'clickLoginButton' },

    { pattern: 'Должен увидеть заголовок', identifier: 'shouldSeeTitle' },
    { pattern: 'Should see title', identifier: 'shouldSeeTitle' },

    { pattern: 'Добавить товар', identifier: 'addProductToCart' },
    { pattern: 'Add product', identifier: 'addProductToCart' },

    { pattern: 'Открыть корзину', identifier: 'openCart' },
    { pattern: 'Open cart', identifier: 'openCart' },

    { pattern: 'Должен увидеть товар в корзине', identifier: 'shouldSeeProductInCart' },
    { pattern: 'Should see product in cart', identifier: 'shouldSeeProductInCart' },

    { pattern: 'Должен увидеть товар в заказе', identifier: 'shouldSeeProductInOrder' },
    { pattern: 'Should see product in order', identifier: 'shouldSeeProductInOrder' },

    { pattern: 'Перейти к оформлению заказа', identifier: 'proceedToCheckout' },
    { pattern: 'Proceed to checkout', identifier: 'proceedToCheckout' },

    { pattern: 'Ввести имя', identifier: 'enterFirstName' },
    { pattern: 'Enter first name', identifier: 'enterFirstName' },

    { pattern: 'Ввести фамилию', identifier: 'enterLastName' },
    { pattern: 'Enter last name', identifier: 'enterLastName' },

    { pattern: 'Ввести почтовый индекс', identifier: 'enterPostalCode' },
    { pattern: 'Enter postal code', identifier: 'enterPostalCode' },

    { pattern: 'Продолжить оформление', identifier: 'continueCheckout' },
    { pattern: 'Continue checkout', identifier: 'continueCheckout' },

    { pattern: 'Должен увидеть в итогах заказа', identifier: 'shouldSeeInOrderTotals' },
    { pattern: 'Should see in order totals', identifier: 'shouldSeeInOrderTotals' },

    { pattern: 'Завершить заказ', identifier: 'finishOrder' },
    { pattern: 'Finish order', identifier: 'finishOrder' },

    { pattern: 'Должен увидеть сообщение о завершении', identifier: 'shouldSeeOrderCompletionMessage' },
    { pattern: 'Should see order completion message', identifier: 'shouldSeeOrderCompletionMessage' },

    { pattern: 'Открыть меню', identifier: 'openMenu' },
    { pattern: 'Open menu', identifier: 'openMenu' },

    { pattern: 'Выйти из системы', identifier: 'logout' },
    { pattern: 'Logout', identifier: 'logout' },

    { pattern: 'Запомнить цену товара', identifier: 'rememberProductPrice' },
    { pattern: 'Remember product price', identifier: 'rememberProductPrice' },

    { pattern: 'Должен увидеть количество товаров', identifier: 'shouldSeeNumberOfItems' },
    { pattern: 'Should see number of items', identifier: 'shouldSeeNumberOfItems' },
];

function getActionIdentifier(action: string): string | null {
    for (const mapping of actionMappings) {
        if (action.startsWith(mapping.pattern)) {
            return mapping.identifier;
        }
    }
    return null;
}

export async function performAction(action: string, parameters: string[]) {
    await ensureBrowser();

    try {
        const actionIdentifier = getActionIdentifier(action);

        if (!actionIdentifier) {
            throw new Error(`Неизвестное действие: ${action}`);
        }

        switch (actionIdentifier) {
            case 'openPage': {
                const url = parameters[0];
                await loginPage.open(url);
                break;
            }

            case 'enterUsername': {
                const username = parameters[0];
                setVariable('username', username);
                break;
            }

            case 'enterPassword': {
                const password = parameters[0];
                const username = getVariable('username');
                if (!username) {
                    throw new Error('Имя пользователя не было введено до ввода пароля.');
                }
                await loginPage.login(username, password);
                break;
            }

            case 'clickLoginButton': {
                await loginPage.clickLoginButton();
                break;
            }

            case 'shouldSeeTitle': {
                const expectedTitle = parameters[0];
                await inventoryPage.checkTitle(expectedTitle);
                break;
            }

            case 'addProductToCart': {
                const productName = parameters[0];
                const productKey = productNameToKey(productName);
                await inventoryPage.addToCart(productKey);
                break;
            }

            case 'openCart': {
                await inventoryPage.openCart();
                break;
            }

            case 'shouldSeeProductInCart': {
                const itemName = parameters[0];
                await cartPage.checkItemInCart(itemName);
                break;
            }

            case 'shouldSeeProductInOrder': {
                const itemName = parameters[0];
                await checkoutPage.checkItem(itemName);
                break;
            }

            case 'proceedToCheckout': {
                await cartPage.checkout();
                break;
            }

            case 'enterFirstName': {
                const firstName = parameters[0];
                setVariable('firstName', firstName);
                break;
            }

            case 'enterLastName': {
                const lastName = parameters[0];
                setVariable('lastName', lastName);
                break;
            }

            case 'enterPostalCode': {
                const postalCode = parameters[0];
                setVariable('postalCode', postalCode);
                break;
            }

            case 'continueCheckout': {
                const fname = getVariable('firstName');
                const lname = getVariable('lastName');
                const pcode = getVariable('postalCode');
                if (!fname || !lname || !pcode) {
                    throw new Error('Не все данные покупателя были введены до продолжения оформления.');
                }
                await checkoutPage.fillInformation(fname, lname, pcode);
                break;
            }

            case 'shouldSeeInOrderTotals': {
                const expectedText = parameters[0];
                await checkoutPage.checkPriceInTotals(expectedText);
                break;
            }

            case 'finishOrder': {
                await checkoutPage.finishOrder();
                break;
            }

            case 'shouldSeeOrderCompletionMessage': {
                const message = parameters[0];
                await checkoutPage.checkOrderFinished(message);
                break;
            }

            case 'openMenu': {
                await menuPage.openMenu();
                break;
            }

            case 'logout': {
                await menuPage.logout();
                break;
            }

            case 'rememberProductPrice': {
                const productName = parameters[0];
                const variableName = parameters[1];

                const price = await inventoryPage.getProductPrice(productName);

                setVariable(variableName, price);
                break;
            }

            case 'shouldSeeNumberOfItems': {
                const expectedCount = parseInt(parameters[0], 10);
                await cartPage.checkItemsCount(expectedCount);
                break;
            }

            default:
                throw new Error(`Неизвестное действие: ${action}`);
        }
    } catch (error: any) {
        console.error(`❌ Ошибка при выполнении действия "${action}": ${error.message}`);
        const timestamp = getFormattedTimestamp();

        if (config.screenshots.enabled && page) {
            const screenshotPath = path.resolve(process.cwd(), config.screenshots.path, `error-step-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath });
            console.error(`📸 Скриншот сохранен по пути: ${screenshotPath}`);
        }

        if (config.videos.enabled && config.videos.recordOn === 'failed' && page) {
            const video = await page.video();
            if (video) {
                const videoPath = path.resolve(process.cwd(), config.videos.path, `error-test-${timestamp}.webm`);
                await video.saveAs(videoPath);
                console.error(`🎥 Видео сохранено по пути: ${videoPath}`);
            }
        }

        throw error;
    }
}

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
