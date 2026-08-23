import json
import os
import uuid
import datetime
import boto3

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET = os.environ["ANSWERS_BUCKET"]
TABLE_NAME = os.environ["ANSWERS_TABLE"]
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )
    aluno_id = claims.get("sub")
    aluno_nome = claims.get("cognito:username") or claims.get("username") or "Aluna"

    if not aluno_id:
        # O API Gateway ja rejeita requisicoes sem token valido antes de chegar
        # aqui; isso e so uma rede de seguranca extra.
        return _response(401, {"erro": "nao autenticado"})

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return _response(400, {"erro": "JSON invalido"})

    prova = str(body.get("prova", "Simulado"))[:200]
    respostas = body.get("respostas")

    if not isinstance(respostas, list) or not respostas:
        return _response(400, {"erro": "respostas ausentes"})

    limpo = []
    for item in respostas:
        if not isinstance(item, dict):
            continue
        pergunta = str(item.get("pergunta", ""))[:2000]
        resposta = str(item.get("resposta", ""))[:20000]
        limpo.append({"pergunta": pergunta, "resposta": resposta})

    agora = datetime.datetime.utcnow()
    tentativa_id = "{}#{}".format(agora.isoformat(), uuid.uuid4())

    registro = {
        "aluno": aluno_nome,
        "prova": prova,
        "data": body.get("data") or agora.isoformat(),
        "respostas": limpo,
    }

    # Grava no DynamoDB (fonte de verdade, separada por aluno via alunoId).
    table.put_item(
        Item={
            "alunoId": aluno_id,
            "tentativaId": tentativa_id,
            **registro,
        }
    )

    # Mantem tambem no S3 (redundancia/historico da versao anterior).
    key = "respostas/{}/{}.json".format(agora.strftime("%Y-%m-%d"), uuid.uuid4())
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(registro, ensure_ascii=False, indent=2).encode("utf-8"),
        ContentType="application/json",
    )

    return _response(200, {"ok": True})


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }
