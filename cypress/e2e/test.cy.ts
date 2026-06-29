describe('authentication entry', () => {
  it('shows tappable phone and Google sign-in actions', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('blinkcar_splash_seen', '1');

        Object.defineProperty(win.navigator, 'permissions', {
          configurable: true,
          value: {
            query: cy.stub().resolves({ state: 'granted' }),
          },
        });

        Object.defineProperty(win.navigator, 'geolocation', {
          configurable: true,
          value: {
            getCurrentPosition: cy.stub().callsFake((success) => {
              success({
                coords: {
                  latitude: 19.076,
                  longitude: 72.8777,
                  accuracy: 10,
                },
                timestamp: Date.now(),
              });
            }),
          },
        });
      },
    });

    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
    cy.contains(/mobile number/i, { timeout: 10000 }).should('be.visible');
    cy.contains('label', /mobile number/i).find('input').should('be.visible');
    cy.contains('+91').should('be.visible');
    cy.contains('button', /send code/i).should('be.enabled');
    cy.contains('button', /continue with google/i).should('be.enabled');
    cy.contains('button', /continue with apple/i).should('be.enabled');
  });
});
