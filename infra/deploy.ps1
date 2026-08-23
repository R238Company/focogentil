<#
  Deploy do site "Foco Gentil" na AWS.

  O que este script faz:
   1. Cria/atualiza a stack CloudFormation (S3 + CloudFront + Lambda + API).
   2. Le a URL da API criada e grava em site/js/config.js.
   3. Sincroniza a pasta site/ para o bucket S3 do site.
   4. Invalida o cache do CloudFront para a mudanca aparecer na hora.
   5. Imprime a URL final do site.

  Uso:
    powershell -File infra/deploy.ps1
    powershell -File infra/deploy.ps1 -StackName focogentil -Region us-east-1
#>

param(
  [string]$StackName = "focogentil",
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$templateFile = Join-Path $PSScriptRoot "template.yaml"
$siteDir = Join-Path $root "site"
$configFile = Join-Path $siteDir "js/config.js"

Write-Host "==> Fazendo deploy da stack '$StackName' em '$Region'..." -ForegroundColor Cyan
aws cloudformation deploy `
  --template-file $templateFile `
  --stack-name $StackName `
  --region $Region `
  --capabilities CAPABILITY_IAM

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao aplicar a stack CloudFormation."
}

Write-Host "==> Lendo saidas da stack..." -ForegroundColor Cyan
$outputsJson = aws cloudformation describe-stacks `
  --stack-name $StackName `
  --region $Region `
  --query "Stacks[0].Outputs" `
  --output json

$outputs = $outputsJson | ConvertFrom-Json
$outputMap = @{}
foreach ($o in $outputs) { $outputMap[$o.OutputKey] = $o.OutputValue }

$siteBucket = $outputMap["SiteBucketName"]
$answersBucket = $outputMap["AnswersBucketName"]
$cfDomain = $outputMap["CloudFrontDomain"]
$cfDistId = $outputMap["CloudFrontDistributionId"]
$apiUrl = $outputMap["ApiUrl"]

Write-Host "   Site bucket:      $siteBucket"
Write-Host "   Answers bucket:   $answersBucket"
Write-Host "   CloudFront:       $cfDomain"
Write-Host "   API URL:          $apiUrl"

Write-Host "==> Gravando a URL da API em site/js/config.js..." -ForegroundColor Cyan
$configContent = @"
// Gerado automaticamente por infra/deploy.ps1 - nao edite a mao.
// Este arquivo NAO vai para o repositorio (veja .gitignore).
window.FOCOGENTIL_CONFIG = {
  API_URL: "$apiUrl"
};
"@
Set-Content -Path $configFile -Value $configContent -Encoding utf8

Write-Host "==> Sincronizando site/ para s3://$siteBucket ..." -ForegroundColor Cyan
aws s3 sync $siteDir "s3://$siteBucket" --delete --region $Region

if ($LASTEXITCODE -ne 0) {
  throw "Falha ao sincronizar o site com o S3."
}

Write-Host "==> Invalidando cache do CloudFront ($cfDistId)..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $cfDistId --paths "/*" | Out-Null

Write-Host ""
Write-Host "Pronto! O site esta em: https://$cfDomain" -ForegroundColor Green
Write-Host "(o CloudFront pode levar alguns minutos para propagar na primeira vez)" -ForegroundColor Yellow
