describe('authentication entry', () => {
  it('shows tappable email and Google sign-in actions', () => {
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

    cy.contains('h1', 'Sign in').should('be.visible');
    cy.contains('label', /email/i).find('input').should('be.visible');
    cy.contains('label', /password/i).find('input').should('be.visible');
    cy.contains('button', /sign in with email/i).should('be.enabled');
    cy.contains('button', /continue with google/i).should('be.enabled');
  });
});
