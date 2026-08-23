// Modelo de configuração. Copie este arquivo para "config.js" (ou rode
// infra/deploy.ps1, que gera "config.js" automaticamente com os valores reais
// da sua implantação). "config.js" nunca deve ir para o repositório público:
// ele contém a URL ativa de escrita da sua API e o Client ID do Cognito.
window.FOCOGENTIL_CONFIG = {
  API_URL: "__API_URL__",
  COGNITO_REGION: "__COGNITO_REGION__",
  COGNITO_USER_POOL_ID: "__COGNITO_USER_POOL_ID__",
  COGNITO_USER_POOL_CLIENT_ID: "__COGNITO_USER_POOL_CLIENT_ID__"
};
