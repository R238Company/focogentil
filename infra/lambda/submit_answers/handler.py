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

    route = event.get("routeKey", "")

    if route == "PUT /progresso":
        return _salvar_rascunho(event, aluno_id)
    if route == "GET /progresso":
        return _carregar_rascunho(event, aluno_id)
    return _submeter(event, aluno_id, aluno_nome)


def _materia_id(origem):
    return str(origem.get("materiaId") or "exam1")[:100]


def _limpar_respostas(respostas, com_id):
    limpo = []
    for item in respostas or []:
        if not isinstance(item, dict):
            continue
        entrada = {
            "pergunta": str(item.get("pergunta", ""))[:2000],
            "resposta": str(item.get("resposta", ""))[:20000],
        }
        if com_id:
            entrada["id"] = str(item.get("id", ""))[:100]
        limpo.append(entrada)
    return limpo


def _submeter(event, aluno_id, aluno_nome):
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return _response(400, {"erro": "JSON invalido"})

    prova = str(body.get("prova", "Simulado"))[:200]
    respostas = body.get("respostas")

    if not isinstance(respostas, list) or not respostas:
        return _response(400, {"erro": "respostas ausentes"})

    limpo = _limpar_respostas(respostas, com_id=False)

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

    # Enviou pra valer: o rascunho em andamento dessa materia nao serve mais.
    if body.get("materiaId"):
        table.delete_item(
            Key={
                "alunoId": aluno_id,
                "tentativaId": "RASCUNHO#" + _materia_id(body),
            }
        )

    return _response(200, {"ok": True})


def _salvar_rascunho(event, aluno_id):
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return _response(400, {"erro": "JSON invalido"})

    materia_id = _materia_id(body)
    respostas = _limpar_respostas(body.get("respostas"), com_id=True)
    current = body.get("current")
    current = current if isinstance(current, int) else 0
    agora = datetime.datetime.utcnow().isoformat()

    table.put_item(
        Item={
            "alunoId": aluno_id,
            "tentativaId": "RASCUNHO#" + materia_id,
            "materiaId": materia_id,
            "prova": str(body.get("prova", ""))[:200],
            "current": current,
            "respostas": respostas,
            "atualizadoEm": agora,
        }
    )

    return _response(200, {"ok": True, "atualizadoEm": agora})


def _carregar_rascunho(event, aluno_id):
    params = event.get("queryStringParameters") or {}
    materia_id = _materia_id(params)

    item = table.get_item(
        Key={
            "alunoId": aluno_id,
            "tentativaId": "RASCUNHO#" + materia_id,
        }
    ).get("Item")

    if not item:
        return _response(200, {"existe": False})

    return _response(200, {
        "existe": True,
        "current": int(item.get("current", 0)),
        "respostas": item.get("respostas", []),
        "atualizadoEm": item.get("atualizadoEm"),
    })


def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }
