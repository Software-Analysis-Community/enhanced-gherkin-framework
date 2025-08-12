export class LoginPage extends BasePage {
    async login(username: string, password: string) {
        await this.type('#user-name', username);
        await this.type('#password', password);
    }

    async clickLoginButton() {
        await this.page.waitForSelector('#login-button', { state: 'visible' });
        await this.page.click('#login-button');
    }
}
