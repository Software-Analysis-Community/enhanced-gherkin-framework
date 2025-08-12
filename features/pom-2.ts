export class InventoryPage extends BasePage {
    async checkOnProductsPage() {
        await this.checkTitle('Products');
    }

    async addToCart(productSelectorPart: string) {
        await this.click(`#add-to-cart-${ productSelectorPart }`);
    }

    async openCart() {
        await this.click('.shopping_cart_link');
    }

    async checkTitle(expectedTitle: string) {
        await this.checkTextEquals('.title', expectedTitle);
    }

    async getProductPrice(productName: string): Promise<string> {
        const priceSelector = '.inventory_item:has-text(\${productName}).inventory_item_price';
        return await this.getText(priceSelector);
    }
}
