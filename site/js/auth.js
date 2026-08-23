// Wrapper simples da API publica do Cognito (InitiateAuth), sem SDK/bundler.
// Guarda o token da sessao no sessionStorage (some quando a aba fecha).
(function (window) {
  "use strict";

  var SESSION_KEY = "focogentil_session";

  function cfg() {
    var c = window.FOCOGENTIL_CONFIG || {};
    return {
      region: c.COGNITO_REGION,
      clientId: c.COGNITO_USER_POOL_CLIENT_ID
    };
  }

  function isConfigured() {
    var c = cfg();
    return !!(c.region && c.clientId && c.clientId.indexOf("__") === -1);
  }

  function saveSession(username, authResult) {
    var expiresAt = Date.now() + (authResult.ExpiresIn || 3600) * 1000;
    var session = {
      username: username,
      idToken: authResult.IdToken,
      accessToken: authResult.AccessToken,
      refreshToken: authResult.RefreshToken,
      expiresAt: expiresAt
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var session = JSON.parse(raw);
      if (!session.idToken || Date.now() >= session.expiresAt) return null;
      return session;
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function getToken() {
    var s = getSession();
    return s ? s.idToken : null;
  }

  function getUsername() {
    var s = getSession();
    return s ? s.username : null;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function login(username, password) {
    var c = cfg();
    if (!isConfigured()) {
      return Promise.reject(new Error("Login ainda não configurado neste ambiente."));
    }

    var endpoint = "https://cognito-idp." + c.region + ".amazonaws.com/";

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: c.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(_friendlyError(data));
          }
          return data;
        });
      })
      .then(function (data) {
        if (!data.AuthenticationResult) {
          throw new Error("Não foi possível entrar. Tente novamente.");
        }
        return saveSession(username, data.AuthenticationResult);
      });
  }

  function _friendlyError(data) {
    var type = data.__type || "";
    if (type.indexOf("NotAuthorizedException") !== -1) {
      return "Usuário ou senha incorretos.";
    }
    if (type.indexOf("UserNotFoundException") !== -1) {
      return "Usuário ou senha incorretos.";
    }
    if (type.indexOf("UserNotConfirmedException") !== -1) {
      return "Essa conta ainda não foi confirmada.";
    }
    return data.message || "Não foi possível entrar. Tente novamente.";
  }

  window.FocoGentilAuth = {
    isConfigured: isConfigured,
    isLoggedIn: isLoggedIn,
    getToken: getToken,
    getUsername: getUsername,
    login: login,
    logout: logout
  };
})(window);
