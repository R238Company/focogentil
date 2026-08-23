import json
import os
import uuid
import datetime
import boto3

s3 = boto3.client("s3")
BUCKET = os.environ["ANSWERS_BUCKET"]


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return _response(400, {"erro": "JSON invalido"})

    aluno = str(body.get("aluno", "Aluna"))[:100]
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

    registro = {
        "aluno": aluno,
        "prova": prova,
        "data": body.get("data") or datetime.datetime.utcnow().isoformat(),
        "respostas": limpo,
    }

    key = "respostas/{}/{}.json".format(
        datetime.datetime.utcnow().strftime("%Y-%m-%d"), uuid.uuid4()
    )

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
