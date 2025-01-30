Test: Bulk Adding Products to Cart
Open page "https://www.saucedemo.com"
Enter username "standard_user"
Enter password "secret_sauce"
Click login button
For each product in ["Sauce Labs Backpack", "Sauce Labs Bike Light", "Sauce Labs Bolt T-Shirt", "Sauce Labs Fleece Jacket", "Sauce Labs Onesie"]
Add product to cart {product}
Endloop
Open cart
Should see number of items 5
