from __future__ import annotations


def test_health_returns_200(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["version"]  # non-empty
    assert isinstance(body["uptime_seconds"], int)
    assert body["uptime_seconds"] >= 0
