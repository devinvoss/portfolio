describe('ng-portfolio', () => {
  beforeEach(() => {
    // Keep the smoke tests independent of the API, its database and ImageKit
    cy.intercept('POST', '**/api/movie/search', (req) => {
      req.reply({
        criteria: { ...req.body.criteria, totalCount: 2 },
        results: [
          { id: '1', title: 'Alien', year: 1979, rating: 5, genre: ['Sci-Fi'], imageUrl: 'https://ik.imagekit.io/test/alien.jpg' },
          { id: '2', title: 'Heat', year: 1995, rating: 4, genre: ['Thriller'], imageUrl: 'https://ik.imagekit.io/test/heat.jpg' },
        ],
      });
    }).as('search');
    cy.intercept('GET', 'https://ik.imagekit.io/**', { statusCode: 204 });
  });

  it('renders the home page and navigates to movies', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/home');
    cy.get('h1.name-header').should('contain', 'Devin Voss');

    cy.get('dvoss-nav').contains('a', 'Movies').click();
    cy.location('pathname').should('eq', '/movie');
    cy.wait('@search');
    cy.get('dvoss-movie-list-item').should('have.length', 2).first().should('contain', 'Alien');
    cy.get('mat-paginator').should('contain', '1 – 2 of 2');
  });

  it('shows the admin login form', () => {
    cy.visit('/login');
    cy.get('h1').should('contain', 'Admin Login');
    cy.get('input[formcontrolname=username]').should('exist');
    cy.get('input[formcontrolname=password]').should('exist');
  });
});
