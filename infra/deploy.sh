#!/usr/bin/env bash
# Deploy do site "Foco Gentil" na AWS. Usado pelo GitHub Actions
# (.github/workflows/deploy.yml) e pode ser rodado manualmente em
# Mac/Linux (equivalente ao infra/deploy.ps1, para Windows).
#
# Variaveis de ambiente aceitas (com valor padrao):
#   STACK_NAME (focogentil)
#   AWS_REGION (us-east-1)
set -euo pipefail

STACK_NAME="${STACK_NAME:-focogentil}"
AWS_REGION="${AWS_REGION:-us-east-1}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_FILE="$ROOT_DIR/infra/template.yaml"
SITE_DIR="$ROOT_DIR/site"
CONFIG_FILE="$SITE_DIR/js/config.js"

echo "==> Fazendo deploy da stack '$STACK_NAME' em '$AWS_REGION'..."
aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_IAM

echo "==> Lendo saidas da stack..."
outputs_json=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs" \
  --output json)

get_output() {
  echo "$outputs_json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((o['OutputValue'] for o in d if o['OutputKey']=='$1'), ''))"
}

SITE_BUCKET=$(get_output SiteBucketName)
ANSWERS_BUCKET=$(get_output AnswersBucketName)
ANSWERS_TABLE=$(get_output AnswersTableName)
CF_DOMAIN=$(get_output CloudFrontDomain)
CF_DIST_ID=$(get_output CloudFrontDistributionId)
API_URL=$(get_output ApiUrl)
USER_POOL_ID=$(get_output UserPoolId)
USER_POOL_CLIENT_ID=$(get_output UserPoolClientId)

echo "   Site bucket:      $SITE_BUCKET"
echo "   Answers bucket:   $ANSWERS_BUCKET"
echo "   Answers table:    $ANSWERS_TABLE"
echo "   CloudFront:       $CF_DOMAIN"
echo "   API URL:          $API_URL"
echo "   User Pool:        $USER_POOL_ID"
echo "   User Pool Client: $USER_POOL_CLIENT_ID"

echo "==> Gravando a configuracao em site/js/config.js..."
cat > "$CONFIG_FILE" <<EOF
// Gerado automaticamente por infra/deploy.sh - nao edite a mao.
// Este arquivo NAO vai para o repositorio (veja .gitignore).
window.FOCOGENTIL_CONFIG = {
  API_URL: "$API_URL",
  COGNITO_REGION: "$AWS_REGION",
  COGNITO_USER_POOL_ID: "$USER_POOL_ID",
  COGNITO_USER_POOL_CLIENT_ID: "$USER_POOL_CLIENT_ID"
};
EOF

echo "==> Sincronizando site/ para s3://$SITE_BUCKET ..."
aws s3 sync "$SITE_DIR" "s3://$SITE_BUCKET" --delete --region "$AWS_REGION"

echo "==> Invalidando cache do CloudFront ($CF_DIST_ID)..."
aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" --region "$AWS_REGION" >/dev/null

echo ""
echo "Pronto! O site esta em: https://$CF_DOMAIN"
