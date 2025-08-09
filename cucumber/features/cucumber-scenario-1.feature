Feature: User authorization
  Scenario: Standard user logs in
    Given I open the web application at "https://www.saucedemo.com"
    And I see the login page with "username" and "password" fields
    When I enter "standard_user" into the "username" field
    And I enter "secret_sauce" into the "password" field
    And I press the "login-button" on the form
    Then I should be navigated to a new page
    And that page should display the title "Products"
