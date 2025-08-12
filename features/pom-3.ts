export class CartPage extends BasePage {
    async checkItemInCart(itemName: string) {
        await this.checkTextEquals('.inventory_item_name', itemName);
    }

    async checkout() {
        await this.click('#checkout');
    }

    async checkItemsCount(expectedCount: number) {
        const items = await this.page.\$\$('.cart_item');
        expect(items.length).to.equal(expectedCount,
            'Ожидалось товаров: \${expectedCount}, а найдено: \${items.length}');
    }
}
